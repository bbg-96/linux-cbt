import { createStore, type Store } from "../lib/store";
import { serialChannels } from "../vm/serialBus";
import { terminals } from "../terminal/terminalService";
import { vmService } from "../vm/vmService";
import { disposeBridge, installBridge, muteRelay, unmuteRelay } from "../vm/netBridge";
import { gradeProblem } from "./grader";
import { recordGrade } from "../store/progress";
import { DEFAULT_WORKDIR, type GradeReport, type Problem } from "./types";

export type SessionPhase = "idle" | "seeding" | "ready" | "grading" | "solved" | "error";

export interface SessionState {
  phase: SessionPhase;
  problemId: string | null;
  /** 시딩 당시의 VM 세대 — VM 재시작을 감지해 재시딩한다 */
  seededGeneration: number;
  seededGenerationB: number;
  report: GradeReport | null;
  error: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 문제 풀이 세션 상태머신.
 * - seeding/grading 동안 해당 문제의 활성 채널을 잠그고, 셋업 출력은 화면에 남기지 않는다.
 * - vms:2 문제 진입/이탈이 브리지·릴레이 음소거·VM B 일시정지의 단일 관문이다.
 * - 채점 prologue는 a0·b0에만 보낸다. a1(터미널②)은 학습자의 포그라운드 관찰
 *   프로세스(tcpdump 등)를 보존하기 위해 절대 건드리지 않는다.
 */
class ProblemSession {
  readonly store: Store<SessionState> = createStore<SessionState>({
    phase: "idle",
    problemId: null,
    seededGeneration: 0,
    seededGenerationB: 0,
    report: null,
    error: null,
  });
  private busy = false;

  needsSeed(problem: Problem): boolean {
    const s = this.store.get();
    if (s.phase === "seeding" || s.phase === "grading" || s.phase === "error") return false;
    if (s.phase === "idle" || s.problemId !== problem.id) return true;
    if (s.seededGeneration !== vmService.a.store.get().generation) return true;
    if ((problem.vms ?? 1) === 2) {
      if (vmService.b.phase !== "ready") return true;
      if (s.seededGenerationB !== vmService.b.store.get().generation) return true;
    }
    return false;
  }

