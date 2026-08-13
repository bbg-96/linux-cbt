import type { CheckResult } from "../engine/types";

const ICON: Record<CheckResult["status"], string> = {
  pass: "✓",
  fail: "✗",
  timeout: "⏱",
  error: "!",
};

export function CheckResultRow({ result }: { result: CheckResult }) {
  const failed = result.status !== "pass";
  return (
    <div className={`check-row check-${result.status}`}>
      <div className="check-line">
        <span className="check-icon">{ICON[result.status]}</span>
        <span className="check-label">{result.label}</span>
      </div>
      {failed && result.detail && <p className="check-detail">{result.detail}</p>}
      {failed && result.output && result.output.trim() !== "" && (
        <details className="check-output">
          <summary>캡처된 출력 보기</summary>
          <pre>{result.output}</pre>
        </details>
      )}
    </div>
  );
}
