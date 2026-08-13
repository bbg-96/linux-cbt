import type { Problem } from "../engine/types";
import { ALL_PROBLEMS } from "./all";
import { STAGING_PROBLEMS } from "./staging";

/**
 * 빌드 모드에 따라 문제 세트를 고른다.
 * - 운영(`npm run build`)      → 전체 카탈로그
 * - 스테이징(`build:staging`)  → 선별 목록 (.env.staging의 VITE_PROBLEM_SET=staging)
 *
 * 공개 API(problems/findProblem)는 그대로라 나머지 코드는 이 분기를 몰라도 된다.
 */
export const problems: Problem[] =
  import.meta.env.VITE_PROBLEM_SET === "staging" ? STAGING_PROBLEMS : ALL_PROBLEMS;

export function findProblem(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}
