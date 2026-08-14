// 예열 스냅숏 복원 후 hostnamectl 계열의 응답 시간을 Node에서 측정한다.
// (브라우저 탭이 hidden이면 에뮬레이터가 스로틀링돼 측정이 왜곡된다 — Node는 무관)
// 실행: node scripts/debian-timing-test.mjs
import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import { V86 } from "v86";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const vmDir = path.join(root, "public", "vm");
const debDir = path.join(vmDir, "debian");
const manifest = JSON.parse(fs.readFileSync(path.join(debDir, "manifest.json"), "utf8"));
const rawDir = path.join(root, ".cache", "debian-parts-raw");

if (!manifest.hasState) {
  console.error("hasState=false — build-state-debian.mjs 를 먼저 실행하세요.");
  process.exit(1);
}

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
    url: path.join(rawDir, "rootfs.ext4"),
    size: manifest.diskSize,
    use_parts: true,
    fixed_chunk_size: manifest.chunkSize,
    async: true,
  },
  net_device: { type: "virtio", relay_url: "fetch" },
  initial_state: { url: path.join(debDir, "state.bin.zst") },
});

let serial = "";
emulator.add_listener("serial0-output-byte", (b) => {
  serial += String.fromCharCode(b);
  if (serial.length > 100000) serial = serial.slice(-50000);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runCmd(cmd, timeoutMs = 30000) {
  const tag = "DONE" + Math.random().toString(36).slice(2, 8);
  const mark = serial.length;
  const t0 = performance.now();
  emulator.serial0_send(`${cmd}; echo ${tag.slice(0, 2)}""${tag.slice(2)}\n`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serial.slice(mark).includes(tag)) return Math.round(performance.now() - t0);
    await sleep(15);
  }
  return -1;
}

const started = Date.now();
console.log("스냅숏 복원 중…");
await sleep(4000); // 복원 + 시리얼 안정화
emulator.serial0_send("\n");
await sleep(800);

const results = {};
results["restore_to_shell_s"] = Math.round((Date.now() - started) / 1000);
results["keepalive/hostnamed 상태"] = await (async () => {
  const mark = serial.length;
  emulator.serial0_send('systemctl is-active ctl-keepalive systemd-hostnamed | tr "\\n" " "; echo "ST""ATE_EOF"\n');
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const s = serial.slice(mark);
    if (s.includes("STATE_EOF")) return s.split("\n").filter((l) => /active|inactive|unknown/.test(l))[0]?.trim();
    await sleep(15);
  }
  return "timeout";
})();
results["hostnamectl_1st_ms"] = await runCmd("hostnamectl >/dev/null");
results["hostnamectl_2nd_ms"] = await runCmd("hostnamectl >/dev/null");
results["timedatectl_ms"] = await runCmd("timedatectl >/dev/null");
results["lsblk_ms"] = await runCmd("lsblk >/dev/null");
console.log("\n40초 유휴 후 (keepalive 검증)…");
await sleep(40000);
results["afterIdle_hostnamed"] = await (async () => {
  const mark = serial.length;
  emulator.serial0_send('systemctl is-active systemd-hostnamed; echo "ID""LE_EOF"\n');
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const s = serial.slice(mark);
    if (s.includes("IDLE_EOF")) return /\bactive\b/.test(s) ? "active" : "inactive";
    await sleep(15);
  }
  return "timeout";
})();
results["afterIdle_hostnamectl_ms"] = await runCmd("hostnamectl >/dev/null");

console.log("\n===== 결과 =====");
for (const [k, v] of Object.entries(results)) console.log(`  ${k}: ${v}`);
await emulator.destroy();
process.exit(0);
