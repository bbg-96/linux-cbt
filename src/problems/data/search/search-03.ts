import type { Problem } from "../../../engine/types";

export const search03 = {
  id: "search-03",
  category: "search",
  title: "ripgrep으로 TODO 사냥",
  difficulty: 2,
  tags: ["rg", "-l", "-c"],
  scenario:
    "코드 리뷰 전에 소스 트리에 남아 있는 TODO 주석을 정리하기로 했습니다.\n" +
    "이럴 때는 grep -r 보다 빠르고 출력이 깔끔한 ripgrep(rg)이 편합니다. " +
    "rg 는 기본으로 재귀 검색을 하고, .gitignore 를 자동으로 존중하는 현대적 검색 도구입니다.",
  objectives: [
    "rg 로 src 아래에서 TODO 가 들어 있는 '파일 목록'을 /root/work/files.txt 에 저장하세요 (rg -l).",
    "src/util/helper.c 파일 안의 TODO '개수'를 /root/work/count.txt 에 저장하세요 (rg -c).",
  ],
  setup: [
    "mkdir -p /root/work/src/net /root/work/src/util",
    "printf '// TODO: refactor init\\nint main() { return 0; }\\n' > /root/work/src/main.c",
    "printf 'void a() {}\\n// TODO: add tests\\n// TODO: handle null\\n// TODO: cleanup\\n' > /root/work/src/util/helper.c",
    "printf 'int s() { return 1; }\\n' > /root/work/src/net/socket.c",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "grep -q main.c /root/work/files.txt && grep -q helper.c /root/work/files.txt",
      label: "TODO가 있는 두 파일이 목록에 있는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "! grep -q socket.c /root/work/files.txt",
      label: "TODO가 없는 파일은 목록에 없는가",
    },
    {
      id: "c3",
      type: "command",
      cmd: "test \"$(sed 's/.*://' /root/work/count.txt)\" = 3",
      label: "helper.c의 TODO가 3개로 집계됐는가",
    },
  ],
  hints: [
    "rg 패턴 디렉터리 로 검색합니다. -l 은 매치된 파일 이름만 출력합니다.",
    "-c 는 파일별 매치 라인 수를 출력합니다: rg -c TODO src/util/helper.c",
  ],
  explanation:
    "정답 (/root/work 에서):\n" +
    "rg -l TODO src > files.txt\n" +
    "rg -c TODO src/util/helper.c > count.txt\n\n" +
    "rg(ripgrep)는 grep 을 현대적으로 재구현한 도구입니다. 디렉터리를 주면 자동으로 " +
    "재귀 검색하고(-r 불필요), .gitignore 에 있는 파일을 건너뛰며, 매우 빠릅니다.\n" +
    "-l = 파일 이름만, -c = 파일별 매치 수, -n = 라인 번호(기본 켜짐).\n" +
    "전통적 등가 명령은 grep -rl TODO src, grep -c TODO 파일 입니다 — " +
    "rg 가 없는 서버에서는 여전히 grep 이 표준이니 둘 다 알아 두세요.",
  verify: {
    answer: [
      "cd /root/work; rg -l TODO src > files.txt",
      "cd /root/work; rg -c TODO src/util/helper.c > count.txt",
    ],
  },
} satisfies Problem;
