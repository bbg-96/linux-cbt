import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CatalogSidebar } from "./CatalogSidebar";

/**
 * 헤더 + 접이식 카탈로그 사이드바 + 메인(<Outlet/>).
 * 풀이 화면(/p/*) 진입 시 자동으로 접고, 탐색 화면 복귀 시 자동으로 편다.
 * 수동 토글(☰)은 다음 화면 유형 전환 전까지 우선한다.
 */
export function CatalogLayout() {
  const location = useLocation();
  const isSolve = location.pathname.startsWith("/p/");
  const [open, setOpen] = useState(!isSolve);

  useEffect(() => {
    setOpen(!isSolve);
  }, [isSolve]);

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
      </header>
      <div className="app-body">
        {open && <CatalogSidebar />}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
