import type { Problem } from "../engine/types";
import { TRIAGE_PROBLEMS } from "./data/cloud/triage";
import { SERVICE_PROBLEMS } from "./data/cloud/service";
import { NETWORK_PROBLEMS } from "./data/cloud/network";
import { STORAGE_PROBLEMS } from "./data/cloud/storage";
import { SECURITY_PROBLEMS } from "./data/cloud/security";
import { AUTOMATION_PROBLEMS } from "./data/cloud/automation";

/**
 * 스테이징 사이트(https://bbg-96.github.io/linux-cbt-staging/)에 등록할 문제.
 *
 * 클라우드 운영 실무 트랙 31문제 — 초동 점검 → 서비스/로그 → 네트워크 → 스토리지
 * → 보안 증적 → 자동화 순서로, 실제 장애 대응 흐름을 따라간다.
 * 운영 사이트는 all.ts(기초 문법 30문제)를 쓰므로 이 목록의 영향을 받지 않는다.
 *
 * 배열 순서가 곧 커리큘럼 순서다(이어서 풀기·이전/다음이 이 순서를 따른다).
 */
export const STAGING_PROBLEMS: Problem[] = [
  ...TRIAGE_PROBLEMS,
  ...SERVICE_PROBLEMS,
  ...NETWORK_PROBLEMS,
  ...STORAGE_PROBLEMS,
  ...SECURITY_PROBLEMS,
  ...AUTOMATION_PROBLEMS,
];
