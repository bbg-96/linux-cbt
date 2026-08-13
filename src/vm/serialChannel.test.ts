import { describe, expect, it } from "vitest";
import type { V86 } from "v86";
import { SerialChannel } from "./serialChannel";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** 포트별 이벤트/입력 API를 흉내내는 가짜 에뮬레이터. */
class FakeDualGuest {
  listeners = new Map<string, Set<(b: number) => void>>();
  sent: { port: number; data: string }[] = [];

  add_listener(ev: string, fn: (b: number) => void): void {
    if (!this.listeners.has(ev)) this.listeners.set(ev, new Set());
    this.listeners.get(ev)!.add(fn);
  }
  remove_listener(ev: string, fn: (b: number) => void): void {
    this.listeners.get(ev)?.delete(fn);
  }
  serial0_send(data: string): void {
    this.sent.push({ port: 0, data });
  }
  serial_send_bytes(port: number, bytes: Uint8Array): void {
    this.sent.push({ port, data: dec.decode(bytes) });
  }
  emit(port: number, text: string): void {
    const fns = this.listeners.get(`serial${port}-output-byte`);
    if (!fns) return;
    for (const b of enc.encode(text)) for (const fn of [...fns]) fn(b);
  }
  asV86(): V86 {
    return this as unknown as V86;
  }
}

describe("SerialChannel 포트 배선", () => {
  it("port 1은 serial1 이벤트를 듣고 serial_send_bytes(1)로 보낸다", async () => {
    const guest = new FakeDualGuest();
    const ch = new SerialChannel(1);
    ch.attach(guest.asV86());

    const p = ch.runTransaction("echo hi", { timeoutMs: 2000 });
    await new Promise((r) => setTimeout(r, 10)); // 전송은 마이크로태스크 이후
    const sentLine = guest.sent.find((s) => s.port === 1);
    expect(sentLine).toBeDefined();
    const nonce = /"@@""B:([a-z0-9]+)"/.exec(sentLine!.data)![1];
    guest.emit(1, `@@B:${nonce}\r\nhi\r\n@@E:${nonce}:0\r\n`);
    expect(await p).toEqual({ rc: 0, output: "hi", timedOut: false });
    ch.detach();
  });

  it("port 0 출력은 port 1 채널에 도달하지 않는다", async () => {
    const guest = new FakeDualGuest();
    const ch0 = new SerialChannel(0);
    const ch1 = new SerialChannel(1);
    ch0.attach(guest.asV86());
    ch1.attach(guest.asV86());

    const seen: string[] = [];
    ch1.onDisplay((d) => seen.push(dec.decode(d)));
    ch1.setGates({ display: true });
    guest.emit(0, "only-for-port0\r\n");
    await new Promise((r) => setTimeout(r, 30));
    expect(seen.join("")).toBe("");
    ch0.detach();
    ch1.detach();
  });

  it("한글 입력이 UTF-8 바이트로 전송된다", () => {
    const guest = new FakeDualGuest();
    const ch = new SerialChannel(1);
    ch.attach(guest.asV86());
    ch.setGates({ input: true });
    ch.userInput("한글");
    expect(guest.sent[0]).toEqual({ port: 1, data: "한글" });
    ch.detach();
  });
});
