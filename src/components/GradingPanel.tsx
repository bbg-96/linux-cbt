import { useStore } from "../lib/store";
import { problemSession } from "../engine/session";
import type { Problem } from "../engine/types";
import { CheckResultRow } from "./CheckResultRow";

export function GradingPanel({ problem }: { problem: Problem }) {
  const session = useStore(problemSession.store);
  const active = session.phase === "ready" || session.phase === "solved";
  const grading = session.phase === "grading";

  return (
    <section className="panel">
      <div className="grade-actions">
        <button
          className="btn"
          disabled={!active}
          onClick={() => void problemSession.grade(problem)}
        >
          {grading ? "채점 중…" : "채점하기"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={!active}
          onClick={() => void problemSession.seed(problem)}
          title="작업 디렉터리를 초기 상태로 되돌립니다"
        >
          다시 풀기
        </button>
      </div>

      {session.phase === "solved" && (
        <p className="grade-banner grade-pass">🎉 모든 검사를 통과했습니다!</p>
      )}
      {session.phase === "ready" && session.report && !session.report.passed && (
        <p className="grade-banner grade-fail">
          아직 통과하지 못한 검사가 있어요. 터미널에서 수정한 뒤 다시 채점해 보세요.
        </p>
      )}

      {session.report && (
        <div className="check-list">
          {session.report.results.map((r) => (
            <CheckResultRow key={r.checkId} result={r} />
          ))}
        </div>
      )}
    </section>
  );
}
