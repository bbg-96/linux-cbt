export type CategoryId =
  | "files"
  | "permissions"
  | "text"
  | "search"
  | "process"
  | "archive"
  | "system"
  | "network";

interface CheckBase {
  id: string;
  /** 채점 결과에 표시되는 한글 설명, 예: "backup.sh에 실행 권한이 있는가" */
  label: string;
  timeoutMs?: number;
}

export interface ExpectSpec {
  /** trim 후 완전 일치 */
  equals?: string;
  /** 부분 문자열 포함 */
  includes?: string;
  /** 정규식 (JS, m 플래그) */
  matches?: string;
}

/** 게스트에서 명령을 실행해 종료코드(및 선택적 출력)를 검사 */
export interface CommandCheck extends CheckBase {
  type: "command";
  cmd: string;
  expect?: ExpectSpec;
}

export interface FileExistsCheck extends CheckBase {
  type: "file_exists";
  path: string;
}

/** 8진수 권한 검사, 예: "744" (busybox에 stat이 없어 ls -ld 파싱으로 평가) */
export interface FileModeCheck extends CheckBase {
  type: "file_mode";
  path: string;
  mode: string;
}

export interface FileContentCheck extends CheckBase {
  type: "file_content";
  path: string;
  expect: ExpectSpec;
}

export type Check = CommandCheck | FileExistsCheck | FileModeCheck | FileContentCheck;

export interface Problem {
  id: string;
  category: CategoryId;
  title: string;
  difficulty: 1 | 2 | 3;
  /** 상황 제시 (한글, pre-line 렌더링) */
  scenario: string;
  /** 달성 목표 목록 */
  objectives: string[];
  /** 기본 /root/work — 시딩 때 초기화 후 setup 실행, 마지막에 cd */
  workdir?: string;
  /** 숨김 셋업 명령 (한 줄씩 순서대로 트랜잭션 실행; 실패 시 시딩 중단) */
  setup?: string[];
  /** setup 각 줄의 타임아웃 (기본 10초; NetworkManager 기동 등 느린 셋업용) */
  setupTimeoutMs?: number;
  /** 전부 통과해야 해결 */
  checks: Check[];
  /** 단계적으로 공개되는 힌트 */
  hints: string[];
  /** 모범답안 + 해설 (해결 후 또는 포기 시 공개) */
  explanation: string;
  /**
   * 자동 검증용 모범답안 명령 (dev 회귀 하네스 __cbt.verifyAll 전용).
   * 정답은 explanation에 이미 공개되어 있으므로 비밀 유출이 아니다.
   */
  verify?: { answer: string[] };
}

export type CheckStatus = "pass" | "fail" | "timeout" | "error";

export interface CheckResult {
  checkId: string;
  label: string;
  status: CheckStatus;
  /** 실패 원인 요약, 예: "권한이 644 (기대: 744)" */
  detail?: string;
  /** 게스트에서 캡처된 출력 (학습자 디버깅용) */
  output?: string;
}

export interface GradeReport {
  problemId: string;
  at: string;
  passed: boolean;
  results: CheckResult[];
}

export const DEFAULT_WORKDIR = "/root/work";
