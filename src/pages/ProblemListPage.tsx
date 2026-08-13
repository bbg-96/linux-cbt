import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../problems/categories";
import { problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";
import type { Problem } from "../engine/types";

type Filter = "all" | "unsolved" | "wrong";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unsolved", label: "미해결" },
  { key: "wrong", label: "오답 (시도 중)" },
];

export function ProblemListPage() {
  const progress = useStore(progressStore);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = (p: Problem) => {
    const st = progress.problems[p.id];
    if (filter === "unsolved") return st?.status !== "solved";
    if (filter === "wrong") return st?.status === "attempted";
    return true;
  };

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
        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip-btn ${filter === f.key ? "chip-btn-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const items = problems.filter((p) => p.category === cat.id).filter(visible);
        if (items.length === 0) return null;
        const all = problems.filter((p) => p.category === cat.id);
        const solved = all.filter((p) => progress.problems[p.id]?.status === "solved").length;
        return (
          <section key={cat.id} className="cat-section">
            <div className="cat-head">
              <h2>{cat.name}</h2>
              <span className="muted">
                {cat.description} · {solved}/{all.length}
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

      {filter !== "all" && problems.filter(visible).length === 0 && (
        <p className="muted">해당하는 문제가 없습니다. 🎉</p>
      )}
    </div>
  );
}
