// node_modules/v86의 wasm을 public/vm으로 복사한다 (dev/build 공통 서빙 경로).
// package.json의 predev/prebuild/postinstall에서 실행된다.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "vm");
mkdirSync(dest, { recursive: true });

for (const f of ["v86.wasm", "v86-fallback.wasm"]) {
  copyFileSync(join(root, "node_modules", "v86", "build", f), join(dest, f));
}
console.log("[copy-v86-assets] v86 wasm -> public/vm 완료");
