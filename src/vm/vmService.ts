import { V86, type V86Options } from "v86";
import { createStore, type Store } from "../lib/store";
import { serialBus } from "./serialBus";
import { terminalService } from "../terminal/terminalService";
import { buildV86Options, vmPathsFromBase, type AlpineManifest, type ImageKind } from "./vmConfig";

export type VmPhase = "idle" | "booting" | "ready" | "error";

export interface VmState {
  phase: VmPhase;
  download: { fileName: string; loaded: number; total: number } | null;
  error: string | null;
  /** VM 재시작 시 증가 — 문제 세션이 재시딩 필요 여부를 판단하는 데 사용 */
  generation: number;
  imageKind: ImageKind;
  /** 스냅숏에서 복원 중/복원됨 여부 (부팅 안내 문구용) */
  fromState: boolean;
}

function detectImageKind(): ImageKind {
  try {
    if (new URLSearchParams(location.search).has("legacy")) return "legacy";
  } catch {
    // SSR/테스트 환경 방어
  }
  return "alpine";
}

class VmService {
  readonly store: Store<VmState> = createStore<VmState>({
    phase: "idle",
    download: null,
    error: null,
    generation: 0,
    imageKind: detectImageKind(),
    fromState: false,
  });
  private emulator: V86 | null = null;

  get phase(): VmPhase {
    return this.store.get().phase;
  }

  /** 앱 시작 시 1회 부팅 (StrictMode 이중 호출에 안전). */
  boot(): void {
    const p = this.phase;
    if (p !== "idle" && p !== "error") return;
    void this.start();
  }

  async restart(): Promise<void> {
    const old = this.emulator;
    this.emulator = null;
    serialBus.detach();
    if (old) {
      try {
        await old.destroy();
      } catch {
        // 이미 정지된 경우 무시
      }
    }
    terminalService.resetScreen();
    await this.start();
  }

  private async start(): Promise<void> {
    const kind = this.store.get().imageKind;
    this.store.set({
      phase: "booting",
      error: null,
      download: null,
      generation: this.store.get().generation + 1,
    });
    serialBus.setGates({ display: true, input: false });

    const base = import.meta.env.BASE_URL;
    const paths = vmPathsFromBase(base);

    let useState = false;
    if (kind === "alpine") {
      try {
        const res = await fetch(`${base}vm/alpine/manifest.json`, { cache: "no-cache" });
        if (res.ok) {
          const manifest = (await res.json()) as AlpineManifest;
          useState = manifest.hasState === true;
        }
      } catch {
        // manifest 없으면 스냅숏 없이 부팅
      }
    }
    this.store.set({ fromState: useState });

    const emulator = new V86(buildV86Options({ kind, paths, useState }) as unknown as V86Options);
    this.emulator = emulator;

    emulator.add_listener("download-progress", (p) => {
      if (this.emulator !== emulator) return;
      if (!p.lengthComputable || p.total < 512 * 1024) return; // 큰 파일(커널/fs.json/스냅숏)만 표시
      this.store.set({ download: { fileName: p.file_name, loaded: p.loaded, total: p.total } });
    });

    serialBus.attach(emulator);
    // 스냅숏 복원은 수 초, 콜드 부팅(특히 Alpine 9p 첫 부팅)은 수 분까지 허용
    const bootTimeoutMs = kind === "legacy" ? 90_000 : useState ? 120_000 : 240_000;
    const ok = await serialBus.waitForShell(bootTimeoutMs);
    if (this.emulator !== emulator) return; // 도중에 restart됨
    this.store.set({ download: null });
    if (!ok) {
      this.store.set({ phase: "error", error: "부팅 시간이 초과되었습니다. VM을 재시작해 보세요." });
      return;
    }

    // 터미널 크기·TERM 동기화 (숨김 실행) — 스냅숏 부팅 시 저장 당시 크기를 덮어쓴다
    serialBus.setGates({ display: false, input: false });
    const { rows, cols } = terminalService.getSize();
    await serialBus.runTransaction(
      `export TERM=vt100; stty rows ${Math.max(rows, 10)} cols ${Math.max(cols, 40)}`,
      { timeoutMs: 4000 },
    );
    if (this.emulator !== emulator) return;

    terminalService.resetScreen();
    terminalService.writeDivider("리눅스 셸 준비 완료");
    serialBus.setGates({ display: true, input: true });
    serialBus.sendRaw("\n");
    this.store.set({ phase: "ready" });
  }
}

export const vmService = new VmService();
