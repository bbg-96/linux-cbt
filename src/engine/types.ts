export type CategoryId =
  // 기초 문법 트랙 (운영 사이트)
  | "files"
  | "permissions"
  | "text"
  | "search"
  | "process"
  | "archive"
  | "system"
  // 클라우드 실무 트랙 (스테이징) — network는 두 트랙이 공유한다
  | "triage"
  | "service"
  | "network"
  | "storage"
  | "security"
  | "automation";

interface CheckBase {
  id: string;
  /** 채점 결과에 표시되는 한글 설명, 예: "backup.sh에 실행 권한이 있는가" */
  label: string;
  timeoutMs?: number;
  /** 검사를 실행할 호스트 (기본 "a"; "b"는 vms:2 문제 전용) */
  on?: "a" | "b";
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

/** 검증용 모범답안 한 스텝 — 문자열은 Host A(a0)에서 실행 */
export type AnswerStep = string | { on: "a" | "b" | "t2"; cmd: string };

export interface Problem {
  id: string;
  category: CategoryId;
  title: string;
  difficulty: 1 | 2 | 3;
  /** 문제 카드에 표시되는 핵심 명령어 태그 (1~4개, 옵션 조각 포함 가능) */
  tags?: string[];
  /** 카탈로그 트리의 명령어 노드 축 — 단일 토큰 명령어 1~3개 (예: ["ip","route"]) */
  commands?: string[];
  /** 메인 VM의 터미널 수 (2면 ttyS1 터미널②가 추가 표시; vms:2와 동시 사용 불가) */
  terminals?: 1 | 2;
  /** 2면 Host B(두 번째 VM)가 추가되고 L2 브리지로 연결된다 */
  vms?: 1 | 2;
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
  /** vms:2 전용 — Host B(b0)에서 실행되는 셋업 (A 셋업 이후 실행) */
  setupB?: string[];
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
  verify?: { answer: AnswerStep[] };
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
