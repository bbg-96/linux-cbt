import type { CategoryId } from "../engine/types";

export interface Category {
  id: CategoryId;
  name: string;
  order: number;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "files", name: "파일과 디렉터리", order: 1, description: "탐색, 생성, 복사, 이동, 삭제, 링크" },
  { id: "permissions", name: "권한 관리", order: 2, description: "chmod, chown, 소유권과 접근 제어" },
  { id: "text", name: "텍스트 처리와 파이프", order: 3, description: "grep, sed, 파이프, 리다이렉션" },
  { id: "process", name: "프로세스 관리", order: 4, description: "ps, kill, 백그라운드 작업" },
  { id: "archive", name: "압축과 아카이브", order: 5, description: "tar, gzip, 백업" },
];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
