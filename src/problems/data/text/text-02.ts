import type { Problem } from "../../../engine/types";

export const text02 = {
  id: "text-02",
  category: "text",
  title: "중복 제거된 사용자 명단",
  difficulty: 2,
  tags: ["sort", "uniq", "파이프"],
  commands: ["sort", "uniq"],
  scenario:
    "여러 이벤트 참가 신청서를 합쳐 놓은 users.txt 가 있습니다. 같은 사람이 여러 번 " +
    "신청해서 중복이 많고 순서도 뒤죽박죽입니다.\n" +
    "정렬된 고유 명단이 필요합니다.",
  objectives: [
    "users.txt 를 알파벳순으로 정렬하고 중복을 제거해 /root/work/unique.txt 로 저장하세요.",
  ],
  setup: [
    "printf 'mike\\nsara\\njohn\\nsara\\nmike\\nanna\\njohn\\nmike\\n' > /root/work/users.txt",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/unique.txt",
      expect: { equals: "anna\njohn\nmike\nsara" },
      label: "정렬된 고유 명단과 일치하는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: 'test "$(wc -l < /root/work/unique.txt)" -eq 4',
      label: "라인 수가 4인가",
    },
  ],
  hints: [
    "sort 는 라인을 정렬하고, uniq 는 연속된 중복 라인을 제거합니다. 파이프(|)로 이을 수 있습니다.",
    "uniq 는 이웃한 중복만 없애므로 반드시 sort 를 먼저 해야 합니다: sort users.txt | uniq > unique.txt",
  ],
  explanation:
    "정답 예시:\n" +
    "sort /root/work/users.txt | uniq > /root/work/unique.txt\n" +
    "(또는 한 번에: sort -u /root/work/users.txt > /root/work/unique.txt)\n\n" +
    "파이프(|)는 앞 명령의 출력을 뒤 명령의 입력으로 넘깁니다. " +
    "uniq 는 '연속된' 중복만 제거하기 때문에 정렬이 선행되어야 정확합니다. " +
    "sort -u 는 정렬과 중복 제거를 한 번에 처리하는 단축형입니다.",
  verify: { answer: ["sort /root/work/users.txt | uniq > /root/work/unique.txt"] },
} satisfies Problem;
