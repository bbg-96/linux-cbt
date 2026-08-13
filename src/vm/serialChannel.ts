import type { V86 } from "v86";
import { LineAssembler, beginTag, buildTransactionCommand, endRegex, makeNonce } from "./serialProtocol";

export interface TxResult {
  rc: number;
  output: string;
  timedOut: boolean;
}

export interface TxOptions {
  timeoutMs?: number;
}

const MAX_OUT_LINES = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type SerialOutEvent = "serial0-output-byte" | "serial1-output-byte";

/**
 * v86 시리얼 포트 하나에 대한 단일 진입점 (VM×포트당 1개).
 * - 모든 출력 바이트는 항상 라인 파서를 거친다 (트랜잭션 매칭용).
 * - display 게이트가 켜진 바이트만 xterm으로 전달된다 (셋업/채점 출력 은닉).
 * - input 게이트가 켜졌을 때만 사용자 타이핑이 게스트로 전달된다.
 * - 트랜잭션은 큐로 직렬화되어 게스트 tty 입력 버퍼를 넘치지 않는다.
 */
export class SerialChannel {
  private emulator: V86 | null = null;
  private assembler = new LineAssembler();
  private lineListeners = new Set<(line: string) => void>();
  private displayListeners = new Set<(data: Uint8Array) => void>();
  private displayEnabled = true;
  private inputEnabled = false;
  private dispBuf: number[] = [];
  private flushScheduled = false;
  private queue: Promise<unknown> = Promise.resolve();
  private lastOutputAt = 0;
  private encoder = new TextEncoder();
  private readonly byteListener = (b: number) => this.onByte(b);
  private readonly outEvent: SerialOutEvent;

  constructor(private readonly port: 0 | 1) {
    this.outEvent = `serial${port}-output-byte`;
  }

  attach(emulator: V86): void {
    this.detach();
    this.emulator = emulator;
    this.assembler.reset();
    this.lastOutputAt = 0;
    emulator.add_listener(this.outEvent, this.byteListener);
  }

  detach(): void {
    if (this.emulator) {
      this.emulator.remove_listener(this.outEvent, this.byteListener);
      this.emulator = null;
    }
  }

  get attached(): boolean {
    return this.emulator !== null;
  }

  setGates(gates: { display?: boolean; input?: boolean }): void {
    if (gates.display !== undefined) this.displayEnabled = gates.display;
    if (gates.input !== undefined) this.inputEnabled = gates.input;
  }

  onDisplay(fn: (data: Uint8Array) => void): () => void {
    this.displayListeners.add(fn);
    return () => this.displayListeners.delete(fn);
  }

  /** xterm onData → 게스트. 잠금 중에는 조용히 버린다 (큐에 쌓으면 나중에 실행되어 위험). */
  userInput(data: string): void {
    if (this.inputEnabled) this.sendRaw(data);
  }

  sendRaw(data: string): void {
    if (!this.emulator) return;
    if (this.port === 0) {
      this.emulator.serial0_send(data);
    } else {
      this.emulator.serial_send_bytes(this.port, this.encoder.encode(data));
    }
  }

  private onByte(b: number): void {
    this.lastOutputAt = Date.now();
    for (const line of this.assembler.push(Uint8Array.of(b))) {
      for (const l of [...this.lineListeners]) l(line);
    }
    if (this.displayEnabled) {
      this.dispBuf.push(b);
      if (!this.flushScheduled) {
        this.flushScheduled = true;
        setTimeout(() => this.flushDisplay(), 8);
      }
    }
  }

  private flushDisplay(): void {
    this.flushScheduled = false;
    if (this.dispBuf.length === 0) return;
    const chunk = Uint8Array.from(this.dispBuf);
    this.dispBuf.length = 0;
    for (const fn of [...this.displayListeners]) fn(chunk);
  }

  /** 명령 하나를 게스트 셸에서 실행하고 { 종료코드, 출력 }을 받는다. */
  runTransaction(cmd: string, opts: TxOptions = {}): Promise<TxResult> {
    const exec = () => this.execTransaction(cmd, opts.timeoutMs ?? 5000);
    const p = this.queue.then(exec, exec);
    this.queue = p.catch(() => {});
    return p;
  }

