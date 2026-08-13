import { Link } from "react-router-dom";
import { CATEGORIES } from "../problems/categories";
import { problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";

export function ProblemListPage() {
  const progress = useStore(progressStore);

  const badge = (id: string) => {
    const p = progress.problems[id];
    if (!p) return <span className="badge badge-none">미시도</span>;
    if (p.status === "solved") return <span className="badge badge-solved">해결</span>;
    return <span className="badge badge-attempted">시도 중</span>;
  };

  const solvedCount = problems.filter((p) => progress.problems[p.id]?.status === "solved").length;

  return (
    <div className="list-page">
      <div className="list-head">
        <h1>문제 목록</h1>
        <p className="muted">
          시나리오를 읽고 터미널에서 직접 해결하세요 · 진행 {solvedCount}/{problems.length}
        </p>
      </div>

      {CATEGORIES.map((cat) => {
        const items = problems.filter((p) => p.category === cat.id);
        if (items.length === 0) return null;
        const solved = items.filter((p) => progress.problems[p.id]?.status === "solved").length;
        return (
          <section key={cat.id} className="cat-section">
            <div className="cat-head">
              <h2>{cat.name}</h2>
              <span className="muted">
                {cat.description} · {solved}/{items.length}
              </span>
            </div>
            <div className="problem-grid">
              {items.map((p) => (
                <Link key={p.id} to={`/p/${p.id}`} className="problem-card">
                  <div className="card-top">
                    <span className="difficulty">
                      {"★".repeat(p.difficulty)}
                      {"☆".repeat(3 - p.difficulty)}
                    </span>
                    {badge(p.id)}
                  </div>
                  <h3>{p.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
