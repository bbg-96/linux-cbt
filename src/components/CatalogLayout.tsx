import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CatalogSidebar } from "./CatalogSidebar";
import { MOBILE_QUERY, useMediaQuery } from "../lib/useMediaQuery";
import { applyTheme, getTheme, type Theme } from "../lib/theme";

/**
 * 헤더 + 접이식 카탈로그 사이드바 + 메인(<Outlet/>).
 * 데스크톱: 풀이 화면(/p/*) 진입 시 자동으로 접고, 탐색 화면 복귀 시 자동으로 편다.
 * 모바일: 오버레이 드로어 — 기본 닫힘, 이동할 때마다 닫힘, 백드롭 탭으로 닫기.
 */
export function CatalogLayout() {
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isSolve = location.pathname.startsWith("/p/");
  const [open, setOpen] = useState(!isSolve && !isMobile);
  const [theme, setTheme] = useState<Theme>(getTheme);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  useEffect(() => {
    setOpen(isMobile ? false : !isSolve);
  }, [isSolve, isMobile]);

  // 모바일: 라우트가 바뀌면(트리에서 이동) 드로어를 닫는다
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="app">
      <header className="app-header">
        <button className="hamburger" onClick={() => setOpen((o) => !o)} title="카탈로그 메뉴">
          ☰
        </button>
        <Link to="/" className="brand">
          🐧 리눅스 실습 CBT
        </Link>
        <nav className="app-nav">
          <Link to="/terminal">터미널</Link>
        </nav>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>
      <div className="app-body">
        {open && isMobile && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
        {open && <CatalogSidebar />}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
