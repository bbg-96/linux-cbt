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
  {
    id: "inspect",
    name: "서버 점검과 분석",
    icon: "🔍",
    order: 1,
    description: "호스트·OS·커널·자원·네트워크 현황 파악과 해석",
  },
];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function categoryOf(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
