import { Link } from "react-router-dom";
import { CATEGORIES } from "../problems/categories";
import { findProblem, problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";
import { ProgressBar } from "../components/ProgressBar";
import type { Problem } from "../engine/types";

/** 이어서 풀기 대상: 마지막 방문 문제(미해결이면) → 아니면 커리큘럼 순서상 첫 미해결. */
function continueTarget(
  lastId: string | undefined,
  solved: (id: string) => boolean,
): Problem | null {
  if (lastId) {
    const last = findProblem(lastId);
    if (last && !solved(last.id)) return last;
  }
  return problems.find((p) => !solved(p.id)) ?? null;
}

export function DashboardPage() {
  const progress = useStore(progressStore);
  const isSolved = (id: string) => progress.problems[id]?.status === "solved";
  const solvedCount = problems.filter((p) => isSolved(p.id)).length;
  const attemptedCount = problems.filter((p) => progress.problems[p.id]?.status === "attempted").length;
  const next = continueTarget(progress.lastProblemId, isSolved);
  const empty = problems.length === 0;

  if (empty) {
    return (
      <div className="dash-page">
        <section className="dash-hero">
          <div className="dash-hero-info">
            <h1>등록된 문제가 없습니다</h1>
            <p className="muted">
              선별한 문제가 등록되면 여기에 표시됩니다. 그동안 상단의{" "}
              <Link to="/terminal">터미널</Link>에서 자유롭게 리눅스를 연습할 수 있습니다.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <section className="dash-hero">
        <div className="dash-hero-info">
          <h1>학습 현황</h1>
          <p className="dash-count">
            <strong>{solvedCount}</strong>
            <span className="muted"> / {problems.length} 문제 해결</span>
          </p>
          <ProgressBar value={solvedCount} max={problems.length} />
          {attemptedCount > 0 && (
            <p className="dash-attempted muted">시도 중인 문제 {attemptedCount}개 — 카테고리에서 이어가 보세요</p>
          )}
        </div>
        <div className="dash-hero-action">
          {next ? (
            <Link className="btn btn-lg" to={`/p/${next.id}`}>
              이어서 풀기 →
              <span className="btn-sub">{next.title}</span>
            </Link>
          ) : (
            <p className="dash-complete">🎉 모든 문제를 해결했습니다!</p>
          )}
        </div>
      </section>

      <div className="cat-grid">
        {CATEGORIES.filter((cat) => problems.some((p) => p.category === cat.id)).map((cat) => {
          const items = problems.filter((p) => p.category === cat.id);
          const solved = items.filter((p) => isSolved(p.id)).length;
          const done = items.length > 0 && solved === items.length;
          return (
            <Link key={cat.id} to={`/c/${cat.id}`} className={`cat-card ${done ? "cat-done" : ""}`}>
              <div className="cat-card-head">
                <span className="cat-icon">{cat.icon}</span>
                {done && <span className="cat-check">완료 ✓</span>}
              </div>
              <h2>{cat.name}</h2>
              <p className="muted">{cat.description}</p>
              <div className="cat-card-foot">
                <ProgressBar value={solved} max={items.length} />
                <span className="cat-count">
                  {solved}/{items.length}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
