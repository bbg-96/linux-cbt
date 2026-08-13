import { useStore } from "../lib/store";
import { vmService } from "../vm/vmService";

function mb(n: number): string {
  return (n / (1024 * 1024)).toFixed(1);
}

/** VM 부팅/오류 상태를 보여주는 터미널 오버레이 내용. */
export function BootOverlay({ text }: { text?: string }) {
  const vm = useStore(vmService.store);

  if (vm.phase === "error") {
    return (
      <div className="overlay-box">
        <p className="overlay-error">⚠ {vm.error}</p>
        <button className="btn" onClick={() => void vmService.restart()}>
          VM 재시작
        </button>
      </div>
    );
  }

  return (
    <div className="overlay-box">
      <div className="spinner" />
      <p>{text ?? "가상 머신 부팅 중…"}</p>
      {vm.download && (
        <p className="overlay-sub">
          {vm.download.fileName} 다운로드 중 · {mb(vm.download.loaded)} / {mb(vm.download.total)} MB
        </p>
      )}
    </div>
  );
}
