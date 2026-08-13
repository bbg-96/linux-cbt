import type { V86 } from "v86";

/**
 * VM A↔B L2 프레임 브리지.
 * v86의 fetch 릴레이는 (1) 서브넷 내 IP(마지막 옥텟 ≤99)의 ARP를 프록시 응답하고
 * (2) 모든 ICMP echo에 가짜 응답하며 (3) 게스트 간 TCP SYN을 RST로 거절하므로,
 * 양단 문제 동안에는 릴레이를 음소거해야 브리지 통신이 진짜가 된다.
 */

let current: { a: V86; b: V86; dispose: () => void } | null = null;

export function installBridge(a: V86, b: V86): void {
  if (current && current.a === a && current.b === b) return; // 동일 쌍이면 유지
  disposeBridge();
  const aToB = (f: Uint8Array) => {
    try {
      b.bus.send("net0-receive", new Uint8Array(f));
    } catch {
      // B가 파괴된 직후의 잔여 프레임 무시
    }
  };
  const bToA = (f: Uint8Array) => {
    try {
      a.bus.send("net0-receive", new Uint8Array(f));
    } catch {
      // A가 파괴된 직후의 잔여 프레임 무시
    }
  };
  a.add_listener("net0-send", aToB);
  b.add_listener("net0-send", bToA);
  current = {
    a,
    b,
    dispose: () => {
      try {
        a.remove_listener("net0-send", aToB);
      } catch {
        // 이미 파괴됨
      }
      try {
        b.remove_listener("net0-send", bToA);
      } catch {
        // 이미 파괴됨
      }
    },
  };
}

export function disposeBridge(): void {
  current?.dispose();
  current = null;
}

export function bridgeActive(): boolean {
  return current !== null;
}

const MUTED = new WeakSet<V86>();

/** 릴레이 어댑터의 send를 인스턴스 프로퍼티 no-op으로 가려 음소거한다. */
export function muteRelay(vm: V86): void {
  const adapter = vm.network_adapter;
  if (!adapter || MUTED.has(vm)) return;
  (adapter as { send: (frame: Uint8Array) => void }).send = () => {};
  MUTED.add(vm);
}

/** 인스턴스 프로퍼티를 지워 프로토타입의 원래 send를 복원한다. */
export function unmuteRelay(vm: V86): void {
  const adapter = vm.network_adapter;
  if (!adapter || !MUTED.has(vm)) return;
  delete (adapter as { send?: (frame: Uint8Array) => void }).send;
  MUTED.delete(vm);
}

export function relayMuted(vm: V86): boolean {
  return MUTED.has(vm);
}
