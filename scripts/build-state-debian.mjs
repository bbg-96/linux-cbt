// Debian 프로필 부트 스냅숏 생성기.
// 실행: node scripts/build-state-debian.mjs  (public/vm/debian 이미지가 먼저 있어야 함)
//
// 브라우저와 **정확히 같은 V86 옵션**으로 부팅해야 initial_state가 복원된다.
// 특히 hda 는 반드시 use_parts(비동기 파트 버퍼)여야 한다:
//   - 통짜 buffer(SyncBuffer)로 만들면 get_state가 디스크 544MB를 통째로 담아
//     스냅숏이 697MB가 되고, 브라우저의 파트 버퍼와 구성이 달라 복원도 깨진다.
//   - 파트 버퍼는 "쓰기된 블록"만 담으므로 스냅숏이 메모리 위주로 작아진다.
// Node 환경에서도 v86의 load_file은 로컬 경로를 읽으므로 url 에 파일 경로를 준다.
import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import { execFileSync } from "node:child_process";
import { V86 } from "v86";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const vmDir = path.join(root, "public", "vm");
const debDir = path.join(vmDir, "debian");
const stateFile = path.join(debDir, "state.bin");

const manifestPath = path.join(debDir, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error("public/vm/debian/manifest.json 이 없습니다. image/debian/build.sh 를 먼저 실행하세요.");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// v86의 zstd 파트 해제는 브라우저 Worker를 쓰므로 Node에서는 동작하지 않는다
// (ReferenceError: Worker is not defined). 그래서 Node 부팅용으로 압축을 푼 파트를
// 한 번 만들어 두고 그쪽을 읽는다. 버퍼 타입(AsyncXHRPartfileBuffer)·디스크 크기·
// 청크 크기가 같고, get_state는 "쓰기된 블록"만 담으므로 압축 여부는 스냅숏 호환성에
// 영향을 주지 않는다 (is_zstd는 URL 확장자에서 파생되는 런타임 속성일 뿐이다).
// public/ 밖에 둔다 — 안에 두면 vite 빌드가 이 544MB를 dist로 복사해 배포까지 간다
const rawDir = path.join(root, ".cache", "debian-parts-raw");
{
  const zstdDir = path.join(debDir, manifest.partsDir ?? "parts");
  const zlib = await import("node:zlib");
  // 파일 개수만 비교하면 이미지를 재빌드해도(개수 동일) 구 디스크 캐시를 재사용해
  // 브라우저가 받는 새 청크와 다른 디스크로 스냅숏을 뜨게 된다 — builtAt 으로 판별
  const markerFile = path.join(rawDir, ".builtAt");
  const need =
    !fs.existsSync(markerFile) ||
    fs.readFileSync(markerFile, "utf8") !== manifest.builtAt ||
    fs.readdirSync(rawDir).length - 1 !== Math.ceil(manifest.diskSize / manifest.chunkSize);
  if (need) {
    fs.rmSync(rawDir, { recursive: true, force: true });
    fs.mkdirSync(rawDir, { recursive: true });
    process.stdout.write("Node 부팅용 비압축 파트 생성 중… ");
    for (let off = 0; off < manifest.diskSize; off += manifest.chunkSize) {
      const name = `rootfs-${off}-${off + manifest.chunkSize}.ext4`;
      const zst = fs.readFileSync(path.join(zstdDir, name + ".zst"));
      fs.writeFileSync(path.join(rawDir, name), zlib.zstdDecompressSync(zst));
    }
    fs.writeFileSync(markerFile, manifest.builtAt);
    console.log("완료");
  }
}

// !! src/vm/vmConfig.ts 의 debian 분기와 반드시 동일하게 유지할 것 !!
const emulator = new V86({
  wasm_path: path.join(root, "node_modules", "v86", "build", "v86.wasm"),
  bios: { url: path.join(vmDir, "bios", "seabios.bin") },
  vga_bios: { url: path.join(vmDir, "bios", "vgabios.bin") },
  autostart: true,
  disable_keyboard: true,
  disable_mouse: true,
  disable_speaker: true,
  memory_size: 512 * 1024 * 1024,
  vga_memory_size: 8 * 1024 * 1024,
  uart1: true,
  bzimage: { url: path.join(debDir, "vmlinuz") },
  initrd: { url: path.join(debDir, "initrd.img") },
  cmdline: "root=/dev/sda rw rootfstype=ext4 console=ttyS0,115200 net.ifnames=0 tsc=reliable",
  hda: {
    // v86은 이 url과 같은 디렉터리에서 파트를 찾는다 (Node에서는 비압축본)
    url: path.join(rawDir, "rootfs.ext4"),
    size: manifest.diskSize,
    use_parts: true,
    fixed_chunk_size: manifest.chunkSize,
    async: true,
  },
  net_device: { type: "virtio", relay_url: "fetch" },
});

console.log("부팅 중… (systemd 콜드 부팅은 1~2분 걸린다)");
let serial = "";
let phase = "boot";
const started = Date.now();
const el = () => Math.round((Date.now() - started) / 1000) + "s";

const watchdog = setTimeout(() => {
  console.error("부팅 워치독 타임아웃 (10분). 마지막 출력:\n" + serial.slice(-1500));
  process.exit(2);
}, 10 * 60 * 1000);

emulator.add_listener("serial0-output-byte", (byte) => {
  serial += String.fromCharCode(byte);
  if (serial.length > 200000) serial = serial.slice(-100000);
  const plain = serial.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  if (phase === "boot" && /root@[^\s]*:[^\n]*#\s*$/.test(plain)) {
    phase = "settle";
    console.log(`[${el()}] 셸 프롬프트 도달. 정리·예열 후 저장…`);
    // 순서가 중요하다: 캐시를 비워 스냅숏을 줄인 "다음", 학습자가 첫 화면에서 칠
    // 도구들(hostnamectl 계열·lsblk·df)을 한 번씩 실행해 그 바이너리·라이브러리만
    // 페이지캐시에 다시 올린다. 예열 없이 저장하면 복원 직후 첫 호출이 디스크
    // 청크 HTTP 페치까지 겹쳐 수 초씩 걸린다. 데몬(hostnamed·timedated)도 이때
    // 기동된 채 저장되고, 이후에는 이미지의 ctl-keepalive 유닛이 상주시킨다.
    emulator.serial0_send(
      "sync; echo 3 > /proc/sys/vm/drop_caches; " +
        "hostnamectl >/dev/null; timedatectl >/dev/null; lsblk >/dev/null; df -hT >/dev/null; " +
        "systemctl is-active ctl-keepalive; systemctl is-system-running\n",
    );
    setTimeout(saveState, 20_000);
  }
});

async function saveState() {
  clearTimeout(watchdog);
  const state = await emulator.save_state();
  fs.writeFileSync(stateFile, new Uint8Array(state));
  console.log(`state.bin 저장: ${(state.byteLength / 1048576).toFixed(1)} MB — zstd 압축 중…`);

  const wslPath = "/mnt/c" + stateFile.slice(2).replace(/\\/g, "/");
  execFileSync(
    "wsl",
    ["-d", "Ubuntu-24.04", "-u", "root", "bash", "-lc", `zstd -19 -T0 -f '${wslPath}' -o '${wslPath}.zst' && ls -l '${wslPath}.zst'`],
    { stdio: "inherit" },
  );
  fs.rmSync(stateFile);

  manifest.hasState = true;
  manifest.stateBuiltAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest) + "\n");
  console.log("manifest.json 갱신 (hasState: true). 완료.");
  await emulator.destroy();
  process.exit(0);
}
