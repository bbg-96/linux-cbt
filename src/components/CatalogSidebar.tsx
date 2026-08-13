import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CATEGORIES } from "../problems/categories";
import { categoryCommands } from "../problems/catalog";
import { findProblem, problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";
import type { Problem } from "../engine/types";

/** 현재 라우트에서 활성 카테고리/명령어를 파싱한다. */
function useActiveNodes(): { activeCat: string | null; activeCmd: string | null } {
  const location = useLocation();
  const mCat = location.pathname.match(/^\/c\/([^/]+)(?:\/k\/([^/]+))?/);
  if (mCat) {
    return { activeCat: mCat[1], activeCmd: mCat[2] ? decodeURIComponent(mCat[2]) : null };
  }
  const mProb = location.pathname.match(/^\/p\/([^/]+)/);
  if (mProb) {
    const p = findProblem(decodeURIComponent(mProb[1]));
    if (p) return { activeCat: p.category, activeCmd: null };
  }
  return { activeCat: null, activeCmd: null };
}

export function CatalogSidebar() {
  const progress = useStore(progressStore);
  const { activeCat, activeCmd } = useActiveNodes();
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const isSolved = (p: Problem) => progress.problems[p.id]?.status === "solved";
  const isExpanded = (catId: string) => manual[catId] ?? catId === activeCat;

  // 문제가 없는 카테고리는 트리에서 감춘다 (스테이징처럼 일부만 등록된 경우 대비)
  const visibleCategories = CATEGORIES.filter((cat) => problems.some((p) => p.category === cat.id));

  if (visibleCategories.length === 0) {
    return (
      <aside className="sidebar">
        <p className="side-empty muted">등록된 문제가 없습니다.</p>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      {visibleCategories.map((cat) => {
        const items = problems.filter((p) => p.category === cat.id);
        const solved = items.filter(isSolved).length;
        const expanded = isExpanded(cat.id);
        const catActive = cat.id === activeCat && !activeCmd;
        return (
          <div key={cat.id} className="side-cat">
            <div className={`side-cat-row ${catActive ? "side-active" : ""}`}>
              <button
                className="side-chevron"
                onClick={() => setManual((m) => ({ ...m, [cat.id]: !expanded }))}
                aria-label={expanded ? "접기" : "펼치기"}
              >
                {expanded ? "▾" : "▸"}
              </button>
              <Link className="side-cat-link" to={`/c/${cat.id}`}>
                <span className="side-icon">{cat.icon}</span>
                <span className="side-name">{cat.name}</span>
                <span className={`side-count ${solved === items.length ? "side-count-done" : ""}`}>
                  {solved}/{items.length}
                </span>
              </Link>
            </div>
            {expanded && (
              <div className="side-cmds">
                {categoryCommands(cat.id).map(({ cmd, problems: ps }) => {
                  const cmdSolved = ps.filter(isSolved).length;
                  const active = cat.id === activeCat && cmd === activeCmd;
                  return (
                    <Link
                      key={cmd}
                      className={`side-cmd ${active ? "side-active" : ""}`}
                      to={`/c/${cat.id}/k/${encodeURIComponent(cmd)}`}
                    >
                      <span className="side-cmd-name">{cmd}</span>
                      <span className={`side-count ${cmdSolved === ps.length ? "side-count-done" : ""}`}>
                        {cmdSolved}/{ps.length}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
