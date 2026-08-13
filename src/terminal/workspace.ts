// 터미널 워크스페이스 — mRemoteNG/MobaXterm식 세션 관리의 단일 진입점.
// "서버"는 문제(또는 자유 연습)가 제공하는 접속 대상이고, "세션"은 그 서버에
// 열린 셸이다. 서버당 세션은 최대 2개 (ttyS0=기본, ttyS1=복제).
//
// 화면 모델: 사용자가 고른 팬 수(1·2·4)만큼 터미널 화면이 있고, 각 세션은 정확히
// 한 팬에 탭으로 속한다. 탭은 드래그앤드롭으로 팬 사이를 이동할 수 있다.
//
// 복제 세션 닫기 = 실제 종료다: Ctrl+C 후 exit를 보내 셸을 끝내고(inittab respawn이
// 새 로그인 셸을 띄움) 화면을 비운다. 다시 열면 새 세션이 준비된다(prologue+stty+PS1).
import { createStore, type Store } from "../lib/store";
import { serialChannels, type ChannelId } from "../vm/serialBus";
import { PS1_INIT } from "../vm/shellInit";
import { terminals } from "./terminalService";
import { vmService } from "../vm/vmService";
import { DEFAULT_WORKDIR, type Problem } from "../engine/types";

export type ServerId = "a" | "b";
export type SessionStatus = "open" | "connecting" | "error";
export type PaneLayout = 1 | 2 | 4;

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
  /** 키보드 포커스 세션 (KeyBar·모바일 표시 대상) */
  active: ChannelId | null;
  /** configure마다 증가 — 진행 중이던 복제 준비를 무효화한다 */
  epoch: number;
  /** 한 화면에 띄울 터미널 팬 수 */
  layout: PaneLayout;
  /** 세션 → 팬 인덱스 (0..layout-1) */
  paneOf: Partial<Record<ChannelId, number>>;
  /** 팬별 활성 탭 (인덱스 = 팬; layout보다 긴 부분은 무시) */
  paneActive: (ChannelId | null)[];
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
    layout: 1,
    paneOf: { a0: 0 },
    paneActive: [
      "a0",
      null,
      null,
      null,
    ],
  });
  private workdir = "/root";
  private ctxId = "free";
  /** 채널별 '이 컨텍스트에서 준비 완료' 키 (ctxId#VM세대) */
  private prepKey: Partial<Record<ChannelId, string>> = {};
  /** 사용자가 팬 수를 직접 고른 뒤에는 문제 전환 때 기본값으로 되돌리지 않는다 */
  private layoutTouched = false;

  // ── 구성 ─────────────────────────────────────────────────────────

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
    this.reset(servers, sessions, problem.workdir ?? DEFAULT_WORKDIR, problem.id, twoVms ? 2 : 1);
  }

  /** 자유 연습 터미널 페이지 */
  configureFree(): void {
    this.reset(
      [{ id: "a", name: "localhost" }],
      [{ channel: "a0", server: "a", n: 1, status: "open" }],
      "/root",
      "free",
      1,
    );
  }

  private reset(
    servers: ServerInfo[],
    sessions: WsSession[],
    workdir: string,
    ctxId: string,
    defaultLayout: PaneLayout,
  ): void {
    // 이전 컨텍스트의 복제 세션은 실제로 종료한다 (셸 상태 초기화)
    for (const s of this.store.get().sessions) {
      if (s.n === 2) void this.terminate(s.channel);
    }
    this.workdir = workdir;
    this.ctxId = ctxId;
    const layout = this.layoutTouched ? this.store.get().layout : defaultLayout;
    const paneOf: Partial<Record<ChannelId, number>> = {};
    sessions.forEach((s, i) => {
      paneOf[s.channel] = layout > 1 ? i % layout : 0;
    });
    this.store.set({
      servers,
      sessions,
      active: sessions[0]?.channel ?? null,
      epoch: this.store.get().epoch + 1,
      layout,
      paneOf,
      paneActive: this.buildPaneActive(sessions, paneOf, layout, []),
    });
  }

  private buildPaneActive(
    sessions: WsSession[],
    paneOf: Partial<Record<ChannelId, number>>,
    _layout: number,
    prev: (ChannelId | null)[],
  ): (ChannelId | null)[] {
    const inPane = (p: number) =>
      PANE_ORDER.filter((c) => sessions.some((s) => s.channel === c) && (paneOf[c] ?? 0) === p);
    const out: (ChannelId | null)[] = [];
    for (let p = 0; p < 4; p++) {
      const members = inPane(p);
      const keep = prev[p];
      out.push(keep && members.includes(keep) ? keep : (members[0] ?? null));
    }
    return out;
  }

  // ── 팬·탭 배치 ───────────────────────────────────────────────────

  setLayout(layout: PaneLayout): void {
    this.layoutTouched = true;
    const s = this.store.get();
    const paneOf: Partial<Record<ChannelId, number>> = {};
    for (const sess of s.sessions) {
      paneOf[sess.channel] = (s.paneOf[sess.channel] ?? 0) % layout;
    }
    this.store.set({
      layout,
      paneOf,
      paneActive: this.buildPaneActive(s.sessions, paneOf, layout, s.paneActive),
    });
  }

  /** 탭 드래그앤드롭 — 세션을 다른 팬으로 옮기고 그 팬의 활성 탭으로 만든다 */
  moveToPane(ch: ChannelId, pane: number): void {
    const s = this.store.get();
    if (!s.sessions.some((x) => x.channel === ch)) return;
    if (pane < 0 || pane >= s.layout) return;
    const paneOf = { ...s.paneOf, [ch]: pane };
    const paneActive = this.buildPaneActive(s.sessions, paneOf, s.layout, s.paneActive);
    paneActive[pane] = ch;
    this.store.set({ paneOf, paneActive, active: ch });
  }

  /** 탭 클릭 — 해당 팬의 활성 탭 + 전역 포커스로 만든다 */
  focus(ch: ChannelId): void {
    const s = this.store.get();
    if (!s.sessions.some((x) => x.channel === ch)) return;
    const paneActive = [...s.paneActive];
    paneActive[s.paneOf[ch] ?? 0] = ch;
    this.store.set({ active: ch, paneActive });
  }

  // ── 세션 수명주기 ────────────────────────────────────────────────

  /** 서버의 기본 세션을 연다 — 닫혀 있으면 재연결(즉시), 열려 있으면 포커스만 */
  connect(server: ServerId): void {
    const ch = PRIMARY[server];
    const s = this.store.get();
    if (!s.sessions.some((x) => x.channel === ch)) {
      this.push({ channel: ch, server, n: 1, status: "open" });
    }
    this.focus(ch);
  }

  /**
   * 세션을 닫는다. 기본 세션은 화면에서만 숨기고(셸 유지 — 채점 채널이기도 하다),
   * 복제 세션은 실제로 종료한다 — 다시 열면 새 셸이 준비된다.
   */
  close(ch: ChannelId): void {
    const s = this.store.get();
    const sess = s.sessions.find((x) => x.channel === ch);
    if (!sess) return;
    const sessions = s.sessions.filter((x) => x.channel !== ch);
    const paneOf = { ...s.paneOf };
    delete paneOf[ch];
    const paneActive = this.buildPaneActive(sessions, paneOf, s.layout, s.paneActive);
    this.store.set({
      sessions,
      paneOf,
      paneActive,
      active: s.active === ch ? (paneActive.find((c) => c) ?? sessions[0]?.channel ?? null) : s.active,
    });
    if (sess.n === 2) void this.terminate(ch);
  }

  /** 복제 세션의 셸을 실제로 끝낸다 — inittab respawn이 다음을 위해 새 셸을 띄운다 */
  private async terminate(ch: ChannelId): Promise<void> {
    delete this.prepKey[ch];
    const chan = serialChannels[ch];
    chan.setGates({ display: false, input: false });
    terminals[ch].resetScreen();
    if (!chan.attached) return;
    chan.sendRaw("\x03");
    await sleep(150);
    chan.sendRaw("exit\n");
  }

  hasSession(ch: ChannelId): boolean {
    return this.store.get().sessions.some((x) => x.channel === ch);
  }

  /** 시딩이 채널을 직접 준비했을 때(terminals:2) — 복제로 열어도 재준비하지 않는다 */
  notePrepared(ch: ChannelId): void {
    this.prepKey[ch] = this.key(ch);
  }

  private key(ch: ChannelId): string {
    const gen =
      serverOf(ch) === "a" ? vmService.a.store.get().generation : vmService.b.store.get().generation;
    return `${this.ctxId}#${gen}`;
  }

  /** 세션 복제 — 같은 서버의 두 번째 셸(ttyS1)에 새 세션을 연다. */
  async duplicate(server: ServerId): Promise<void> {
    const ch = DUPLICATE[server];
    const st = this.store.get();
    const existing = st.sessions.find((x) => x.channel === ch);
    if (existing) {
      if (existing.status === "open") this.focus(ch);
      return;
    }
    const epoch = st.epoch;
    const needPrep = this.prepKey[ch] !== this.key(ch);
    this.push({ channel: ch, server, n: 2, status: needPrep ? "connecting" : "open" });
    if (!needPrep) return; // 시딩이 이미 준비한 셸 (terminals:2 첫 복제)

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
    const s = this.store.get();
    const sessions = [...s.sessions, sess].sort(
      (x, y) => PANE_ORDER.indexOf(x.channel) - PANE_ORDER.indexOf(y.channel),
    );
    // 새 세션은 탭이 가장 적은 팬으로 (동률이면 앞 팬)
    const counts = Array.from({ length: s.layout }, (_, p) =>
      sessions.filter((x) => x.channel !== sess.channel && (s.paneOf[x.channel] ?? 0) === p).length,
    );
    const pane = counts.indexOf(Math.min(...counts));
    const paneOf = { ...s.paneOf, [sess.channel]: pane };
    const paneActive = this.buildPaneActive(sessions, paneOf, s.layout, s.paneActive);
    paneActive[pane] = sess.channel;
    this.store.set({ sessions, paneOf, paneActive, active: sess.channel });
  }

  private setStatus(ch: ChannelId, status: SessionStatus): void {
    this.store.set({
      sessions: this.store.get().sessions.map((x) => (x.channel === ch ? { ...x, status } : x)),
    });
  }
}

export const termWorkspace = new TermWorkspace();
