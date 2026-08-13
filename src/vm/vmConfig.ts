// V86 생성자 옵션의 단일 소스 — 브라우저(vmService)와 스냅숏 생성기(scripts/build-state.mjs)가
// 동일한 옵션으로 VM을 만들어야 save_state/initial_state가 호환된다.

export type ImageKind = "alpine" | "legacy";

/** 브라우저에서는 URL, Node에서는 로컬 파일 경로를 넣는다. */
export interface VmImagePaths {
  wasm: string;
  seabios: string;
  vgabios: string;
  alpineFsJson: string;
  alpineRootfsBase: string;
  alpineState: string;
  legacyIso: string;
}

export function vmPathsFromBase(base: string): VmImagePaths {
  return {
    wasm: `${base}vm/v86.wasm`,
    seabios: `${base}vm/bios/seabios.bin`,
    vgabios: `${base}vm/bios/vgabios.bin`,
    alpineFsJson: `${base}vm/alpine/fs.json`,
    alpineRootfsBase: `${base}vm/alpine/rootfs-flat/`,
    alpineState: `${base}vm/alpine/state.bin.zst`,
    legacyIso: `${base}vm/linux.iso`,
  };
}

export const ALPINE_CMDLINE =
  "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose modules=virtio_pci tsc=reliable console=ttyS0";

export interface BuildOptionsArgs {
  kind: ImageKind;
  paths: VmImagePaths;
  /** manifest.hasState가 참일 때만 true — 스냅숏에서 즉시 복원 */
  useState: boolean;
}

/** V86Options 형태의 객체를 만든다 (v86 타입은 호출부에서 캐스팅). */
export function buildV86Options({ kind, paths, useState }: BuildOptionsArgs): Record<string, unknown> {
  const common = {
    wasm_path: paths.wasm,
    bios: { url: paths.seabios },
    vga_bios: { url: paths.vgabios },
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
  };

  if (kind === "legacy") {
    return {
      ...common,
      memory_size: 96 * 1024 * 1024,
      cdrom: { url: paths.legacyIso },
    };
  }

  return {
    ...common,
    memory_size: 512 * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    filesystem: {
      baseurl: paths.alpineRootfsBase,
      basefs: paths.alpineFsJson,
    },
    bzimage_initrd_from_filesystem: true,
    cmdline: ALPINE_CMDLINE,
    net_device: { type: "virtio", relay_url: "fetch" },
    ...(useState ? { initial_state: { url: paths.alpineState } } : {}),
  };
}

export interface AlpineManifest {
  fsJsonSha256: string;
  withNM: number;
  hasState: boolean;
  builtAt: string;
}
