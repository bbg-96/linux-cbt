import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { serialChannels, type ChannelId } from "../vm/serialBus";
import type { SerialChannel } from "../vm/serialChannel";

/**
 * xterm 인스턴스는 채널당 딱 하나. React 밖에서 생성해
 * 라우트 이동/StrictMode 이중 마운트에도 스크롤백이 유지된다.
 */
export class TerminalInstance {
  readonly term: Terminal;
  private fit = new FitAddon();
  private opened = false;

  constructor(channel: SerialChannel) {
    // Windows Terminal 'Campbell' 팔레트 — 실제 콘솔과 같은 색감.
    // blue만 원본(#0037da)이 검정 배경에서 안 읽혀 브라이트 값으로 올렸다.
    this.term = new Terminal({
      fontSize: 14,
      fontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 4000,
      theme: {
        background: "#0c0c0c",
        foreground: "#cccccc",
        cursor: "#ffffff",
        cursorAccent: "#0c0c0c",
        selectionBackground: "#264f78",
        black: "#0c0c0c",
        red: "#c50f1f",
        green: "#13a10e",
        yellow: "#c19c00",
        blue: "#3b78ff",
        magenta: "#881798",
        cyan: "#3a96dd",
        white: "#cccccc",
        brightBlack: "#767676",
        brightRed: "#e74856",
        brightGreen: "#16c60c",
        brightYellow: "#f9f1a5",
        brightBlue: "#3b78ff",
        brightMagenta: "#b4009e",
        brightCyan: "#61d6d6",
        brightWhite: "#f2f2f2",
      },
    });
    this.term.loadAddon(this.fit);
    this.term.onData((d) => channel.userInput(d));
    channel.onDisplay((chunk) => this.term.write(chunk));
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

export const terminals: Record<ChannelId, TerminalInstance> = {
  a0: new TerminalInstance(serialChannels.a0),
  a1: new TerminalInstance(serialChannels.a1),
  b0: new TerminalInstance(serialChannels.b0),
  b1: new TerminalInstance(serialChannels.b1),
};

/** 호환 별칭 — 메인 터미널(①). */
export const terminalService = terminals.a0;
