import { runCheck, type CheckRunner } from "./checkCompiler";
import type { CheckResult, GradeReport, Problem } from "./types";

/** 체크를 순차 실행한다 (시리얼 트랜잭션은 동시 실행 불가). */
export async function gradeProblem(problem: Problem, tx: CheckRunner): Promise<GradeReport> {
  const results: CheckResult[] = [];
  for (const check of problem.checks) {
    results.push(await runCheck(check, tx));
  }
  return {
    problemId: problem.id,
    at: new Date().toISOString(),
    passed: results.every((r) => r.status === "pass"),
    results,
  };
}
