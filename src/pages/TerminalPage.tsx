import { useStore } from "../lib/store";
import { vmService } from "../vm/vmService";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { BootOverlay } from "../components/BootOverlay";

const PHASE_LABEL: Record<string, string> = {
  idle: "대기",
  booting: "부팅 중…",
  ready: "준비됨",
  error: "오류",
};

/** 자유 연습용(및 개발 검증용) 전체 화면 터미널. */
export function TerminalPage() {
  const vm = useStore(vmService.store);
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
      <TerminalPanel locked={vm.phase !== "ready"} overlay={<BootOverlay />} />
    </div>
  );
}
