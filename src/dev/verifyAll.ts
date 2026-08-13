// 개발/회귀 전용: 문제별 fail→answer→pass 사이클을 자동 실행한다.
// window.__cbt.verifyAll() 로 호출 (dev 또는 ?debug 빌드).
import { findProblem, problems } from "../problems";
import { problemSession } from "../engine/session";
import { serialBus } from "../vm/serialBus";
import { vmService } from "../vm/vmService";
import { resetProgress } from "../store/progress";
import type { Problem } from "../engine/types";

async function verifyOne(problem: Problem): Promise<string> {
  if (!problem.verify?.answer?.length) return `${problem.id}: SKIP (verify.answer 없음)`;
  if (vmService.store.get().phase !== "ready") return `${problem.id}: FAIL@vm-not-ready`;

  problemSession.leave();
  await problemSession.seed(problem);
  let s = problemSession.store.get();
  if (s.phase !== "ready") return `${problem.id}: FAIL@seed ${s.error ?? ""}`;

  await problemSession.grade(problem);
  s = problemSession.store.get();
  if (!s.report || s.report.passed) return `${problem.id}: FAIL@initial-must-fail`;

  for (const cmd of problem.verify.answer) {
    const r = await serialBus.runTransaction(cmd, { timeoutMs: 15_000 });
    if (r.timedOut) return `${problem.id}: FAIL@answer-timeout (${cmd})`;
  }

  await problemSession.grade(problem);
  s = problemSession.store.get();
  if (!s.report?.passed) {
    const failed = (s.report?.results ?? [])
      .filter((r) => r.status !== "pass")
      .map((r) => `${r.checkId}:${r.status}${r.detail ? `(${r.detail})` : ""}`)
      .join(", ");
    return `${problem.id}: FAIL@answer-must-pass [${failed}]`;
  }
  return `${problem.id}: OK`;
}

export async function verifyAll(ids?: string[]): Promise<string[]> {
  const targets = ids?.length
    ? ids.map((id) => findProblem(id)).filter((p): p is Problem => !!p)
    : problems;
  const results: string[] = [];
  for (const problem of targets) {
    const line = await verifyOne(problem);
    results.push(line);
    console.log(`[verifyAll] ${line}`);
  }
  problemSession.leave();
  resetProgress(); // 검증이 남긴 진도 오염 제거
  const failed = results.filter((r) => !r.endsWith(": OK"));
  console.log(`[verifyAll] ${results.length - failed.length}/${results.length} OK${failed.length ? " — FAILURES: " + failed.join(" | ") : ""}`);
  return results;
}
