import { describe, expect, it } from "vitest";
import {
  LineAssembler,
  beginTag,
  buildTransactionCommand,
  endRegex,
  makeNonce,
} from "./serialProtocol";

const enc = new TextEncoder();

function pushText(a: LineAssembler, text: string): string[] {
  return a.push(enc.encode(text));
}

describe("LineAssembler", () => {
  it("CRLF 라인을 분리한다", () => {
    const a = new LineAssembler();
    expect(pushText(a, "one\r\ntwo\r\n")).toEqual(["one", "two"]);
  });

  it("청크 경계에서 갈라진 CRLF를 처리한다", () => {
    const a = new LineAssembler();
    expect(pushText(a, "one\r")).toEqual([]);
    expect(pushText(a, "\ntwo\r\n")).toEqual(["one", "two"]);
  });

  it("단독 CR을 개행으로 취급한다", () => {
    const a = new LineAssembler();
    expect(pushText(a, "progress\rdone\n")).toEqual(["progress", "done"]);
  });

  it("바이트 단위로 잘라 보내도 동일하다", () => {
    const a = new LineAssembler();
    const lines: string[] = [];
    for (const b of enc.encode("hello world\r\nnext\r\n")) {
      lines.push(...a.push(Uint8Array.of(b)));
    }
    expect(lines).toEqual(["hello world", "next"]);
  });

  it("미완성 라인은 getPartial로 보인다", () => {
    const a = new LineAssembler();
    pushText(a, "(none) login: ");
    expect(a.getPartial()).toBe("(none) login: ");
  });
});

describe("transaction protocol", () => {
  it("전송 명령 문자열에 온전한 마커가 없다 (에코 안전)", () => {
    const nonce = "abcd1234";
    const line = buildTransactionCommand("ls -l", nonce);
    expect(line).not.toContain(`@@B:${nonce}`);
    expect(line).not.toContain(`@@E:${nonce}`);
  });

  it("실행 시 게스트가 만드는 마커 라인은 매칭된다", () => {
    const nonce = "abcd1234";
    // echo "@@""B:<nonce>" 실행 결과와 동일한 문자열
    expect(`@@B:${nonce}`.endsWith(beginTag(nonce))).toBe(true);
    const m = endRegex(nonce).exec(`@@E:${nonce}:0`);
    expect(m).not.toBeNull();
    expect(m![2]).toBe("0");
  });

  it("끝 마커는 개행 없는 출력 조각과 붙어도 매칭된다", () => {
    const nonce = "zz99yy88";
    const m = endRegex(nonce).exec(`abc@@E:${nonce}:127`);
    expect(m).not.toBeNull();
    expect(m![1]).toBe("abc");
    expect(m![2]).toBe("127");
  });

  it("다른 nonce의 마커는 매칭되지 않는다", () => {
    const m = endRegex("aaaa0000").exec("@@E:bbbb1111:0");
    expect(m).toBeNull();
  });

  it("명령 끝의 세미콜론을 정리해 구문 오류를 막는다", () => {
    const line = buildTransactionCommand("echo hi ; ", "n0n0n0n0");
    expect(line).toContain("{ echo hi ; }");
  });

  it("백그라운드 명령(&)에는 ;를 붙이지 않는다", () => {
    const line = buildTransactionCommand("./task.sh > t.log 2>&1 &", "n0n0n0n0");
    expect(line).toContain("{ ./task.sh > t.log 2>&1 & }");
    expect(line).not.toContain("& ; }");
  });

  it("nonce는 8자 영숫자", () => {
    for (let i = 0; i < 20; i++) {
      expect(makeNonce()).toMatch(/^[a-z0-9]{8}$/);
    }
  });
});
