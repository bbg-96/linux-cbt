// 터미널 워크스페이스 — mRemoteNG/MobaXterm식 세션 관리의 단일 진입점.
// "서버"는 문제(또는 자유 연습)가 제공하는 접속 대상이고, "세션"은 그 서버에
// 열린 셸 화면이다. 서버당 세션은 최대 2개 (ttyS0=기본, ttyS1=복제).
//
// 복제 세션(a1/b1)의 셸 준비(prologue+stty+cd)는 문제 컨텍스트당 1회만 한다.
// 같은 문제에서 닫았다 다시 열면 아무것도 보내지 않는다 — 학습자가 켜 둔
// tcpdump 같은 포그라운드 프로세스를 prologue의 Ctrl+C로 죽이지 않기 위함이다.
import { createStore, type Store } from "../lib/store";
import { serialChannels, type ChannelId } from "../vm/serialBus";
import { PS1_INIT } from "../vm/shellInit";
import { terminals } from "./terminalService";
import { vmService } from "../vm/vmService";
import { DEFAULT_WORKDIR, type Problem } from "../engine/types";

export type ServerId = "a" | "b";
export type SessionStatus = "open" | "connecting" | "error";

export interface ServerInfo {
  id: ServerId;
  /** 게스트 셸 프롬프트의 호스트네임과 일치시킨 표시 이름 */
  name: string;
  /** 표시용 주소 — vms:2 문제의 관례 IP(A=.10, B=.20), 없으면 로컬 콘솔 */
  ip?: string;
}

export interface WsSession {
  channel: ChannelId;
  server: ServerId;
  /** 세션 번호 — 1(기본, ttyS0) · 2(복제, ttyS1) */
  n: 1 | 2;
  status: SessionStatus;
}

export interface WorkspaceState {
  servers: ServerInfo[];
  sessions: WsSession[];
  /** 포커스된 세션 (모바일에서는 표시되는 유일한 팬) */
  active: ChannelId | null;
  /** configure마다 증가 — 진행 중이던 복제 준비를 무효화한다 */
  epoch: number;
}

const PRIMARY: Record<ServerId, ChannelId> = { a: "a0", b: "b0" };
const DUPLICATE: Record<ServerId, ChannelId> = { a: "a1", b: "b1" };
const PANE_ORDER: ChannelId[] = ["a0", "a1", "b0", "b1"];

