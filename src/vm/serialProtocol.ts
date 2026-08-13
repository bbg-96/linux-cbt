// 시리얼 스트림 파싱과 트랜잭션 프로토콜의 순수 로직 (vitest 대상).
// 게스트 tty는 보낸 바이트를 그대로 에코하므로, 마커 문자열이 에코에 온전한
// 형태로 나타나지 않도록 따옴표로 분리해 전송한다. 실제 출력에서만
// `@@B:<nonce>` / `@@E:<nonce>:<rc>`가 연속된 텍스트로 나타난다.

const MAX_PARTIAL = 64 * 1024;

/** 바이트 청크를 UTF-8로 디코드하고 CRLF/CR을 정규화해 완성된 라인 단위로 잘라낸다. */
export class LineAssembler {
  private decoder = new TextDecoder("utf-8");
  private partial = "";
  private pendingCR = false;

  push(bytes: Uint8Array): string[] {
    let text = this.decoder.decode(bytes, { stream: true });
    if (this.pendingCR) {
      text = "\r" + text;
      this.pendingCR = false;
    }
    if (text.endsWith("\r")) {
      // 청크 경계에서 \r\n이 갈라진 경우를 대비해 마지막 CR은 보류
      text = text.slice(0, -1);
      this.pendingCR = true;
    }
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.partial += text;

    const lines: string[] = [];
    let idx: number;
    while ((idx = this.partial.indexOf("\n")) !== -1) {
      lines.push(this.partial.slice(0, idx));
      this.partial = this.partial.slice(idx + 1);
    }
    if (this.partial.length > MAX_PARTIAL) {
      this.partial = this.partial.slice(-MAX_PARTIAL / 2);
    }
    return lines;
  }

  reset(): void {
    this.decoder = new TextDecoder("utf-8");
    this.partial = "";
    this.pendingCR = false;
  }
}

export function makeNonce(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

export function beginTag(nonce: string): string {
  return `@@B:${nonce}`;
}

/** 끝 마커는 개행 없이 끝난 출력 조각이 앞에 붙을 수 있어 접두부를 허용한다. */
export function endRegex(nonce: string): RegExp {
  return new RegExp(`^(.*)@@E:${nonce}:(\\d+)$`);
}

/**
 * 명령을 현재 셸 컨텍스트(서브셸 아님 — cd/export가 유지됨)에서 실행하고
 * stdout+stderr와 종료 코드를 마커 사이에 실어 보내는 한 줄을 만든다.
 */
export function buildTransactionCommand(cmd: string, nonce: string): string {
  const body = cmd.trim().replace(/[;\s]+$/, "");
  return (
    `{ ${body} ; } >/tmp/.__g 2>&1; __r=$?; ` +
    `echo "@@""B:${nonce}"; cat /tmp/.__g; rm -f /tmp/.__g; ` +
    `echo "@@""E:${nonce}:$__r"`
  );
}
