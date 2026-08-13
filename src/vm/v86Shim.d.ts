// v86.d.ts에 없지만 런타임에 존재하는 표면 (이번 세션에서 실증 확인).
import "v86";

declare module "v86" {
  interface V86 {
    /** 내부 이벤트 버스 — net0-receive로 L2 프레임 주입에 사용 */
    bus: { send(name: string, data?: unknown): void };
    /** fetch 릴레이 어댑터 — send를 no-op으로 바꾸면 릴레이 음소거 */
    network_adapter?: { send(frame: Uint8Array): void };
  }
}
