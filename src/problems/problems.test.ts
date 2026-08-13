import { describe, expect, it } from "vitest";
// 빌드 모드(운영/스테이징)와 무관하게 두 트랙의 문제를 모두 검증한다
import { ALL_PROBLEMS } from "./all";
import { STAGING_PROBLEMS } from "./staging";

const problems = [...ALL_PROBLEMS, ...STAGING_PROBLEMS];

describe("문제 스키마 제약", () => {
  it("한 트랙 안에서 문제 id가 중복되지 않는다", () => {
    for (const track of [ALL_PROBLEMS, STAGING_PROBLEMS]) {
      const ids = track.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("vms:2 문제는 terminals:2를 함께 쓰지 않는다 (패널 최대 2개)", () => {
    for (const p of problems) {
      if ((p.vms ?? 1) === 2) {
        expect(p.terminals ?? 1, p.id).toBe(1);
      }
    }
  });

  it("on:'b'와 setupB는 vms:2에서만, t2 답안은 terminals:2에서만 쓴다", () => {
    for (const p of problems) {
      const vms = p.vms ?? 1;
      const terms = p.terminals ?? 1;
      if (vms !== 2) {
        expect(p.setupB, p.id).toBeUndefined();
        for (const c of p.checks) {
          expect(c.on ?? "a", `${p.id}/${c.id}`).toBe("a");
        }
      }
      for (const s of p.verify?.answer ?? []) {
        if (typeof s !== "string") {
          if (s.on === "b") expect(vms, p.id).toBe(2);
          if (s.on === "t2") expect(terms, p.id).toBe(2);
        }
      }
    }
  });

  it("모든 문제에 verify.answer가 있다 (회귀 자동화 필수)", () => {
    for (const p of problems) {
      expect(p.verify?.answer?.length, p.id).toBeTruthy();
    }
  });

  it("모든 문제에 카드 표시용 tags가 있다 (1~4개)", () => {
    for (const p of problems) {
      expect(p.tags?.length, p.id).toBeTruthy();
      expect(p.tags!.length, p.id).toBeLessThanOrEqual(4);
    }
  });

  it("모든 문제에 카탈로그 트리용 commands가 있다 (1~3개, 단일 토큰)", () => {
    for (const p of problems) {
      expect(p.commands?.length, p.id).toBeTruthy();
      expect(p.commands!.length, p.id).toBeLessThanOrEqual(3);
      for (const c of p.commands!) {
        expect(c, `${p.id}/${c}`).toMatch(/^\S+$/);
      }
    }
  });

  it("vms:2 문제의 setup/setupB는 MAC_REFRESH(rmmod virtio_net)를 포함한다", () => {
    for (const p of problems) {
      if ((p.vms ?? 1) === 2) {
        const joinedA = (p.setup ?? []).join("\n");
        const joinedB = (p.setupB ?? []).join("\n");
        expect(joinedA, p.id).toContain("rmmod virtio_net");
        expect(joinedB, p.id).toContain("rmmod virtio_net");
      }
    }
  });
});
