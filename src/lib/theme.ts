/**
 * 라이트/다크 테마. 기본은 다크(사이트 정체성이 터미널)이고, 선택은 localStorage에
 * 남는다. 터미널 창·코드 블록은 테마와 무관하게 항상 다크다 — IDE들이 라이트
 * 테마에서도 터미널을 어둡게 두는 것과 같은 이유(실터미널 정체성 + 가독성).
 */
export type Theme = "dark" | "light";

const KEY = "cbt-theme";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 프라이빗 모드 등 — 적용만 하고 저장은 포기
  }
}

/** 렌더 전에 호출 — 저장된 테마를 즉시 반영해 흰 화면 번쩍임을 막는다 */
export function initTheme(): void {
  document.documentElement.dataset.theme = getTheme();
}
