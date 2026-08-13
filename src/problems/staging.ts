import type { Problem } from "../engine/types";

/**
 * 스테이징 사이트(https://bbg-96.github.io/linux-cbt-staging/)에 등록할 문제.
 *
 * 지금은 비어 있다 — 선별한 문제만 담는 목록이다.
 *
 * 클라우드 실무 트랙 31문제는 `data/cloud/*.ts`에 그대로 남아 있다(전 문제
 * 실VM 회귀 통과 상태). 다시 올리려면 필요한 만큼 골라 담으면 된다:
 *
 *   import { TRIAGE_PROBLEMS } from "./data/cloud/triage";
 *   export const STAGING_PROBLEMS: Problem[] = [...TRIAGE_PROBLEMS];
 *
 * 기초 트랙에서 골라 담아도 되고(`import { perm01 } from "./data/permissions/perm-01"`),
 * 새 문제 모듈을 만들어 넣어도 된다. 배열 순서가 곧 커리큘럼 순서다.
 * 운영 사이트는 all.ts의 ALL_PROBLEMS를 쓰므로 이 파일의 영향을 받지 않는다.
 */
export const STAGING_PROBLEMS: Problem[] = [];
