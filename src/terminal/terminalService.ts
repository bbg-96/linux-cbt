import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { serialBus } from "../vm/serialBus";

/**
 * xterm 인스턴스는 앱 수명 동안 딱 하나. React 밖에서 생성해
 * 라우트 이동/StrictMode 이중 마운트에도 스크롤백이 유지된다.
 */
class TerminalService {
  readonly term: Terminal;
  private fit = new FitAddon();
  private opened = false;

  constructor() {
    this.term = new Terminal({
      fontSize: 14,
      fontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
      cursorBlink: true,
      scrollback: 4000,
      theme: {
        background: "#0d1117",
        foreground: "#d4dae2",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#484f58",
        brightBlack: "#6e7681",
      },
    });
    this.term.loadAddon(this.fit);
    this.term.onData((d) => serialBus.userInput(d));
    serialBus.onDisplay((chunk) => this.term.write(chunk));
  }

  attachTo(el: HTMLElement): void {
    if (!this.opened) {
      this.term.open(el);
      this.opened = true;
    } else if (this.term.element && this.term.element.parentElement !== el) {
      el.appendChild(this.term.element);
    }
    this.fitNow();
  }

  fitNow(): void {
    try {
      this.fit.fit();
    } catch {
      // 컨테이너가 아직 레이아웃되지 않았으면 무시
    }
  }

  getSize(): { cols: number; rows: number } {
    return { cols: this.term.cols, rows: this.term.rows };
  }

  /** 화면과 스크롤백을 완전히 비운다 (셋업 출력 은닉 후 등). */
  resetScreen(): void {
    this.term.reset();
  }

  /** 게스트를 거치지 않는 클라이언트 측 구분선. */
  writeDivider(text: string): void {
    this.term.write(`\r\n\x1b[90m── ${text} ──\x1b[0m\r\n`);
  }
}

export const terminalService = new TerminalService();
