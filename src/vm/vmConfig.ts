// V86 생성자 옵션의 단일 소스 — 브라우저(vmService)와 스냅숏 생성기(scripts/build-state.mjs)가
// 동일한 옵션으로 VM을 만들어야 save_state/initial_state가 호환된다.

/**
 * 게스트 이미지 프로필.
 *  - alpine: 9p 루트, busybox/OpenRC. 운영 사이트의 검증된 기본값.
 *  - debian: ext4 블록 디스크 루트, systemd. hostnamectl·timedatectl·lsblk 처럼
 *    systemd/util-linux 도구가 필요한 문제를 위해 스테이징에서 쓴다. 9p 를 아예
 *    타지 않으므로 배포 환경에서 9p 커널 경로가 무너지던 문제와도 무관하다.
 *  - legacy: 초기 buildroot ISO (임시 폴백, ?legacy).
 */
export type ImageKind = "alpine" | "debian" | "legacy";

/** 브라우저에서는 URL, Node에서는 로컬 파일 경로를 넣는다. */
export interface VmImagePaths {
  wasm: string;
  seabios: string;
  vgabios: string;
  alpineFsJson: string;
  alpineRootfsBase: string;
  alpineState: string;
  debianKernel: string;
  debianInitrd: string;
  /** 청크 파일들의 기준 이름 (.../rootfs.ext4.zst) — v86이 여기서 파트명을 만든다 */
  debianDisk: string;
  debianState: string;
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
export function vmPathsFromBase(base: string, version?: string, debianPartsDir?: string): VmImagePaths {
  const v = version ? `?v=${version}` : "";
  const partsDir = debianPartsDir ?? "parts";
  return {
    wasm: `${base}vm/v86.wasm`,
    seabios: `${base}vm/bios/seabios.bin`,
    vgabios: `${base}vm/bios/vgabios.bin`,
    alpineFsJson: `${base}vm/alpine/fs.json${v}`,
    alpineRootfsBase: `${base}vm/alpine/rootfs-flat/`,
    alpineState: `${base}vm/alpine/state.bin.zst${v}`,
    debianKernel: `${base}vm/debian/vmlinuz${v}`,
    debianInitrd: `${base}vm/debian/initrd.img${v}`,
    // 청크 파일명은 v86이 이 이름에서 만든다 (rootfs-<start>-<end>.ext4.zst).
    // URL 쿼리를 붙이면 파트 URL이 깨지므로, 캐시 짝 문제(구 청크 + 신 스냅숏)는
    // 디렉터리 이름을 빌드마다 바꿔서 막는다 (manifest.partsDir, 예: parts-2026...).
    debianDisk: `${base}vm/debian/${partsDir}/rootfs.ext4.zst`,
    debianState: `${base}vm/debian/state.bin.zst${v}`,
    legacyIso: `${base}vm/linux.iso`,
  };
}

export const ALPINE_CMDLINE =
  "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose modules=virtio_pci tsc=reliable console=ttyS0";

/** 파티션 없는 통짜 ext4 를 그대로 루트로 마운트한다 (부트로더 없이 커널 직접 부팅) */
export const DEBIAN_CMDLINE =
  "root=/dev/sda rw rootfstype=ext4 console=ttyS0,115200 net.ifnames=0 tsc=reliable";

/** debian 프로필 디스크 청크 크기 — image/debian/build.sh 의 CHUNK 와 반드시 같아야 한다 */
export const DEBIAN_CHUNK_SIZE = 1024 * 1024;

export interface BuildOptionsArgs {
  kind: ImageKind;
  paths: VmImagePaths;
  /** manifest.hasState가 참일 때만 true — 스냅숏에서 즉시 복원 */
  useState: boolean;
  /** debian 프로필 전용 — manifest.diskSize (압축 해제 기준 전체 바이트) */
  diskSize?: number;
  /**
   * a = 메인 VM, b = 양단 문제용 두 번째 VM.
   * 현재 두 역할의 옵션은 동일하다 (같은 스냅숏 재사용을 위해 반드시 동일해야 함).
   * B의 fetch 릴레이는 생성 후 netBridge.muteRelay로 무력화한다.
   */
  role?: "a" | "b";
}

/** V86Options 형태의 객체를 만든다 (v86 타입은 호출부에서 캐스팅). */
export function buildV86Options({
  kind,
  paths,
  useState,
  diskSize,
  role = "a",
}: BuildOptionsArgs): Record<string, unknown> {
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

  if (kind === "debian") {
    if (!diskSize) throw new Error("debian 프로필에는 manifest.diskSize가 필요합니다.");
    return {
      ...common,
      memory_size: 512 * 1024 * 1024,
      vga_memory_size: 8 * 1024 * 1024,
      uart1: true,
      bzimage: { url: paths.debianKernel },
      initrd: { url: paths.debianInitrd },
      cmdline: DEBIAN_CMDLINE,
      // use_parts: 접근한 1MiB 청크만 내려받는다 (전체 디스크를 받지 않는다)
      hda: {
        url: paths.debianDisk,
        size: diskSize,
        use_parts: true,
        fixed_chunk_size: DEBIAN_CHUNK_SIZE,
        async: true,
      },
      net_device: role === "b" ? { type: "virtio" } : { type: "virtio", relay_url: "fetch" },
      ...(useState ? { initial_state: { url: paths.debianState } } : {}),
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

/** 두 프로필의 manifest.json 을 함께 담는 형태 (프로필별 필드는 선택) */
export interface ImageManifest {
  hasState: boolean;
  builtAt: string;
  stateBuiltAt?: string;
  /** alpine 전용 */
  fsJsonSha256?: string;
  withNM?: number;
  /** debian 전용 */
  diskSize?: number;
  chunkSize?: number;
  kernelVersion?: string;
  /** 디스크 청크 디렉터리 (빌드마다 다른 이름 — 캐시 짝 어긋남 방지) */
  partsDir?: string;
}

/** 하위 호환 별칭 (기존 코드가 쓰던 이름) */
export type AlpineManifest = ImageManifest;

/**
 * 이미지 빌드 식별자 — 캐시 버스팅용.
 * alpine 은 fs.json 해시, debian 은 빌드 시각을 쓴다(디스크 청크는 이름이 고정이라
 * 버전을 달 수 없으므로, 짝을 맞춰야 하는 스냅숏 쪽에만 붙인다).
 */
export function imageVersion(manifest: ImageManifest): string {
  if (manifest.fsJsonSha256) return manifest.fsJsonSha256.slice(0, 12);
  return (manifest.stateBuiltAt ?? manifest.builtAt).replace(/\D/g, "").slice(0, 14);
}
