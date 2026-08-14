// P2 게이트: Debian 이미지가 v86에서 실제로 부팅하는지 Node에서 검증한다.
// 실행: node scripts/debian-boot-test.mjs
//
// 브라우저로 옮기기 전에 여기서 걸러내려는 것들:
//  - 비-PAE 커널이 v86에서 뜨는가 (PAE면 부팅 도중 멈춘다)
//  - ATA 디스크(ext4 통짜)를 initrd가 찾아 루트로 마운트하는가
//  - systemd가 PID 1로 올라오고 ttyS0 자동 로그인까지 도달하는가
//  - hostnamectl·timedatectl·lsblk·systemctl 이 실제로 동작하는가
import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import { V86 } from "v86";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const vmDir = path.join(root, "public", "vm");
const debDir = path.join(vmDir, "debian");

const manifestPath = path.join(debDir, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error("public/vm/debian/manifest.json 이 없습니다. image/debian/build.sh 를 먼저 실행하세요.");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
console.log("manifest:", manifest);

// Node에서는 청크 파일을 직접 읽어 하나의 버퍼로 복원한다 (브라우저는 URL로 lazy fetch).
// 검증 단계에서는 "부팅이 되는가"만 보면 되므로 통짜 버퍼가 가장 단순하다.
const partsDir = path.join(debDir, "parts");
const chunk = manifest.chunkSize;
const total = manifest.diskSize;
console.log(`디스크 조립 중… ${(total / 1048576).toFixed(0)} MiB`);
// zstd 해제는 Node 내장 zlib을 쓴다 (Windows에는 zstd 바이너리가 없다)
const zlib = await import("node:zlib");
if (typeof zlib.zstdDecompressSync !== "function") {
  console.error("이 Node 버전에는 zstdDecompressSync가 없습니다 (Node 22.15+ 필요).");
  process.exit(1);
}
// v86은 ArrayBuffer만 버퍼로 인식한다 (Node Buffer를 주면 url 경로로 빠져 죽는다)
const disk = new Uint8Array(total);
for (let off = 0; off < total; off += chunk) {
  const f = path.join(partsDir, `rootfs-${off}-${off + chunk}.ext4.zst`);
  disk.set(new Uint8Array(zlib.zstdDecompressSync(fs.readFileSync(f))), off);
}
console.log("디스크 조립 완료");

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
  cmdline: "root=/dev/sda rw rootfstype=ext4 console=ttyS0,115200 net.ifnames=0 systemd.show_status=1",
  hda: { buffer: disk.buffer },
  net_device: { type: "virtio", relay_url: "fetch" },
});

let serial = "";
let phase = "boot";
const started = Date.now();
const el = (t) => Math.round((Date.now() - started) / 1000) + "s";

const watchdog = setTimeout(() => {
  console.error(`\n[${el()}] 부팅 워치독 타임아웃. 마지막 출력:\n` + serial.slice(-3000));
  process.exit(2);
}, 10 * 60 * 1000);

const milestones = [
  [/Linux version /, "커널 진입"],
  [/systemd\[1\]/, "systemd PID 1"],
  [/Reached target|Startup finished|Welcome to Debian/i, "부팅 완료 근접"],
];
const seen = new Set();

emulator.add_listener("serial0-output-byte", (byte) => {
  const ch = String.fromCharCode(byte);
  serial += ch;
  process.stdout.write(ch); // 진행 상황을 그대로 보여준다 (문제 진단용)
  if (serial.length > 400000) serial = serial.slice(-200000);

  for (const [re, name] of milestones) {
    if (!seen.has(name) && re.test(serial)) {
      seen.add(name);
      console.log(`\n>>> [${el()}] ${name}`);
    }
  }

  // 프롬프트 도달 판정: 자동 로그인 후 셸 프롬프트 (root@localhost:~#)
  if (phase === "boot" && /root@[^\s]*:[^\n]*[#$]\s*$/.test(serial.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ""))) {
    phase = "shell";
    console.log(`\n>>> [${el()}] 셸 프롬프트 도달 — 명령 검증 시작`);
    setTimeout(runChecks, 2000);
  }
});

async function runChecks() {
  const cmds = [
    "hostnamectl",
    "timedatectl",
    "lsblk",
    "systemctl is-system-running",
    "systemctl --no-pager --type=service --state=running | head -8",
    "cat /etc/os-release | head -3",
    "uname -r",
    "df -hT /",
    "free -h",
    "dmesg | grep -ci 'Oops:\\|BUG:'",
  ];
  for (const c of cmds) {
    console.log(`\n\n===== $ ${c} =====`);
    emulator.serial0_send(c + "\n");
    await new Promise((r) => setTimeout(r, 4000));
  }
  clearTimeout(watchdog);
  console.log(`\n\n>>> [${el()}] 검증 명령 실행 완료. 스냅숏 저장 중…`);
  const state = await emulator.save_state();
  const out = path.join(debDir, "state.bin");
  fs.writeFileSync(out, new Uint8Array(state));
  console.log(`>>> state.bin 저장: ${(state.byteLength / 1048576).toFixed(1)} MB`);
  await emulator.destroy();
  process.exit(0);
}
