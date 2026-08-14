import type { Problem } from "../engine/types";
import { sysinfo01 } from "./data/inspect/sysinfo-01";
import { netinfo01 } from "./data/inspect/netinfo-01";

/**
 * 운영 사이트가 싣는 전체 카탈로그.
 *
 * 스테이징(`staging.ts`)에서 다듬은 문제를 여기로 올리면 운영에 나간다 — 새 문제는
 * 스테이징에만 올려 검증하고, 만족스러우면 이 목록에 추가하는 것이 승격 절차다.
 * 배열 순서가 곧 커리큘럼 순서다.
 */
export const ALL_PROBLEMS: Problem[] = [sysinfo01, netinfo01];
