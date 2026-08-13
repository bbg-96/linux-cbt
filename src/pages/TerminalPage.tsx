import { useEffect } from "react";
import { useStore } from "../lib/store";
import { vmService } from "../vm/vmService";
import { TerminalWorkspace } from "../terminal/TerminalWorkspace";
import { termWorkspace } from "../terminal/workspace";
import { BootOverlay } from "../components/BootOverlay";

const PHASE_LABEL: Record<string, string> = {
  idle: "대기",
  booting: "부팅 중…",
  ready: "준비됨",
  error: "오류",
};

/** 자유 연습용(및 개발 검증용) 전체 화면 터미널. 세션 복제도 그대로 지원한다. */
export function TerminalPage() {
  const vm = useStore(vmService.store);

  useEffect(() => {
    termWorkspace.configureFree();
  }, [vm.generation]);

  return (
    <div className="terminal-page">
      <div className="page-toolbar">
        <h1>연습 터미널</h1>
        <span className={`chip chip-${vm.phase}`}>{PHASE_LABEL[vm.phase]}</span>
        <div className="toolbar-spacer" />
        <button className="btn btn-secondary" onClick={() => void vmService.restart()}>
          VM 재시작
        </button>
      </div>
      <TerminalWorkspace lockedA={vm.phase !== "ready"} overlayA={<BootOverlay />} />
    </div>
  );
}
