// Alpine 부트 스냅숏 생성기 — Node에서 libv86로 부팅한 뒤 save_state를 저장한다.
// 실행: node scripts/build-state.mjs   (public/vm/alpine 이미지가 먼저 있어야 함)
// 압축(zstd)은 WSL Ubuntu-24.04를 호출한다.
//
// !! V86 옵션은 src/vm/vmConfig.ts 의 alpine 분기와 반드시 일치해야 한다 !!
// (기기 구성이 다르면 initial_state 복원이 실패한다. vmService는 복원 실패 시
//  콜드 부팅으로 폴백하므로 사이트가 죽지는 않지만, 스냅숏이 무용지물이 된다.)
import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { V86 } from "v86";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const vmDir = path.join(root, "public", "vm");
const alpineDir = path.join(vmDir, "alpine");
const stateFile = path.join(alpineDir, "state.bin");

if (!fs.existsSync(path.join(alpineDir, "fs.json"))) {
  console.error("public/vm/alpine/fs.json 이 없습니다. image/alpine/build.sh 를 먼저 실행하세요.");
  process.exit(1);
}

// vmConfig.ts alpine 분기와 동일하게 유지할 것
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
  filesystem: {
    baseurl: path.join(alpineDir, "rootfs-flat") + path.sep,
    basefs: path.join(alpineDir, "fs.json"),
  },
  bzimage_initrd_from_filesystem: true,
  cmdline:
    "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose modules=virtio_pci tsc=reliable console=ttyS0",
  net_device: { type: "virtio", relay_url: "fetch" },
});

console.log("부팅 중… (수 분 걸릴 수 있음)");

let serialText = "";
let phase = "boot";
const started = Date.now();

const watchdog = setTimeout(() => {
  console.error("부팅 워치독 타임아웃 (5분). 마지막 출력:\n" + serialText.slice(-500));
  process.exit(2);
}, 5 * 60 * 1000);

emulator.add_listener("serial0-output-byte", (byte) => {
  serialText += String.fromCharCode(byte);
  if (serialText.length > 20000) serialText = serialText.slice(-10000);

  if (phase === "boot" && serialText.endsWith("localhost:~# ")) {
    phase = "settle";
    console.log(`셸 프롬프트 도달 (${Math.round((Date.now() - started) / 1000)}s). 캐시 정리 후 저장…`);
    emulator.serial0_send("sync; echo 3 > /proc/sys/vm/drop_caches\n");
    setTimeout(saveState, 10_000);
  }
});

async function saveState() {
  clearTimeout(watchdog);
  const state = await emulator.save_state();
  fs.writeFileSync(stateFile, new Uint8Array(state));
  console.log(`state.bin 저장: ${(state.byteLength / 1024 / 1024).toFixed(1)} MB — zstd 압축 중…`);

  const wslPath = "/mnt/c" + stateFile.slice(2).replace(/\\/g, "/");
  execFileSync("wsl", ["-d", "Ubuntu-24.04", "-u", "root", "bash", "-lc", `zstd -19 -T0 -f '${wslPath}' -o '${wslPath}.zst' && ls -l '${wslPath}.zst'`], {
    stdio: "inherit",
  });
  fs.rmSync(stateFile); // 압축본만 서빙

  const manifestPath = path.join(alpineDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const fsJson = fs.readFileSync(path.join(alpineDir, "fs.json"));
  manifest.fsJsonSha256 = crypto.createHash("sha256").update(fsJson).digest("hex");
  manifest.hasState = true;
  manifest.stateBuiltAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest) + "\n");
  console.log("manifest.json 갱신 (hasState: true). 완료.");
  await emulator.destroy();
  process.exit(0);
}