  async seed(problem: Problem): Promise<void> {
    if (this.busy || vmService.phase !== "ready") return;
    this.busy = true;
    const vms = problem.vms ?? 1;
    const twoTerms = (problem.terminals ?? 1) === 2;
    const chA = serialChannels.a0;
    const chT2 = serialChannels.a1;
    const chB = serialChannels.b0;
    this.store.set({ phase: "seeding", problemId: problem.id, report: null, error: null });
    chA.setGates({ display: false, input: false });
    if (twoTerms) chT2.setGates({ input: false });
    try {
      // ── 모드 전환 단일 관문 ─────────────────────────────────────────
      if (vms === 2) {
        if (vmService.a.store.get().imageKind === "legacy") {
          throw new Error("이 문제는 Alpine 이미지 전용입니다 (?legacy를 제거하세요).");
        }
        const okB = await vmService.ensureB();
        if (!okB || !vmService.b.emulator) throw new Error("두 번째 VM(Host B) 부팅에 실패했습니다.");
        vmService.resumeB();
        chB.setGates({ display: false, input: false });
        muteRelay(vmService.a.emulator!);
        muteRelay(vmService.b.emulator); // B는 릴레이 없음(no-op) — 이중 안전장치
        installBridge(vmService.a.emulator!, vmService.b.emulator);
      } else {
        disposeBridge();
        if (vmService.a.emulator) unmuteRelay(vmService.a.emulator);
        vmService.pauseB();
      }
      const aGen = vmService.a.store.get().generation;
      const bGen = vms === 2 ? vmService.b.store.get().generation : 0;
      const txTimeout = problem.setupTimeoutMs ?? 10_000;
      const workdir = problem.workdir ?? DEFAULT_WORKDIR;

      // ── Host A 시딩 ────────────────────────────────────────────────
      if (!(await chA.prologue())) {
        throw new Error("셸이 응답하지 않습니다. VM을 재시작해 주세요.");
      }
      const stepsA = [
        vms === 2 ? "hostname host-a" : "hostname localhost 2>/dev/null; true",
        `cd /root; rm -rf ${workdir}; mkdir -p ${workdir}`,
        ...(problem.setup ?? []),
        `cd ${workdir}`,
      ];
      for (const cmd of stepsA) {
        const r = await chA.runTransaction(cmd, { timeoutMs: txTimeout });
        if (r.timedOut || r.rc !== 0) {
          throw new Error("문제 환경 준비에 실패했습니다. 다시 시도해 주세요.");
        }
      }

      // ── 터미널② (a1) ──────────────────────────────────────────────
      if (twoTerms) {
        if (!(await vmService.ensureA1())) throw new Error("터미널 ②를 준비하지 못했습니다.");
        chT2.setGates({ display: false });
        if (!(await chT2.prologue())) throw new Error("터미널 ② 셸이 응답하지 않습니다.");
        await sleep(150); // 분할 레이아웃 fit 안정화 대기
        const sz = terminals.a1.getSize();
        await chT2.runTransaction(
          `export TERM=vt100; stty rows ${Math.max(sz.rows, 8)} cols ${Math.max(sz.cols, 40)}`,
          { timeoutMs: 4000 },
        );
        await chT2.runTransaction(`cd ${workdir}`, { timeoutMs: 4000 });
      }

      // ── Host B (b0) ───────────────────────────────────────────────
      if (vms === 2) {
        if (!(await chB.prologue())) throw new Error("Host B 셸이 응답하지 않습니다.");
        await sleep(150);
        const szb = terminals.b0.getSize();
        await chB.runTransaction(
          `export TERM=vt100; stty rows ${Math.max(szb.rows, 8)} cols ${Math.max(szb.cols, 40)}`,
          { timeoutMs: 4000 },
        );
        const stepsB = [
          "hostname host-b",
          `cd /root; rm -rf ${workdir}; mkdir -p ${workdir}`,
          ...(problem.setupB ?? []),
          `cd ${workdir}`,
        ];
        for (const cmd of stepsB) {
          const r = await chB.runTransaction(cmd, { timeoutMs: txTimeout });
          if (r.timedOut || r.rc !== 0) {
            throw new Error("Host B 환경 준비에 실패했습니다. 다시 시도해 주세요.");
          }
        }
      }

      // ── 화면 정리 + 게이트 오픈 ────────────────────────────────────
      terminals.a0.resetScreen();
      terminals.a0.writeDivider(`문제 준비 완료 — ${problem.title}`);
      chA.setGates({ display: true, input: true });
      chA.sendRaw("\n");
      if (twoTerms) {
        terminals.a1.resetScreen();
        terminals.a1.writeDivider("터미널 ② — 같은 서버의 두 번째 셸");
        chT2.setGates({ display: true, input: true });
        chT2.sendRaw("\n");
      }
      if (vms === 2) {
        terminals.b0.resetScreen();
        terminals.b0.writeDivider("Host B 준비 완료");
        chB.setGates({ display: true, input: true });
        chB.sendRaw("\n");
      }
      this.store.set({ phase: "ready", seededGeneration: aGen, seededGenerationB: bGen });
    } catch (e) {
      chA.setGates({ display: true, input: true });
      chT2.setGates({ display: true, input: true });
      chB.setGates({ display: true, input: true });
      this.store.set({ phase: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      this.busy = false;
    }
  }

  async grade(problem: Problem): Promise<void> {
    if (this.busy) return;
    const s = this.store.get();
    if (s.phase !== "ready" && s.phase !== "solved") return;
    this.busy = true;
    const vms = problem.vms ?? 1;
    const twoTerms = (problem.terminals ?? 1) === 2;
    const chA = serialChannels.a0;
    const chT2 = serialChannels.a1;
    const chB = serialChannels.b0;
    this.store.set({ phase: "grading" });
    chA.setGates({ display: false, input: false });
    if (twoTerms) chT2.setGates({ input: false }); // 표시 유지 — 실시간 관찰(tcpdump) 화면 보존
    if (vms === 2) chB.setGates({ display: false, input: false });
    try {
      if (!(await chA.prologue())) {
        throw new Error("셸이 응답하지 않습니다. VM을 재시작해 주세요.");
      }
      if (vms === 2 && !(await chB.prologue())) {
        throw new Error("Host B 셸이 응답하지 않습니다.");
      }
      const report = await gradeProblem(problem, { a: chA, b: vms === 2 ? chB : undefined });
      recordGrade(problem.id, report.passed);
      terminals.a0.writeDivider(report.passed ? "채점 완료 — 통과!" : "채점 완료 — 미통과");
      chA.setGates({ display: true, input: true });
      chA.sendRaw("\n");
      if (twoTerms) chT2.setGates({ input: true });
      if (vms === 2) {
        chB.setGates({ display: true, input: true });
        chB.sendRaw("\n");
      }
      this.store.set({ phase: report.passed ? "solved" : "ready", report });
    } catch (e) {
      chA.setGates({ display: true, input: true });
      if (twoTerms) chT2.setGates({ input: true });
      if (vms === 2) chB.setGates({ display: true, input: true });
      this.store.set({ phase: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      this.busy = false;
    }
  }

  /** 문제 페이지를 떠날 때 세션을 초기화한다 (VM A는 유지, B는 일시정지). */
  leave(): void {
    if (this.busy) return;
    disposeBridge();
    if (vmService.a.emulator) unmuteRelay(vmService.a.emulator);
    vmService.pauseB();
    this.store.set({ phase: "idle", problemId: null, report: null, error: null });
  }

  /** 오류 상태에서 수동 재시도. */
  retry(problem: Problem): void {
    this.store.set({ phase: "idle", error: null });
    void this.seed(problem);
  }
}

export const problemSession = new ProblemSession();
