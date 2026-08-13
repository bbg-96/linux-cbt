import { afterEach, describe, expect, it } from "vitest";
import type { V86 } from "v86";
import { serialBus } from "./serialBus";

const enc = new TextEncoder();

/**
 * 게스트 셸을 흉내내는 가짜 에뮬레이터.
 * serial0_send로 받은 라인을 에코하고, onCommand 결과를 마커와 함께 돌려보낸다.
 */
class FakeGuest {
  private listeners = new Set<(b: number) => void>();
  sent: string[] = [];
  onCommand: ((line: string) => void) | null = null;

  add_listener(_ev: string, fn: (b: number) => void): void {
    this.listeners.add(fn);
  }
  remove_listener(_ev: string, fn: (b: number) => void): void {
    this.listeners.delete(fn);
  }
  serial0_send(data: string): void {
    this.sent.push(data);
    if (data.endsWith("\n")) {
      const line = data.slice(0, -1);
      // tty 에코 (전체 라인 + CRLF)
      this.emit(line + "\r\n");
      this.onCommand?.(line);
    }
  }
  emit(text: string): void {
    for (const b of enc.encode(text)) {
      for (const fn of [...this.listeners]) fn(b);
    }
  }
  asV86(): V86 {
    return this as unknown as V86;
  }
}

function nonceFrom(line: string): string {
  const m = /"@@""B:([a-z0-9]+)"/.exec(line);
  if (!m) throw new Error("nonce not found in sent line: " + line);
  return m[1];
}

afterEach(() => {
  serialBus.detach();
});

describe("serialBus 트랜잭션", () => {
  it("에코를 건너뛰고 rc와 출력을 파싱한다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    guest.onCommand = (line) => {
      const n = nonceFrom(line);
      guest.emit(`@@B:${n}\r\nhello\r\nworld\r\n@@E:${n}:0\r\n/root% `);
    };
    const r = await serialBus.runTransaction("echo hello");
    expect(r).toEqual({ rc: 0, output: "hello\nworld", timedOut: false });
  });

  it("개행 없이 끝난 출력이 끝 마커에 붙어도 처리한다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    guest.onCommand = (line) => {
      const n = nonceFrom(line);
      guest.emit(`@@B:${n}\r\nabc@@E:${n}:0\r\n`);
    };
    const r = await serialBus.runTransaction("printf abc");
    expect(r).toEqual({ rc: 0, output: "abc", timedOut: false });
  });

  it("0이 아닌 종료 코드를 파싱한다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    guest.onCommand = (line) => {
      const n = nonceFrom(line);
      guest.emit(`@@B:${n}\r\nsh: nope: not found\r\n@@E:${n}:127\r\n`);
    };
    const r = await serialBus.runTransaction("nope");
    expect(r.rc).toBe(127);
    expect(r.output).toContain("not found");
  });

  it("사용자 출력 속 다른 nonce 마커는 무시한다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    guest.onCommand = (line) => {
      const n = nonceFrom(line);
      guest.emit(`@@B:${n}\r\n@@E:ffff0000:9\r\nreal\r\n@@E:${n}:0\r\n`);
    };
    const r = await serialBus.runTransaction("cat trap.txt");
    expect(r.rc).toBe(0);
    expect(r.output).toBe("@@E:ffff0000:9\nreal");
  });

  it("타임아웃 시 Ctrl+C를 보내고 timedOut을 반환한다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    guest.onCommand = () => {
      /* 응답 없음 */
    };
    const r = await serialBus.runTransaction("sleep 999", { timeoutMs: 120 });
    expect(r.timedOut).toBe(true);
    expect(guest.sent.some((s) => s === "\x03")).toBe(true);
  });

  it("트랜잭션이 큐로 직렬화된다", async () => {
    const guest = new FakeGuest();
    serialBus.attach(guest.asV86());
    const seen: string[] = [];
    guest.onCommand = (line) => {
      const n = nonceFrom(line);
      seen.push(line);
      setTimeout(() => guest.emit(`@@B:${n}\r\nok\r\n@@E:${n}:0\r\n`), 10);
    };
    const [a, b] = await Promise.all([
      serialBus.runTransaction("first"),
      serialBus.runTransaction("second"),
    ]);
    expect(a.rc).toBe(0);
    expect(b.rc).toBe(0);
    expect(seen.length).toBe(2);
    expect(seen[0]).toContain("first");
    expect(seen[1]).toContain("second");
  });
});
