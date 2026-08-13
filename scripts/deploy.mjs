// dist/ 를 gh-pages 브랜치로 배포한다 (git worktree 방식).
// gh-pages npm 패키지는 기존 파일 전부를 argv로 넘겨 Windows에서
// ENAMETOOLONG(1,700+ 파일)이 나므로 사용하지 않는다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const wt = path.join(root, ".gh-pages-worktree");

const git = (args, cwd = root) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/index.html 이 없습니다. 먼저 npm run build 를 실행하세요.");
  process.exit(1);
}

// 워크트리 준비 (없으면 생성, 잔재가 있으면 정리 후 재생성)
if (!fs.existsSync(wt)) {
  try {
    git(["worktree", "prune"]);
  } catch {
    /* 무시 */
  }
  const hasLocal = (() => {
    try {
      git(["rev-parse", "--verify", "refs/heads/gh-pages"]);
      return true;
    } catch {
      return false;
    }
  })();
  if (hasLocal) {
    git(["worktree", "add", wt, "gh-pages"]);
  } else {
    // 원격에만 있으면 로컬 브랜치를 만들어 체크아웃, 아예 없으면 고아 브랜치로 시작
    let hasRemote = false;
    try {
      git(["fetch", "origin", "gh-pages"]);
      hasRemote = true;
    } catch {
      /* 원격 브랜치 없음 */
    }
    if (hasRemote) {
      git(["worktree", "add", "-B", "gh-pages", wt, "origin/gh-pages"]);
    } else {
      git(["worktree", "add", "--detach", wt]);
      git(["checkout", "--orphan", "gh-pages"], wt);
      git(["rm", "-rf", "--cached", "."], wt);
    }
  }
  console.log("gh-pages 워크트리 생성:", wt);
}

// 워크트리 비우기 (.git 파일 제외) — 삭제된 산출물이 브랜치에 남지 않게
for (const name of fs.readdirSync(wt)) {
  if (name === ".git") continue;
  fs.rmSync(path.join(wt, name), { recursive: true, force: true });
}

// dist 복사 (dotfiles 포함 — .nojekyll)
fs.cpSync(dist, wt, { recursive: true });

git(["add", "-A"], wt);
const status = git(["status", "--porcelain"], wt);
if (status) {
  git(["commit", "-m", "deploy site"], wt);
} else {
  console.log("파일 변경 없음 — 커밋 생략, 푸시만 동기화.");
}
// gh-pages는 빌드 산출물 스냅숏 브랜치 — 히스토리 보존이 목적이 아니므로 force push
git(["push", "--force", "origin", "gh-pages"], wt);
console.log("배포 완료: gh-pages →", git(["rev-parse", "--short", "HEAD"], wt));
