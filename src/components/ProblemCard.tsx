import { Link } from "react-router-dom";
import type { Problem } from "../engine/types";
import type { ProblemProgress } from "../store/progress";

interface Props {
  problem: Problem;
  progress?: ProblemProgress;
}

function badge(p?: ProblemProgress) {
  if (!p) return <span className="badge badge-none">미시도</span>;
  if (p.status === "solved") return <span className="badge badge-solved">해결</span>;
  return <span className="badge badge-attempted">시도 중</span>;
}

export function ProblemCard({ problem, progress }: Props) {
  return (
    <Link to={`/p/${problem.id}`} className={`problem-card ${progress?.status === "solved" ? "card-solved" : ""}`}>
      <div className="card-top">
        <span className="difficulty">
          {"★".repeat(problem.difficulty)}
          {"☆".repeat(3 - problem.difficulty)}
        </span>
        {badge(progress)}
      </div>
      <h3>{problem.title}</h3>
      <div className="card-tags">
        {(problem.tags ?? []).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {(problem.terminals ?? 1) === 2 && <span className="tag tag-mode">듀얼 터미널</span>}
        {(problem.vms ?? 1) === 2 && <span className="tag tag-mode">2-VM 양단</span>}
      </div>
    </Link>
  );
}
