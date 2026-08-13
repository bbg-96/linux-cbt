import { V86 } from "v86";
import { createStore, type Store } from "../lib/store";
import { serialBus } from "./serialBus";
import { terminalService } from "../terminal/terminalService";

export type VmPhase = "idle" | "booting" | "ready" | "error";

export interface VmState {
  phase: VmPhase;
  download: { fileName: string; loaded: number; total: number } | null;
  error: string | null;
  /** VM 재시작 시 증가 — 문제 세션이 재시딩 필요 여부를 판단하는 데 사용 */
  generation: number;
}

class VmService {
  readonly store: Store<VmState> = createStore<VmState>({
    phase: "idle",
    download: null,
    error: null,
    generation: 0,
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
    this.store.set({
      phase: "booting",
      error: null,
      download: null,
      generation: this.store.get().generation + 1,
    });
    serialBus.setGates({ display: true, input: false });

    const base = import.meta.env.BASE_URL;
    const emulator = new V86({
      wasm_path: `${base}vm/v86.wasm`,
      bios: { url: `${base}vm/bios/seabios.bin` },
      vga_bios: { url: `${base}vm/bios/vgabios.bin` },
      cdrom: { url: `${base}vm/linux.iso` },
      memory_size: 96 * 1024 * 1024,
      autostart: true,
      disable_keyboard: true,
      disable_mouse: true,
      disable_speaker: true,
    });
    this.emulator = emulator;

    emulator.add_listener("download-progress", (p) => {
      if (this.emulator !== emulator) return;
      if (!p.lengthComputable || p.total < 512 * 1024) return; // 큰 파일(ISO)만 표시
      this.store.set({ download: { fileName: p.file_name, loaded: p.loaded, total: p.total } });
    });

    serialBus.attach(emulator);
    const ok = await serialBus.waitForShell(90_000);
    if (this.emulator !== emulator) return; // 도중에 restart됨
    this.store.set({ download: null });
    if (!ok) {
      this.store.set({ phase: "error", error: "부팅 시간이 초과되었습니다. VM을 재시작해 보세요." });
      return;
    }

    // 터미널 크기·TERM 동기화 (숨김 실행)
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
