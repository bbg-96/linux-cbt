import type { CategoryId } from "../engine/types";

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  order: number;
  description: string;
}

/** 문제가 없는 카테고리는 대시보드·사이드바에서 자동으로 숨겨진다. */
export const CATEGORIES: Category[] = [
  { id: "files", name: "파일과 디렉터리", icon: "📁", order: 1, description: "탐색, 생성, 복사, 이동, 삭제, 링크" },
  { id: "permissions", name: "권한 관리", icon: "🔐", order: 2, description: "chmod, chown, 소유권과 접근 제어" },
  { id: "text", name: "텍스트 처리와 파이프", icon: "📝", order: 3, description: "grep, sed, awk, 파이프, 리다이렉션" },
  { id: "search", name: "파일 검색", icon: "🔎", order: 4, description: "find, ripgrep으로 원하는 것 찾기" },
  { id: "process", name: "프로세스 관리", icon: "⚙️", order: 5, description: "ps, kill, 백그라운드 작업" },
  { id: "archive", name: "압축과 아카이브", icon: "📦", order: 6, description: "tar, gzip, 백업" },
  { id: "system", name: "시스템과 디스크", icon: "💾", order: 7, description: "df, du, 용량 분석" },
  { id: "network", name: "네트워크", icon: "🌐", order: 8, description: "ip, route, ping, iptables, tcpdump, nc" },
  {
    id: "inspect",
    name: "서버 점검과 분석",
    icon: "🔍",
    order: 9,
    description: "호스트·OS·커널·자원·디스크 현황 파악과 해석",
  },
];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function categoryOf(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
