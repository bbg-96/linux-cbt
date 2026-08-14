// 빌드 산출물에서 그 사이트가 쓰지 않는 게스트 이미지를 지운다.
// 사용: node scripts/prune-image.mjs <outDir> <keep: alpine|debian>
//
// public/ 전체가 dist 로 복사되므로, 프로필을 나눈 뒤로는 운영 빌드에 debian(190MB),
// 스테이징 빌드에 alpine(72MB)이 딸려 들어간다. 배포 용량과 시간이 그만큼 낭비되고
// gh-pages 브랜치도 같이 부푼다.
import fs from "node:fs";
import path from "node:path";

const [outDir, keep] = process.argv.slice(2);
const PROFILES = ["alpine", "debian"];
if (!outDir || !PROFILES.includes(keep)) {
  console.error("사용: node scripts/prune-image.mjs <outDir> <alpine|debian>");
  process.exit(1);
}

for (const profile of PROFILES) {
  if (profile === keep) continue;
  const dir = path.join(outDir, "vm", profile);
  if (!fs.existsSync(dir)) continue;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`제거: ${dir} (이 사이트는 ${keep} 프로필을 쓴다)`);
}

// 레거시 ISO는 ?legacy 폴백 전용이라 debian 사이트에서는 쓸 일이 없다
if (keep === "debian") {
  const iso = path.join(outDir, "vm", "linux.iso");
  if (fs.existsSync(iso)) {
    fs.rmSync(iso);
    console.log(`제거: ${iso} (레거시 폴백은 alpine 사이트 전용)`);
  }
}
