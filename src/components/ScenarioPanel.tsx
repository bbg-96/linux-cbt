import { useEffect, useState } from "react";
import type { Problem } from "../engine/types";
import { recordHint } from "../store/progress";
import { categoryName } from "../problems/categories";
import { RichInline, RichText } from "./RichText";

interface Props {
  problem: Problem;
  solved: boolean;
}

export function ScenarioPanel({ problem, solved }: Props) {
  const [hintsShown, setHintsShown] = useState(0);
  const [hintsCollapsed, setHintsCollapsed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [expCollapsed, setExpCollapsed] = useState(false);

  useEffect(() => {
    setHintsShown(0);
    setHintsCollapsed(false);
    setGaveUp(false);
    setExpCollapsed(false);
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
          <li key={i}>
            <RichInline text={o} />
          </li>
        ))}
      </ul>

      {problem.hints.length > 0 && (
        <div className="hint-box">
          {hintsShown > 0 && hintsCollapsed ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setHintsCollapsed(false)}>
              힌트 다시 보기 ({hintsShown}개 열람됨)
            </button>
          ) : (
            <>
              {problem.hints.slice(0, hintsShown).map((h, i) => (
                <p key={i} className="hint-item">
                  💡 <RichInline text={h} />
                </p>
              ))}
              <div className="hint-actions">
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
                {hintsShown > 0 && (
                  <button className="btn-link" onClick={() => setHintsCollapsed(true)}>
                    힌트 숨기기
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showExplanation ? (
        <div className="explanation">
          <div className="explanation-head">
            <h3 className="sub-heading">{solved ? "해설" : "해설 (포기)"}</h3>
            <button className="btn-link" onClick={() => setExpCollapsed((c) => !c)}>
              {expCollapsed ? "펼치기 ▾" : "접기 ▴"}
            </button>
          </div>
          {!expCollapsed && <RichText text={problem.explanation} />}
        </div>
      ) : (
        <button className="btn-link" onClick={() => setGaveUp(true)}>
          포기하고 해설 보기
        </button>
      )}
    </section>
  );
}