  private execTransaction(cmd: string, timeoutMs: number): Promise<TxResult> {
    if (!this.emulator) {
      return Promise.resolve({ rc: -1, output: "VM not running", timedOut: false });
    }
    return new Promise<TxResult>((resolve) => {
      const nonce = makeNonce();
      const begin = beginTag(nonce);
      const end = endRegex(nonce);
      let collecting = false;
      let truncated = false;
      const out: string[] = [];
      const pushOut = (l: string) => {
        if (out.length < MAX_OUT_LINES) out.push(l);
        else truncated = true;
      };
      const finish = (res: TxResult) => {
        this.lineListeners.delete(onLine);
        clearTimeout(timer);
        resolve(res);
      };
      const onLine = (line: string) => {
        if (!collecting) {
          if (line.endsWith(begin)) collecting = true;
          return;
        }
        const m = end.exec(line);
        if (m) {
          if (m[1]) pushOut(m[1]);
          finish({
            rc: Number(m[2]),
            output: out.join("\n") + (truncated ? "\n…(output truncated)" : ""),
            timedOut: false,
          });
        } else {
          pushOut(line);
        }
      };
      const timer = setTimeout(() => {
        finish({ rc: -1, output: out.join("\n"), timedOut: true });
        // 걸려 있는 명령(sleep 등)을 끊어 셸을 되살린다
        this.sendRaw("\x03");
      }, timeoutMs);
      this.lineListeners.add(onLine);
      this.sendRaw(buildTransactionCommand(cmd, nonce) + "\n");
    });
  }

  /**
   * 직전 명령의 후행 프롬프트가 도착할 때까지 기다린다 (표시 게이트를 열기 전 호출).
   *
   * 트랜잭션은 END 마커 라인을 파싱한 순간 resolve되지만 셸의 프롬프트는 그 뒤에
   * 온다. 도착 지연은 게스트 부하에 따라 10ms~수백 ms로 크게 흔들리므로 고정 대기로는
   * 잡을 수 없다. 프롬프트는 개행으로 끝나지 않아 라인 조립기의 '미완성 라인'에
   * 남는다는 성질을 신호로 삼으면 타이밍과 무관하게 확정적으로 판정할 수 있다.
   * (이걸 흘려보내지 않고 게이트를 열면 그 프롬프트 + 우리가 보내는 개행의 프롬프트가
   *  겹쳐 명령 시작줄이 두 줄로 보인다.)
   *
   * busybox 라인 에디터는 프롬프트 뒤에 ESC[6n(커서 위치 질의)을, 컬러 PS1은 SGR
   * 코드를 붙이므로 CSI 시퀀스를 걷어낸 뒤 매칭해야 한다 — 안 걷어내면 영원히
   * 매칭되지 않아 매번 타임아웃으로만 동작한다(실측으로 확인).
   */
  async waitPrompt(timeoutMs = 3000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const tail = this.assembler.getPartial().replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
      if (/[#$%>]\s*$/.test(tail)) return true;
      await sleep(20);
    }
    return false; // 타임아웃이어도 진행 — 최악의 경우 프롬프트가 한 줄 더 보일 뿐
  }

  async probe(timeoutMs = 1500): Promise<boolean> {
    const r = await this.runTransaction("true", { timeoutMs });
    return !r.timedOut && r.rc === 0;
  }

  /**
   * 셋업/채점 전 정리: 사용자가 입력 중이던 라인이나 포그라운드 프로세스
   * (cat > f, sleep …)를 Ctrl+C로 정리하고 셸 응답을 확인한다.
   */
  async prologue(): Promise<boolean> {
    this.sendRaw("\x03");
    await sleep(150);
    if (await this.probe(2000)) return true;
    this.sendRaw("\x03");
    await sleep(300);
    return this.probe(2500);
  }

  /**
   * 부팅 감지: 출력이 잠잠해지면 probe 트랜잭션을 시도하고, 성공할 때까지
   * (또는 전체 타임아웃까지) 반복한다. 프롬프트 정규식에 의존하지 않는다.
   * 스냅숏 복원(expectSilentStart)은 시리얼 출력이 전혀 없을 수 있으므로
   * 짧은 유예 후 출력 없이도 probe를 시도한다.
   */
  async waitForShell(
    totalTimeoutMs: number,
    opts: { expectSilentStart?: boolean } = {},
  ): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < totalTimeoutMs) {
      await sleep(600);
      if (this.lastOutputAt === 0) {
        // 콜드 부팅은 커널 출력이 나올 때까지 대기, 스냅숏 복원은 2초 유예 후 probe
        if (!opts.expectSilentStart || Date.now() - start < 2000) continue;
      } else if (Date.now() - this.lastOutputAt < 700) {
        continue; // 부팅 출력 진행 중
      }

      // 로그인 프롬프트에서 명령을 타이핑하면 안 되므로 먼저 처리한다
      const tail = this.assembler.getPartial();
      if (/login: ?$/i.test(tail)) {
        this.sendRaw("root\n");
        await sleep(300);
        continue;
      }
      if (/password: ?$/i.test(tail)) {
        this.sendRaw("\n");
        await sleep(300);
        continue;
      }

      const prevDisplay = this.displayEnabled;
      this.displayEnabled = false;
      const ok = await this.probe(1500);
      this.displayEnabled = prevDisplay;
      if (ok) return true;
      // 콘솔 활성화에 엔터가 필요한 이미지 대비
      this.sendRaw("\n");
    }
    return false;
  }
}
