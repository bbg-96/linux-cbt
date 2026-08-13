import { Link, useParams } from "react-router-dom";
import { categoryOf } from "../problems/categories";
import { categoryCommands } from "../problems/catalog";
import { useStore } from "../lib/store";
import { progressStore } from "../store/progress";
import { ProblemCard } from "../components/ProblemCard";
import { ProgressBar } from "../components/ProgressBar";
import type { CategoryId } from "../engine/types";

export function CommandPage() {
  const { id, cmd: cmdParam } = useParams();
  const category = id ? categoryOf(id as CategoryId) : undefined;
  const cmd = cmdParam ? decodeURIComponent(cmdParam) : "";
  const progress = useStore(progressStore);
  const group = category ? categoryCommands(category.id).find((g) => g.cmd === cmd) : undefined;

  if (!category || !group) {
    return (
      <div className="list-page">
        <h1>명령어를 찾을 수 없습니다</h1>
        <Link className="btn" to="/">
          개요로
        </Link>
      </div>
    );
  }

  const solved = group.problems.filter((p) => progress.problems[p.id]?.status === "solved").length;

  return (
    <div className="list-page">
      <div className="cat-page-head">
        <span className="cat-icon cat-icon-lg">{category.icon}</span>
        <div className="cat-page-info">
          <h1>
            <code className="cmd-title">{cmd}</code>
          </h1>
          <p className="muted">
            <Link to={`/c/${category.id}`} className="btn-link">
              {category.name}
            </Link>
            에서 <code>{cmd}</code> 를 실습하는 과제
          </p>
          <div className="cat-page-progress">
            <ProgressBar value={solved} max={group.problems.length} />
            <span className="cat-count">
              {solved}/{group.problems.length} 해결
            </span>
          </div>
        </div>
      </div>

      <div className="problem-grid">
        {group.problems.map((p) => (
          <ProblemCard key={p.id} problem={p} progress={progress.problems[p.id]} />
        ))}
      </div>
    </div>
  );
}
