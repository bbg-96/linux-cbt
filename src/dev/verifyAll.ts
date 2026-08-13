// 개발/회귀 전용: 문제별 fail→answer→pass 사이클을 자동 실행한다.
// window.__cbt.verifyAll() 로 호출 (dev 또는 ?debug 빌드).
import { findProblem, problems } from "../problems";
import { problemSession } from "../engine/session";
import { termWorkspace } from "../terminal/workspace";
import { serialChannels } from "../vm/serialBus";
import { vmService } from "../vm/vmService";
import { resetProgress } from "../store/progress";
import type { AnswerStep, Problem } from "../engine/types";

function stepChannel(step: AnswerStep) {
  const s = typeof step === "string" ? { on: "a" as const, cmd: step } : step;
  const ch = s.on === "b" ? serialChannels.b0 : s.on === "t2" ? serialChannels.a1 : serialChannels.a0;
  return { ch, cmd: s.cmd, on: s.on };
}

async function verifyOne(problem: Problem): Promise<string> {
  if (!problem.verify?.answer?.length) return `${problem.id}: SKIP (verify.answer 없음)`;
  if (vmService.store.get().phase !== "ready") return `${problem.id}: FAIL@vm-not-ready`;

  problemSession.leave();
  // 학습자가 UI에서 하는 것과 같은 순서: 문제 진입 → 워크스페이스 구성 → 시딩
  termWorkspace.configureProblem(problem);
  await problemSession.seed(problem);
  let s = problemSession.store.get();
  if (s.phase !== "ready") return `${problem.id}: FAIL@seed ${s.error ?? ""}`;

  await problemSession.grade(problem);
  s = problemSession.store.get();
  if (!s.report || s.report.passed) return `${problem.id}: FAIL@initial-must-fail`;

  for (const step of problem.verify.answer) {
    const { ch, cmd, on } = stepChannel(step);
    // t2 스텝은 학습자가 ⧉ 복제로 세션 ②를 여는 동작에 해당한다 (시딩이 셸을 미리
    // 준비해 두므로 즉시 열린다). 열지 않고 보내면 화면 없는 셸에 명령이 들어간다.
    if (on === "t2" && !termWorkspace.hasSession("a1")) await termWorkspace.duplicate("a");
    const r = await ch.runTransaction(cmd, { timeoutMs: 15_000 });
    if (r.timedOut) return `${problem.id}: FAIL@answer-timeout (${on}: ${cmd})`;
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
