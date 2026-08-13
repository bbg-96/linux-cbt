import { useCallback, useSyncExternalStore } from "react";

/** matchMedia 구독 훅 — 리사이즈/기기 회전에 반응한다. */
export function useMediaQuery(query: string): boolean {
  // subscribe 참조가 렌더마다 바뀌면 리스너가 매번 재등록되며 변경 이벤트를
  // 놓칠 수 있다 — query 기준으로 안정화한다.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const MOBILE_QUERY = "(max-width: 768px)";
export const TOUCH_QUERY = "(pointer: coarse)";
