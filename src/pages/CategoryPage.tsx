import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoryOf } from "../problems/categories";
import { problems } from "../problems";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";
import { ProblemCard } from "../components/ProblemCard";
import { ProgressBar } from "../components/ProgressBar";
import type { CategoryId, Problem } from "../engine/types";

type Filter = "all" | "unsolved" | "wrong";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unsolved", label: "미해결" },
  { key: "wrong", label: "오답 (시도 중)" },
];

export function CategoryPage() {
  const { id } = useParams();
  const category = id ? categoryOf(id as CategoryId) : undefined;
  const progress = useStore(progressStore);
  const [filter, setFilter] = useState<Filter>("all");

  if (!category) {
    return (
      <div className="list-page">
        <h1>카테고리를 찾을 수 없습니다</h1>
        <Link className="btn" to="/">
          대시보드로
        </Link>
      </div>
    );
  }

  const items = problems.filter((p) => p.category === category.id);
  const solved = items.filter((p) => progress.problems[p.id]?.status === "solved").length;

  const visible = (p: Problem) => {
    const st = progress.problems[p.id];
    if (filter === "unsolved") return st?.status !== "solved";
    if (filter === "wrong") return st?.status === "attempted";
    return true;
  };
  const shown = items.filter(visible);

  return (
    <div className="list-page">
      <div className="solve-nav">
        <Link to="/" className="btn-link">
          ← 대시보드
        </Link>
      </div>
      <div className="cat-page-head">
        <span className="cat-icon cat-icon-lg">{category.icon}</span>
        <div className="cat-page-info">
          <h1>{category.name}</h1>
          <p className="muted">{category.description}</p>
          <div className="cat-page-progress">
            <ProgressBar value={solved} max={items.length} />
            <span className="cat-count">
              {solved}/{items.length} 해결
            </span>
          </div>
        </div>
      </div>

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

      <div className="problem-grid">
        {shown.map((p) => (
          <ProblemCard key={p.id} problem={p} progress={progress.problems[p.id]} />
        ))}
      </div>
      {shown.length === 0 && <p className="muted">해당하는 문제가 없습니다. 🎉</p>}
    </div>
  );
}
