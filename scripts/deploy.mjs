// 빌드 산출물을 GitHub Pages 브랜치로 배포한다 (git worktree 방식).
//   node scripts/deploy.mjs          → 운영   (dist         → origin/gh-pages)
//   node scripts/deploy.mjs staging  → 스테이징 (dist-staging → staging/gh-pages)
//
// gh-pages npm 패키지는 기존 파일 전부를 argv로 넘겨 Windows에서
// ENAMETOOLONG(1,700+ 파일)이 나므로 사용하지 않는다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const TARGETS = {
  prod: {
    dist: "dist",
    remote: "origin",
    localBranch: "gh-pages",
    worktree: ".gh-pages-worktree",
    buildCmd: "npm run build",
  },
  staging: {
    dist: "dist-staging",
    remote: "staging",
    // 로컬 브랜치 이름은 운영과 겹치면 안 되지만, 원격에는 gh-pages로 올린다
    localBranch: "gh-pages-staging",
    worktree: ".gh-pages-staging-worktree",
    buildCmd: "npm run build:staging",
  },
};

const targetName = process.argv[2] ?? "prod";
const target = TARGETS[targetName];
if (!target) {
  console.error(`알 수 없는 배포 대상: ${targetName} (prod | staging)`);
  process.exit(1);
}

const dist = path.join(root, target.dist);
const wt = path.join(root, target.worktree);
const { remote, localBranch } = target;

const git = (args, cwd = root) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error(`${target.dist}/index.html 이 없습니다. 먼저 ${target.buildCmd} 를 실행하세요.`);
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
      git(["rev-parse", "--verify", `refs/heads/${localBranch}`]);
      return true;
    } catch {
      return false;
    }
  })();
  if (hasLocal) {
    git(["worktree", "add", wt, localBranch]);
  } else {
    // 원격에만 있으면 로컬 브랜치를 만들어 체크아웃, 아예 없으면 고아 브랜치로 시작
    let hasRemote = false;
    try {
      git(["fetch", remote, "gh-pages"]);
      hasRemote = true;
    } catch {
      /* 원격 브랜치 없음 (최초 배포) */
    }
    if (hasRemote) {
      git(["worktree", "add", "-B", localBranch, wt, `${remote}/gh-pages`]);
    } else {
      git(["worktree", "add", "--detach", wt]);
      git(["checkout", "--orphan", localBranch], wt);
      git(["rm", "-rf", "--cached", "."], wt);
    }
  }
  console.log(`${targetName} 워크트리 생성:`, wt);
}

// 워크트리 비우기 (.git 파일 제외) — 삭제된 산출물이 브랜치에 남지 않게
for (const name of fs.readdirSync(wt)) {
  if (name === ".git") continue;
  fs.rmSync(path.join(wt, name), { recursive: true, force: true });
}

// 빌드 산출물 복사 (dotfiles 포함 — .nojekyll)
fs.cpSync(dist, wt, { recursive: true });

git(["add", "-A"], wt);
const status = git(["status", "--porcelain"], wt);
if (status) {
  git(["commit", "-m", `deploy site (${targetName})`], wt);
} else {
  console.log("파일 변경 없음 — 커밋 생략, 푸시만 동기화.");
}
// Pages 브랜치는 빌드 산출물 스냅숏 — 히스토리 보존이 목적이 아니므로 force push
git(["push", "--force", remote, `${localBranch}:gh-pages`], wt);
console.log(`배포 완료 [${targetName}]: ${remote}/gh-pages →`, git(["rev-parse", "--short", "HEAD"], wt));
