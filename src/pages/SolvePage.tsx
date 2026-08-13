import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { findProblem } from "../problems";
import { useStore } from "../lib/store";
import { vmService } from "../vm/vmService";
import { problemSession } from "../engine/session";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { BootOverlay } from "../components/BootOverlay";
import { ScenarioPanel } from "../components/ScenarioPanel";
import { GradingPanel } from "../components/GradingPanel";

export function SolvePage() {
  const { id } = useParams();
  const problem = id ? findProblem(id) : undefined;
  const vm = useStore(vmService.store);
  const session = useStore(problemSession.store);

  useEffect(() => {
    if (!problem || vm.phase !== "ready") return;
    if (problemSession.needsSeed(problem)) void problemSession.seed(problem);
  }, [problem, vm.phase, vm.generation]);

  useEffect(() => {
    return () => problemSession.leave();
  }, []);

  if (!problem) {
    return (
      <div className="list-page">
        <h1>문제를 찾을 수 없습니다</h1>
        <Link className="btn" to="/">
          문제 목록으로
        </Link>
      </div>
    );
  }

  const locked = vm.phase !== "ready" || session.phase === "seeding" || session.phase === "grading" || session.phase === "error";

  let overlay;
  if (vm.phase !== "ready") {
    overlay = <BootOverlay />;
  } else if (session.phase === "error") {
    overlay = (
      <div className="overlay-box">
        <p className="overlay-error">⚠ {session.error}</p>
        <div className="grade-actions">
          <button className="btn" onClick={() => problemSession.retry(problem)}>
            다시 시도
          </button>
          <button className="btn btn-secondary" onClick={() => void vmService.restart()}>
            VM 재시작
          </button>
        </div>
      </div>
    );
  } else {
    overlay = (
      <div className="overlay-box">
        <div className="spinner" />
        <p>{session.phase === "grading" ? "채점 중…" : "문제 환경 준비 중…"}</p>
      </div>
    );
  }

  return (
    <div className="solve-page">
      <div className="solve-left">
        <div className="solve-nav">
          <Link to="/" className="btn-link">
            ← 문제 목록
          </Link>
        </div>
        <ScenarioPanel problem={problem} solved={session.phase === "solved"} />
        <GradingPanel problem={problem} />
      </div>
      <div className="solve-right">
        <TerminalPanel locked={locked} overlay={overlay} />
      </div>
    </div>
  );
}
