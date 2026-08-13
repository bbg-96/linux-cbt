import type { Problem } from "../engine/types";

/**
 * 스테이징 사이트(https://bbg-96.github.io/linux-cbt-staging/)에 등록할 문제.
 *
 * 선별한 문제만 담는 목록이라 기본값은 비어 있다. 두 가지 방식 모두 가능하다:
 *
 *   1) 기존 카탈로그에서 골라 담기
 *        import { perm01 } from "./data/permissions/perm-01";
 *        export const STAGING_PROBLEMS: Problem[] = [perm01];
 *
 *   2) 새로 작성한 문제 모듈 추가 (data/<카테고리>/<id>.ts 로 만든 뒤 import)
 *
 * 순서가 곧 커리큘럼 순서다(이어서 풀기·이전/다음이 이 순서를 따른다).
 * 운영 사이트는 all.ts의 ALL_PROBLEMS를 쓰므로 이 파일의 영향을 받지 않는다.
 */
export const STAGING_PROBLEMS: Problem[] = [];
