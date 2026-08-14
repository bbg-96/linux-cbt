import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CATEGORIES } from "../problems/categories";
import { findProblem, problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore, type ProblemProgress } from "../store/progress";
import type { Problem } from "../engine/types";

/** 현재 라우트에서 활성 카테고리/문제를 파싱한다. */
function useActiveNodes(): { activeCat: string | null; activeProblem: string | null } {
  const location = useLocation();
  const mCat = location.pathname.match(/^\/c\/([^/]+)/);
  if (mCat) return { activeCat: mCat[1], activeProblem: null };
  const mProb = location.pathname.match(/^\/p\/([^/]+)/);
  if (mProb) {
    const id = decodeURIComponent(mProb[1]);
    const p = findProblem(id);
    if (p) return { activeCat: p.category, activeProblem: p.id };
  }
  return { activeCat: null, activeProblem: null };
}

/** 문제 노드 앞의 상태 표식 — 해결 ✓ / 시도 중 ● / 미시작 (빈 자리) */
function statusMark(st: ProblemProgress | undefined): { glyph: string; cls: string } {
  if (st?.status === "solved") return { glyph: "✓", cls: "side-prob-solved" };
  if (st?.status === "attempted") return { glyph: "●", cls: "side-prob-attempted" };
  return { glyph: "", cls: "" };
}

export function CatalogSidebar() {
  const progress = useStore(progressStore);
  const { activeCat, activeProblem } = useActiveNodes();
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const isSolved = (p: Problem) => progress.problems[p.id]?.status === "solved";
  // 기본은 모두 펼침 — 트리의 목적이 "문제로 바로 가기"라 접혀 있으면 두 번 클릭해야 한다.
  // 사용자가 접은 카테고리는 그 선택을 기억한다(현재 보고 있는 문제의 카테고리는 예외로 항상 펼침).
  const isExpanded = (catId: string) => (catId === activeCat ? true : (manual[catId] ?? true));

  // 문제가 없는 카테고리는 트리에서 감춘다 (트랙별로 쓰는 카테고리가 다르다)
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
        const catActive = cat.id === activeCat && !activeProblem;
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
              <div className="side-probs">
                {items.map((p) => {
                  const mark = statusMark(progress.problems[p.id]);
                  return (
                    <Link
                      key={p.id}
                      className={`side-prob ${p.id === activeProblem ? "side-active" : ""}`}
                      to={`/p/${p.id}`}
                      title={p.title}
                    >
                      <span className={`side-prob-mark ${mark.cls}`}>{mark.glyph}</span>
                      <span className="side-prob-name">{p.title}</span>
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
