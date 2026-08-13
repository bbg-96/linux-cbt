import type { Problem } from "../../../engine/types";

export const arch02 = {
  id: "arch-02",
  category: "archive",
  title: "백업 파일 복원",
  difficulty: 2,
  tags: ["tar xzf", "-C", "tar tzf"],
  scenario:
    "이전 담당자가 남긴 backup.tar.gz 파일이 있습니다. 원본 디렉터리는 이미 삭제된 " +
    "상태라 이 아카이브가 유일한 사본입니다.\n" +
    "내용을 먼저 확인하고 restore 디렉터리 아래에 복원하세요.",
  objectives: [
    "/root/work/restore 디렉터리를 만들고 backup.tar.gz 를 그 안에 풀어놓으세요.",
    "backup.tar.gz 원본 파일은 삭제하지 마세요.",
  ],
  setup: [
    "mkdir -p /tmp/.seed/data",
    "printf 'retention=30\\n' > /tmp/.seed/data/config.txt",
    "printf 'alpha\\nbeta\\ngamma\\n' > /tmp/.seed/data/list.txt",
    "cd /tmp/.seed && tar czf /root/work/backup.tar.gz data",
    "cd /root; rm -rf /tmp/.seed",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "test -f /root/work/restore/data/config.txt",
      label: "restore 아래에 data/config.txt가 복원되었는가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/restore/data/list.txt",
      expect: { includes: "gamma" },
      label: "파일 내용이 온전한가",
    },
    { id: "c3", type: "file_exists", path: "/root/work/backup.tar.gz", label: "원본 아카이브가 남아 있는가" },
  ],
  hints: [
    "풀기 전에 tar tzf backup.tar.gz 로 내용을 미리 볼 수 있습니다.",
    "tar 의 x(extract) 옵션으로 풀고, -C 디렉터리 로 풀 위치를 지정합니다: tar xzf backup.tar.gz -C restore",
  ],
  explanation:
    "정답 (/root/work 에서):\n" +
    "mkdir restore\n" +
    "tar xzf backup.tar.gz -C restore\n\n" +
    "x(extract)는 c(create)의 반대입니다. -C 는 '풀기 전에 해당 디렉터리로 이동'을 " +
    "의미하므로 아카이브 내부 경로(data/…)가 restore/ 아래에 만들어집니다.\n" +
    "모르는 아카이브는 풀기 전에 tar tzf 로 내용을 먼저 확인하는 습관이 중요합니다 — " +
    "최상위 디렉터리 없이 파일이 잔뜩 쏟아지는 'tar 폭탄'을 피할 수 있습니다.\n" +
    "참고: z 옵션이 없는 구형 tar 에서는 zcat backup.tar.gz | tar x -C restore 처럼 " +
    "zcat 과 파이프를 조합합니다.",
  verify: { answer: ["cd /root/work; mkdir restore; tar xzf backup.tar.gz -C restore"] },
} satisfies Problem;
