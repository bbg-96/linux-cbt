import type { Check, CheckResult, ExpectSpec } from "./types";
import type { TxOptions, TxResult } from "../vm/serialBus";

/** serialBus가 구현하는 최소 표면 — 테스트와 향후 9p 백엔드 교체를 위한 seam. */
export interface CheckRunner {
  runTransaction(cmd: string, opts?: TxOptions): Promise<TxResult>;
}

/** 작성 규칙: 문제 경로에 작은따옴표를 쓰지 않는다. */
function sq(path: string): string {
  return `'${path}'`;
}

/**
 * ls -ld의 심볼릭 권한(rwxr-xr-x 9자)을 8진수 문자열로 변환한다.
 * setuid/setgid/sticky는 4자리 접두로 표현한다 (예: "4755").
 */
export function symbolicToOctal(perm: string): string | null {
  if (perm.length !== 9) return null;
  let special = 0;
  let base = "";
  for (let i = 0; i < 3; i++) {
    const r = perm[i * 3];
    const w = perm[i * 3 + 1];
    const x = perm[i * 3 + 2];
    let d = 0;
    if (r === "r") d += 4;
    else if (r !== "-") return null;
    if (w === "w") d += 2;
    else if (w !== "-") return null;
    if (x === "x" || x === "s" || x === "t") d += 1;
    else if (x !== "-" && x !== "S" && x !== "T") return null;
    if (i === 0 && (x === "s" || x === "S")) special += 4;
    if (i === 1 && (x === "s" || x === "S")) special += 2;
    if (i === 2 && (x === "t" || x === "T")) special += 1;
    base += String(d);
  }
  return special > 0 ? String(special) + base : base;
}

/** "0744" → "744" 등 선행 0 정규화. */
export function normalizeMode(mode: string): string {
  const m = mode.replace(/^0+(?=\d)/, "");
  return m;
}

function checkExpect(output: string, expect: ExpectSpec | undefined): { ok: boolean; why?: string } {
  if (!expect) return { ok: true };
  if (expect.equals !== undefined && output.trim() !== expect.equals.trim()) {
    return { ok: false, why: "출력이 기대값과 일치하지 않습니다" };
  }
  if (expect.includes !== undefined && !output.includes(expect.includes)) {
    return { ok: false, why: `출력에 "${expect.includes}" 가 없습니다` };
  }
  if (expect.matches !== undefined && !new RegExp(expect.matches, "m").test(output)) {
    return { ok: false, why: "출력이 요구 패턴과 일치하지 않습니다" };
  }
  return { ok: true };
}

/**
 * 시맨틱 체크를 게스트 명령으로 컴파일해 실행하고 호스트 측에서 판정한다.
 * (후속 단계에서 9p 파일시스템 백엔드로 교체 가능 — 문제 데이터는 그대로)
 */
export async function runCheck(check: Check, tx: CheckRunner): Promise<CheckResult> {
  const base = { checkId: check.id, label: check.label };
  const opts: TxOptions = { timeoutMs: check.timeoutMs ?? 5000 };

  try {
    switch (check.type) {
      case "command": {
        const r = await tx.runTransaction(check.cmd, opts);
        if (r.timedOut) return { ...base, status: "timeout", detail: "명령이 제한 시간 안에 끝나지 않았습니다", output: r.output };
        if (r.rc !== 0) return { ...base, status: "fail", detail: `종료 코드 ${r.rc}`, output: r.output };
        const m = checkExpect(r.output, check.expect);
        if (!m.ok) return { ...base, status: "fail", detail: m.why, output: r.output };
        return { ...base, status: "pass", output: r.output };
      }

      case "file_exists": {
        const r = await tx.runTransaction(`test -e ${sq(check.path)}`, opts);
        if (r.timedOut) return { ...base, status: "timeout" };
        if (r.rc !== 0) return { ...base, status: "fail", detail: `${check.path} 가 존재하지 않습니다` };
        return { ...base, status: "pass" };
      }

      case "file_mode": {
        // busybox에 stat이 없어 ls -ld 첫 컬럼을 파싱한다
        const r = await tx.runTransaction(`ls -ld ${sq(check.path)}`, opts);
        if (r.timedOut) return { ...base, status: "timeout" };
        if (r.rc !== 0) return { ...base, status: "fail", detail: `${check.path} 가 존재하지 않습니다`, output: r.output };
        const firstToken = r.output.trim().split(/\s+/)[0] ?? "";
        const actual = symbolicToOctal(firstToken.slice(1, 10));
        if (actual === null) {
          return { ...base, status: "error", detail: "권한 정보를 해석하지 못했습니다", output: r.output };
        }
        const expected = normalizeMode(check.mode);
        if (normalizeMode(actual) !== expected) {
          return { ...base, status: "fail", detail: `권한이 ${actual} (기대: ${expected})`, output: r.output };
        }
        return { ...base, status: "pass" };
      }

      case "file_content": {
        const r = await tx.runTransaction(`cat ${sq(check.path)}`, opts);
        if (r.timedOut) return { ...base, status: "timeout" };
        if (r.rc !== 0) return { ...base, status: "fail", detail: `${check.path} 를 읽을 수 없습니다`, output: r.output };
        const m = checkExpect(r.output, check.expect);
        if (!m.ok) return { ...base, status: "fail", detail: m.why, output: r.output };
        return { ...base, status: "pass", output: r.output };
      }
    }
  } catch (e) {
    return { ...base, status: "error", detail: e instanceof Error ? e.message : String(e) };
  }
}