export function serverOf(ch: ChannelId): ServerId {
  return ch[0] === "a" ? "a" : "b";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

class TermWorkspace {
  readonly store: Store<WorkspaceState> = createStore<WorkspaceState>({
    servers: [{ id: "a", name: "localhost" }],
    sessions: [{ channel: "a0", server: "a", n: 1, status: "open" }],
    active: "a0",
    epoch: 0,
  });
  private workdir = "/root";
  private ctxId = "free";
  /** 채널별 '이 컨텍스트에서 준비 완료' 키 (ctxId#VM세대) */
  private prepKey: Partial<Record<ChannelId, string>> = {};

  /** 문제 진입·VM 재시작 시 — 서버 목록과 기본 세션으로 리셋 */
  configureProblem(problem: Problem): void {
    const twoVms = (problem.vms ?? 1) === 2;
    const servers: ServerInfo[] = twoVms
      ? [
          { id: "a", name: "host-a", ip: "192.168.86.10" },
          { id: "b", name: "host-b", ip: "192.168.86.20" },
        ]
      : [{ id: "a", name: "localhost" }];
    const sessions: WsSession[] = [{ channel: "a0", server: "a", n: 1, status: "open" }];
    if (twoVms) sessions.push({ channel: "b0", server: "b", n: 1, status: "open" });
    this.reset(servers, sessions, problem.workdir ?? DEFAULT_WORKDIR, problem.id);
  }

  /** 자유 연습 터미널 페이지 */
  configureFree(): void {
    this.reset(
      [{ id: "a", name: "localhost" }],
      [{ channel: "a0", server: "a", n: 1, status: "open" }],
      "/root",
      "free",
    );
  }

  private reset(servers: ServerInfo[], sessions: WsSession[], workdir: string, ctxId: string): void {
    this.workdir = workdir;
    this.ctxId = ctxId;
    this.store.set({
      servers,
      sessions,
      active: sessions[0]?.channel ?? null,
      epoch: this.store.get().epoch + 1,
    });
  }

  private key(ch: ChannelId): string {
    const gen =
      serverOf(ch) === "a" ? vmService.a.store.get().generation : vmService.b.store.get().generation;
    return `${this.ctxId}#${gen}`;
  }

  /** 시딩이 채널을 직접 준비했을 때(터미널② 등) — 복제로 열어도 재준비하지 않는다 */
  notePrepared(ch: ChannelId): void {
    this.prepKey[ch] = this.key(ch);
  }

  focus(ch: ChannelId): void {
    if (this.store.get().sessions.some((s) => s.channel === ch)) this.store.set({ active: ch });
  }

  /** 서버의 기본 세션을 연다 — 닫혀 있으면 재연결(즉시), 열려 있으면 포커스만 */
  connect(server: ServerId): void {
    const ch = PRIMARY[server];
    const s = this.store.get();
    if (!s.sessions.some((x) => x.channel === ch)) {
      this.push({ channel: ch, server, n: 1, status: "open" });
    }
    this.store.set({ active: ch });
  }

  close(ch: ChannelId): void {
    const s = this.store.get();
    const sessions = s.sessions.filter((x) => x.channel !== ch);
    this.store.set({
      sessions,
      active: s.active === ch ? (sessions[0]?.channel ?? null) : s.active,
    });
  }

  hasSession(ch: ChannelId): boolean {
    return this.store.get().sessions.some((x) => x.channel === ch);
  }

  /** 세션 복제 — 같은 서버의 두 번째 셸(ttyS1)을 연다. */
  async duplicate(server: ServerId): Promise<void> {
    const ch = DUPLICATE[server];
    const st = this.store.get();
    const existing = st.sessions.find((x) => x.channel === ch);
    if (existing) {
      if (existing.status === "open") this.store.set({ active: ch });
      return;
    }
    const epoch = st.epoch;
    const needPrep = this.prepKey[ch] !== this.key(ch);
    this.push({ channel: ch, server, n: 2, status: needPrep ? "connecting" : "open" });
    this.store.set({ active: ch });
    if (!needPrep) return; // 이미 준비된 셸 — 화면만 다시 연다 (아무것도 보내지 않음)

    const inst = server === "a" ? vmService.a : vmService.b;
    const chan = serialChannels[ch];
    try {
      if (!(await inst.ensureAuxReady())) throw new Error("aux shell not ready");
      if (this.store.get().epoch !== epoch) return;
      chan.setGates({ display: false, input: false });
      if (!(await chan.prologue())) throw new Error("shell not responding");
      await sleep(250); // 팬 마운트 직후 fit 안정화 대기
      const sz = terminals[ch].getSize();
      await chan.runTransaction(
        `export TERM=vt100; stty rows ${Math.max(sz.rows, 8)} cols ${Math.max(sz.cols, 40)}; ${PS1_INIT}`,
        { timeoutMs: 4000 },
      );
      await chan.runTransaction(`cd ${this.workdir} 2>/dev/null || cd /root`, { timeoutMs: 4000 });
      await chan.waitPrompt();
      terminals[ch].resetScreen();
      terminals[ch].writeDivider("세션 ② — 같은 서버의 새 셸");
      chan.setGates({ display: true, input: true });
      chan.sendRaw("\n");
      this.prepKey[ch] = this.key(ch);
      if (this.store.get().epoch !== epoch) return;
      this.setStatus(ch, "open");
    } catch {
      chan.setGates({ display: true, input: true });
      if (this.store.get().epoch !== epoch) return;
      this.setStatus(ch, "error");
    }
  }

  retryDuplicate(server: ServerId): void {
    this.close(DUPLICATE[server]);
    void this.duplicate(server);
  }

  /** 해당 서버에 복제 세션을 더 열 수 있는가 (UI 버튼 활성 판단) */
  canDuplicate(server: ServerId): boolean {
    return !this.store.get().sessions.some((x) => x.channel === DUPLICATE[server]);
  }

  private push(sess: WsSession): void {
    const sessions = [...this.store.get().sessions, sess].sort(
      (x, y) => PANE_ORDER.indexOf(x.channel) - PANE_ORDER.indexOf(y.channel),
    );
    this.store.set({ sessions });
  }

  private setStatus(ch: ChannelId, status: SessionStatus): void {
    this.store.set({
      sessions: this.store.get().sessions.map((x) => (x.channel === ch ? { ...x, status } : x)),
    });
  }
}

export const termWorkspace = new TermWorkspace();
