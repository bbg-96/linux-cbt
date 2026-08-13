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

/**
 * `version`(이미지 빌드 식별자)이 주어지면 fs.json·state.bin.zst URL에 붙인다.
 *
 * 이 두 파일은 이름이 고정이라 브라우저 캐시(Pages: max-age=600)에 남는데, 스냅숏은
 * 그 파일시스템의 9p inode 배치까지 담은 메모리 이미지라 **둘이 반드시 같은 빌드여야
 * 한다**. 재배포 직후 재방문자가 구 스냅숏 + 신 fs.json을 섞어 부팅하면 게스트가
 * 조용히 망가진다 (실제로 modprobe에서 커널 oops로 관측됨). 버전을 URL에 실으면
 * 이미지가 바뀔 때마다 새 URL이 되어 섞일 수 없다.
 * rootfs-flat 파일들은 내용 해시가 곧 이름이라 이 문제가 없다.
 */
export function vmPathsFromBase(base: string, version?: string): VmImagePaths {
  const v = version ? `?v=${version}` : "";
  return {
    wasm: `${base}vm/v86.wasm`,
    seabios: `${base}vm/bios/seabios.bin`,
    vgabios: `${base}vm/bios/vgabios.bin`,
    alpineFsJson: `${base}vm/alpine/fs.json${v}`,
    alpineRootfsBase: `${base}vm/alpine/rootfs-flat/`,
    alpineState: `${base}vm/alpine/state.bin.zst${v}`,
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
  /**
   * a = 메인 VM, b = 양단 문제용 두 번째 VM.
   * 현재 두 역할의 옵션은 동일하다 (같은 스냅숏 재사용을 위해 반드시 동일해야 함).
   * B의 fetch 릴레이는 생성 후 netBridge.muteRelay로 무력화한다.
   */
  role?: "a" | "b";
}

/** V86Options 형태의 객체를 만든다 (v86 타입은 호출부에서 캐스팅). */
export function buildV86Options({ kind, paths, useState, role = "a" }: BuildOptionsArgs): Record<string, unknown> {
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
    // !! scripts/build-state.mjs와 반드시 동일해야 함 (스냅숏 복원 호환) !!
    uart1: true,
    filesystem: {
      baseurl: paths.alpineRootfsBase,
      basefs: paths.alpineFsJson,
    },
    bzimage_initrd_from_filesystem: true,
    cmdline: ALPINE_CMDLINE,
    // B는 릴레이 없이 순수 virtio NIC만 (장치 구성은 동일해 같은 스냅숏 복원 가능).
    // 릴레이(JS 어댑터)는 게스트 간 TCP에 위조 RST를 주입하므로 B에서는 아예 제거한다.
    net_device: role === "b" ? { type: "virtio" } : { type: "virtio", relay_url: "fetch" },
    ...(useState ? { initial_state: { url: paths.alpineState } } : {}),
  };
}

export interface AlpineManifest {
  fsJsonSha256: string;
  withNM: number;
  hasState: boolean;
  builtAt: string;
  stateBuiltAt?: string;
}

/** 이미지 빌드 식별자 — fs.json 해시 앞부분 (URL 캐시 버스팅용). */
export function imageVersion(manifest: AlpineManifest): string {
  return manifest.fsJsonSha256.slice(0, 12);
}
