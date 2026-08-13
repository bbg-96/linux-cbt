import { V86, type V86Options } from "v86";
import { createStore, type Store } from "../lib/store";
import { serialChannels } from "./serialBus";
import type { SerialChannel } from "./serialChannel";
import { terminals, type TerminalInstance } from "../terminal/terminalService";
import { buildV86Options, vmPathsFromBase, type AlpineManifest, type ImageKind } from "./vmConfig";
import { disposeBridge, muteRelay } from "./netBridge";

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

let manifestPromise: Promise<boolean> | null = null;
function fetchHasState(base: string): Promise<boolean> {
  manifestPromise ??= (async () => {
    try {
      const res = await fetch(`${base}vm/alpine/manifest.json`, { cache: "no-cache" });
      if (!res.ok) return false;
      const manifest = (await res.json()) as AlpineManifest;
      return manifest.hasState === true;
    } catch {
      return false;
    }
  })();
  return manifestPromise;
}

class VmInstance {
  readonly store: Store<VmState>;
  emulator: V86 | null = null;
  private bootingPromise: Promise<boolean> | null = null;
  private auxReadyGen = -1;
  private auxReadyPromise: Promise<boolean> | null = null;

  constructor(
    readonly id: "a" | "b",
    private readonly grading: SerialChannel,
    private readonly aux: SerialChannel | null,
    private readonly term: TerminalInstance,
  ) {
    this.store = createStore<VmState>({
      phase: "idle",
      download: null,
      error: null,
      generation: 0,
      imageKind: id === "a" ? detectImageKind() : "alpine",
      fromState: false,
    });
  }

  get phase(): VmPhase {
    return this.store.get().phase;
  }

  boot(): void {
    const p = this.phase;
    if (p !== "idle" && p !== "error") return;
    void this.ensureReady();
  }

  /** ready 될 때까지 부팅. 이미 진행 중이면 그 결과를 공유한다. */
  ensureReady(): Promise<boolean> {
    if (this.phase === "ready") return Promise.resolve(true);
    this.bootingPromise ??= this.start().finally(() => {
      this.bootingPromise = null;
    });
    return this.bootingPromise;
  }

  async restart(): Promise<void> {
    disposeBridge(); // 파괴 전 브리지 해제 (파괴된 에뮬레이터로의 send 방지)
    const old = this.emulator;
    this.emulator = null;
    this.grading.detach();
    this.aux?.detach();
    if (old) {
      try {
        await old.destroy();
      } catch {
        // 이미 정지된 경우 무시
      }
    }
    this.term.resetScreen();
    // stale 'ready'로 ensureReady가 조기 반환하지 않도록 상태·진행 중 부팅을 리셋
    this.bootingPromise = null;
    this.store.set({ phase: "idle" });
    await this.ensureReady();
  }

  pause(): void {
    try {
      void this.emulator?.stop();
    } catch {
      // 무시
    }
  }

  resume(): void {
    try {
      void this.emulator?.run();
    } catch {
      // 무시
    }
  }

  /** 보조 채널(a1) 준비 — VM 세대당 1회 probe. */
  ensureAuxReady(): Promise<boolean> {
    if (!this.aux || !this.emulator) return Promise.resolve(false);
    const gen = this.store.get().generation;
    if (this.auxReadyPromise && this.auxReadyGen === gen) return this.auxReadyPromise;
    this.auxReadyGen = gen;
    this.auxReadyPromise = this.aux.waitForShell(15_000, { expectSilentStart: true });
    return this.auxReadyPromise;
  }

  private async start(): Promise<boolean> {
    const kind = this.store.get().imageKind;
    this.store.set({
      phase: "booting",
      error: null,
      download: null,
      generation: this.store.get().generation + 1,
    });
    this.grading.setGates({ display: true, input: false });

    const base = import.meta.env.BASE_URL;
    const paths = vmPathsFromBase(base);
    const hasState = kind === "alpine" ? await fetchHasState(base) : false;

    // 스냅숏 복원 실패(이미지-스냅숏 불일치 등) 시 콜드 부팅으로 한 번 더 시도
    const attempts = hasState ? [true, false] : [false];
    for (const withState of attempts) {
      const result = await this.bootOnce(kind, paths, withState);
      if (result === "superseded") return false;
      if (result === "ok") return true;
      this.term.resetScreen();
      this.term.writeDivider("스냅숏 복원 실패 — 일반 부팅으로 재시도");
    }
    this.store.set({ phase: "error", error: "부팅 시간이 초과되었습니다. VM을 재시작해 보세요." });
    return false;
  }

