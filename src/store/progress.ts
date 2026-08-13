import { createStore, type Store } from "../lib/store";

export interface ProblemProgress {
  status: "attempted" | "solved";
  attempts: number;
  hintsUsed: number;
  solvedAt?: string;
}

interface ProgressState {
  version: 1;
  problems: Record<string, ProblemProgress>;
}

const KEY = "linux-cbt:v1";

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      if (parsed && parsed.version === 1 && typeof parsed.problems === "object") {
        return parsed;
      }
    }
  } catch {
    // 손상된 저장 데이터는 초기화
  }
  return { version: 1, problems: {} };
}

export const progressStore: Store<ProgressState> = createStore<ProgressState>(load());

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progressStore.get()));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시
  }
}

function update(problemId: string, fn: (p: ProblemProgress) => ProblemProgress): void {
  const s = progressStore.get();
  const prev = s.problems[problemId] ?? { status: "attempted" as const, attempts: 0, hintsUsed: 0 };
  progressStore.set({ problems: { ...s.problems, [problemId]: fn(prev) } });
  persist();
}

export function recordGrade(problemId: string, passed: boolean): void {
  update(problemId, (p) => ({
    ...p,
    attempts: p.attempts + 1,
    status: passed ? "solved" : p.status,
    solvedAt: passed && !p.solvedAt ? new Date().toISOString() : p.solvedAt,
  }));
}

export function recordHint(problemId: string): void {
  update(problemId, (p) => ({ ...p, hintsUsed: p.hintsUsed + 1 }));
}
