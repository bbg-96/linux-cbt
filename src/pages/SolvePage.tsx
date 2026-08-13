import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findProblem, problems } from "../problems";
import { categoryName } from "../problems/categories";
import { useStore } from "../lib/store";
import { vmService } from "../vm/vmService";
import { problemSession } from "../engine/session";
import { recordVisit } from "../store/progress";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { BootOverlay } from "../components/BootOverlay";
import { ScenarioPanel } from "../components/ScenarioPanel";
import { GradingPanel } from "../components/GradingPanel";

export function SolvePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const problem = id ? findProblem(id) : undefined;
  const vm = useStore(vmService.store);
  const bVm = useStore(vmService.bStore);
  const session = useStore(problemSession.store);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (problem) recordVisit(problem.id);
  }, [problem?.id]);

  useEffect(() => {
    if (!problem || vm.phase !== "ready") return;
    if (problemSession.needsSeed(problem)) void problemSession.seed(problem);
  }, [problem, vm.phase, vm.generation, bVm.phase, bVm.generation]);

  useEffect(() => {
    return () => problemSession.leave();
  }, []);

  if (!problem) {
    return (
      <div className="list-page">
        <h1>문제를 찾을 수 없습니다</h1>
        <Link className="btn" to="/">
          대시보드로
        </Link>
      </div>
    );
  }

  // 카테고리 내 이전/다음
  const siblings = problems.filter((p) => p.category === problem.category);
  const idx = siblings.findIndex((p) => p.id === problem.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const twoTerms = (problem.terminals ?? 1) === 2;
  const twoVms = (problem.vms ?? 1) === 2;
  const locked =
    vm.phase !== "ready" || session.phase === "seeding" || session.phase === "grading" || session.phase === "error";

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

  const bOverlay =
    bVm.phase !== "ready" ? (
      <BootOverlay
        store={vmService.bStore}
        text="두 번째 VM(Host B) 부팅 중… (최초 1회)"
        onRestart={() => void vmService.restartB()}
      />
    ) : (
      overlay
    );

  return (
    <div className="solve-page">
      <div className="solve-topbar">
        <Link to={`/c/${problem.category}`} className="btn-link">
          ← {categoryName(problem.category)}
        </Link>
        <span className="topbar-title">{problem.title}</span>
        <div className="topbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            disabled={!prev}
            onClick={() => prev && navigate(`/p/${prev.id}`)}
          >
            ← 이전
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={!next}
            onClick={() => next && navigate(`/p/${next.id}`)}
          >
            다음 →
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? "📋 문제 정보" : "⛶ 터미널 확대"}
          </button>
        </div>
      </div>

      <div className="solve-body">
        {!collapsed && (
          <div className="solve-left">
            <ScenarioPanel problem={problem} solved={session.phase === "solved"} />
            <GradingPanel problem={problem} />
          </div>
        )}
        <div className="solve-right">
          {twoTerms ? (
            <div className="term-stack">
              <TerminalPanel channel="a0" title="터미널 ① — 명령 실행" locked={locked} overlay={overlay} />
              <TerminalPanel channel="a1" title="터미널 ② — 실시간 관찰" locked={locked} overlay={overlay} />
            </div>
          ) : twoVms ? (
            <div className="term-stack">
              <TerminalPanel channel="a0" title="Host A" locked={locked} overlay={overlay} />
              <TerminalPanel
                channel="b0"
                title="Host B"
                titleExtra={
                  <button className="btn-link" onClick={() => void vmService.restartB()}>
                    VM B 재시작
                  </button>
                }
                locked={locked || bVm.phase !== "ready"}
                overlay={bOverlay}
              />
            </div>
          ) : (
            <TerminalPanel locked={locked} overlay={overlay} />
          )}
        </div>
      </div>
    </div>
  );
}
