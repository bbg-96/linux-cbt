import { createStore, type Store } from "../lib/store";
import { serialBus } from "../vm/serialBus";
import { terminalService } from "../terminal/terminalService";
import { vmService } from "../vm/vmService";
import { gradeProblem } from "./grader";
import { recordGrade } from "../store/progress";
import { DEFAULT_WORKDIR, type GradeReport, type Problem } from "./types";

export type SessionPhase = "idle" | "seeding" | "ready" | "grading" | "solved" | "error";

export interface SessionState {
  phase: SessionPhase;
  problemId: string | null;
  /** 시딩 당시의 VM 세대 — VM 재시작을 감지해 재시딩한다 */
  seededGeneration: number;
  report: GradeReport | null;
  error: string | null;
}

/**
 * 문제 풀이 세션 상태머신.
 * seeding/grading 동안 터미널 표시·입력을 잠그고, 셋업 출력은 화면에 남기지 않는다.
 */
class ProblemSession {
  readonly store: Store<SessionState> = createStore<SessionState>({
    phase: "idle",
    problemId: null,
    seededGeneration: 0,
    report: null,
    error: null,
  });
  private busy = false;

  needsSeed(problem: Problem): boolean {
    const s = this.store.get();
    if (s.phase === "seeding" || s.phase === "grading" || s.phase === "error") return false;
    return (
      s.phase === "idle" ||
      s.problemId !== problem.id ||
      s.seededGeneration !== vmService.store.get().generation
    );
  }

  async seed(problem: Problem): Promise<void> {
    if (this.busy || vmService.phase !== "ready") return;
    this.busy = true;
    const generation = vmService.store.get().generation;
    this.store.set({ phase: "seeding", problemId: problem.id, report: null, error: null });
    serialBus.setGates({ display: false, input: false });
    try {
      if (!(await serialBus.prologue())) {
        throw new Error("셸이 응답하지 않습니다. VM을 재시작해 주세요.");
      }
      const workdir = problem.workdir ?? DEFAULT_WORKDIR;
      const steps = [
        `cd /root; rm -rf ${workdir}; mkdir -p ${workdir}`,
        ...(problem.setup ?? []),
        `cd ${workdir}`,
      ];
      for (const cmd of steps) {
        const r = await serialBus.runTransaction(cmd, { timeoutMs: problem.setupTimeoutMs ?? 10_000 });
        if (r.timedOut || r.rc !== 0) {
          throw new Error("문제 환경 준비에 실패했습니다. 다시 시도해 주세요.");
        }
      }
      terminalService.resetScreen();
      terminalService.writeDivider(`문제 준비 완료 — ${problem.title}`);
      serialBus.setGates({ display: true, input: true });
      serialBus.sendRaw("\n");
      this.store.set({ phase: "ready", seededGeneration: generation });
    } catch (e) {
      serialBus.setGates({ display: true, input: true });
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
    this.store.set({ phase: "grading" });
    serialBus.setGates({ display: false, input: false });
    try {
      if (!(await serialBus.prologue())) {
        throw new Error("셸이 응답하지 않습니다. VM을 재시작해 주세요.");
      }
      const report = await gradeProblem(problem, serialBus);
      recordGrade(problem.id, report.passed);
      terminalService.writeDivider(report.passed ? "채점 완료 — 통과!" : "채점 완료 — 미통과");
      serialBus.setGates({ display: true, input: true });
      serialBus.sendRaw("\n");
      this.store.set({ phase: report.passed ? "solved" : "ready", report });
    } catch (e) {
      serialBus.setGates({ display: true, input: true });
      this.store.set({ phase: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      this.busy = false;
    }
  }

  /** 문제 페이지를 떠날 때 세션을 초기화한다 (VM은 유지). */
  leave(): void {
    if (this.busy) return;
    this.store.set({ phase: "idle", problemId: null, report: null, error: null });
  }

  /** 오류 상태에서 수동 재시도. */
  retry(problem: Problem): void {
    this.store.set({ phase: "idle", error: null });
    void this.seed(problem);
  }
}

export const problemSession = new ProblemSession();
