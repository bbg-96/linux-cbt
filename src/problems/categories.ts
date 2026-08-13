import type { CategoryId } from "../engine/types";

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  order: number;
  description: string;
}

/**
 * 두 트랙의 카테고리를 한 목록에 담는다 — 문제가 없는 카테고리는 화면에서 자동으로
 * 숨겨지므로(대시보드·사이드바), 운영에는 기초 문법 8종만, 스테이징에는 클라우드
 * 실무 6종만 나타난다. `network`는 두 트랙이 공유하는 유일한 카테고리다.
 */
export const CATEGORIES: Category[] = [
  { id: "files", name: "파일과 디렉터리", icon: "📁", order: 1, description: "탐색, 생성, 복사, 이동, 삭제, 링크" },
  { id: "permissions", name: "권한 관리", icon: "🔐", order: 2, description: "chmod, chown, 소유권과 접근 제어" },
  { id: "text", name: "텍스트 처리와 파이프", icon: "📝", order: 3, description: "grep, sed, awk, 파이프, 리다이렉션" },
  { id: "search", name: "파일 검색", icon: "🔎", order: 4, description: "find, ripgrep으로 원하는 것 찾기" },
  { id: "process", name: "프로세스 관리", icon: "⚙️", order: 5, description: "ps, kill, 백그라운드 작업" },
  { id: "archive", name: "압축과 아카이브", icon: "📦", order: 6, description: "tar, gzip, 백업" },
  { id: "system", name: "시스템과 디스크", icon: "💾", order: 7, description: "df, du, 용량 분석" },
  { id: "triage", name: "초동 점검", icon: "🩺", order: 8, description: "서버 식별, 프로세스, 포트, 증적 수집" },
  { id: "service", name: "서비스와 로그", icon: "🧰", order: 9, description: "서비스 상태, 로그, Nginx, 헬스체크" },
  { id: "network", name: "네트워크", icon: "🌐", order: 10, description: "주소, 경로, 이름 해석, 포트, 방화벽, 패킷" },
  { id: "storage", name: "스토리지와 백업", icon: "🗄️", order: 11, description: "용량, inode, 마운트, 보존정책, rsync" },
  { id: "security", name: "보안과 운영 증적", icon: "🛡️", order: 12, description: "Agent, 권한, 노출 포트, 무결성" },
  { id: "automation", name: "자동화와 유지보수", icon: "🤖", order: 13, description: "cron, 스크립트 검사, 보존정책, 검증 게이트" },
];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function categoryOf(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
