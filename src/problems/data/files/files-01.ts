import type { Problem } from "../../../engine/types";

export const files01 = {
  id: "files-01",
  category: "files",
  title: "프로젝트 디렉터리 구조 만들기",
  difficulty: 1,
  scenario:
    "새 프로젝트를 시작하게 되었습니다. 팀 규칙에 따라 표준 디렉터리 구조를 만들어야 합니다.\n" +
    "작업 위치는 /root/work 입니다.",
  objectives: [
    "/root/work/project 아래에 src 와 docs 디렉터리를 만드세요.",
    "docs 디렉터리 안에 README.txt 파일을 만들고 내용으로 hello project 를 넣으세요.",
  ],
  checks: [
    { id: "c1", type: "command", cmd: "test -d /root/work/project/src", label: "project/src 디렉터리가 있는가" },
    { id: "c2", type: "command", cmd: "test -d /root/work/project/docs", label: "project/docs 디렉터리가 있는가" },
    {
      id: "c3",
      type: "file_content",
      path: "/root/work/project/docs/README.txt",
      expect: { includes: "hello project" },
      label: "README.txt에 hello project 내용이 있는가",
    },
  ],
  hints: [
    "mkdir 의 -p 옵션을 쓰면 중간 경로까지 한 번에 만들 수 있습니다.",
    "echo hello project > 파일경로 처럼 리다이렉션으로 파일을 만들 수 있습니다.",
  ],
  explanation:
    "정답 예시:\n" +
    "mkdir -p /root/work/project/src /root/work/project/docs\n" +
    "echo hello project > /root/work/project/docs/README.txt\n\n" +
    "mkdir -p 는 중간 디렉터리를 자동으로 만들어 주고, 이미 있어도 오류를 내지 않습니다.\n" +
    "> 리다이렉션은 파일이 없으면 만들고, 있으면 내용을 덮어씁니다.",
} satisfies Problem;
