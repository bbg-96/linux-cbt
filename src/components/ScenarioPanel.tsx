import { useEffect, useState } from "react";
import type { Problem } from "../engine/types";
import { recordHint } from "../store/progress";
import { categoryName } from "../problems/categories";

interface Props {
  problem: Problem;
  solved: boolean;
}

export function ScenarioPanel({ problem, solved }: Props) {
  const [hintsShown, setHintsShown] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    setHintsShown(0);
    setGaveUp(false);
  }, [problem.id]);

  const showExplanation = solved || gaveUp;

  return (
    <section className="panel">
      <div className="problem-head">
        <span className="cat-tag">{categoryName(problem.category)}</span>
        <span className="difficulty">{"★".repeat(problem.difficulty)}{"☆".repeat(3 - problem.difficulty)}</span>
      </div>
      <h2 className="problem-title">{problem.title}</h2>
      <p className="scenario-text">{problem.scenario}</p>

      <h3 className="sub-heading">목표</h3>
      <ul className="objective-list">
        {problem.objectives.map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ul>

      {problem.hints.length > 0 && (
        <div className="hint-box">
          {problem.hints.slice(0, hintsShown).map((h, i) => (
            <p key={i} className="hint-item">
              💡 {h}
            </p>
          ))}
          {hintsShown < problem.hints.length && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setHintsShown((n) => n + 1);
                recordHint(problem.id);
              }}
            >
              힌트 보기 ({hintsShown + 1}/{problem.hints.length})
            </button>
          )}
        </div>
      )}

      {showExplanation ? (
        <div className="explanation">
          <h3 className="sub-heading">{solved ? "해설" : "해설 (포기)"}</h3>
          <pre className="explanation-text">{problem.explanation}</pre>
        </div>
      ) : (
        <button className="btn-link" onClick={() => setGaveUp(true)}>
          포기하고 해설 보기
        </button>
      )}
    </section>
  );
}