  private async bootOnce(
    kind: ImageKind,
    paths: ReturnType<typeof vmPathsFromBase>,
    withState: boolean,
  ): Promise<"ok" | "failed" | "superseded"> {
    this.store.set({ fromState: withState, download: null });
    const emulator = new V86(
      buildV86Options({ kind, paths, useState: withState, role: this.id }) as unknown as V86Options,
    );
    this.emulator = emulator;
    if (this.id === "b") muteRelay(emulator); // B의 릴레이는 영구 음소거 (netBridge 참고)

    emulator.add_listener("download-progress", (p) => {
      if (this.emulator !== emulator) return;
      if (!p.lengthComputable || p.total < 512 * 1024) return; // 큰 파일(커널/fs.json/스냅숏)만 표시
      this.store.set({ download: { fileName: p.file_name, loaded: p.loaded, total: p.total } });
    });

    this.grading.attach(emulator);
    this.aux?.attach(emulator);
    // 스냅숏 복원은 수 초, 콜드 부팅(특히 Alpine 9p 첫 부팅)은 수 분까지 허용
    const bootTimeoutMs = kind === "legacy" ? 90_000 : withState ? 120_000 : 240_000;
    const ok = await this.grading.waitForShell(bootTimeoutMs, { expectSilentStart: withState });
    if (this.emulator !== emulator) return "superseded"; // 도중에 restart됨
    this.store.set({ download: null });
    if (!ok) {
      this.grading.detach();
      this.aux?.detach();
      try {
        await emulator.destroy();
      } catch {
        // 무시
      }
      if (this.emulator !== emulator) return "superseded";
      this.emulator = null;
      return "failed";
    }

    // 터미널 크기·TERM 동기화 (숨김 실행) — 스냅숏 부팅 시 저장 당시 크기를 덮어쓴다
    this.grading.setGates({ display: false, input: false });
    const { rows, cols } = this.term.getSize();
    await this.grading.runTransaction(
      `export TERM=vt100; stty rows ${Math.max(rows, 10)} cols ${Math.max(cols, 40)}`,
      { timeoutMs: 4000 },
    );
    if (this.emulator !== emulator) return "superseded";

    // stty 트랜잭션의 후행 프롬프트를 흘려보낸 뒤 표시를 연다 (프롬프트 중복 방지)
    await this.grading.waitQuiet();
    this.term.resetScreen();
    this.term.writeDivider(this.id === "a" ? "리눅스 셸 준비 완료" : "Host B 셸 준비 완료");
    this.grading.setGates({ display: true, input: true });
    this.grading.sendRaw("\n");
    this.store.set({ phase: "ready" });
    return "ok";
  }
}

class VmService {
  readonly a = new VmInstance("a", serialChannels.a0, serialChannels.a1, terminals.a0);
  readonly b = new VmInstance("b", serialChannels.b0, null, terminals.b0);

  /** 호환 표면 — 기존 코드는 메인 VM(A) 기준으로 동작 */
  get store(): Store<VmState> {
    return this.a.store;
  }
  get bStore(): Store<VmState> {
    return this.b.store;
  }
  get phase(): VmPhase {
    return this.a.phase;
  }
  get emulator(): V86 | null {
    return this.a.emulator;
  }

  boot(): void {
    this.a.boot();
  }
  restart(): Promise<void> {
    return this.a.restart();
  }

  ensureB(): Promise<boolean> {
    return this.b.ensureReady();
  }
  restartB(): Promise<void> {
    return this.b.restart();
  }
  pauseB(): void {
    this.b.pause();
  }
  resumeB(): void {
    this.b.resume();
  }
  ensureA1(): Promise<boolean> {
    return this.a.ensureAuxReady();
  }
}

export const vmService = new VmService();
