import { runCheck, type CheckRunner } from "./checkCompiler";
import type { CheckResult, GradeReport, Problem } from "./types";

export interface GradeRunners {
  a: CheckRunner;
  b?: CheckRunner;
}

/** 체크를 순차 실행한다 (시리얼 트랜잭션은 동시 실행 불가). check.on으로 호스트를 고른다. */
export async function gradeProblem(problem: Problem, runners: GradeRunners): Promise<GradeReport> {
  const results: CheckResult[] = [];
  for (const check of problem.checks) {
    const target = check.on ?? "a";
    if (target === "b" && !runners.b) {
      results.push({ checkId: check.id, label: check.label, status: "error", detail: "VM B 채널이 없습니다" });
      continue;
    }
    results.push(await runCheck(check, target === "b" ? runners.b! : runners.a));
  }
  return {
    problemId: problem.id,
    at: new Date().toISOString(),
    passed: results.every((r) => r.status === "pass"),
    results,
  };
}
