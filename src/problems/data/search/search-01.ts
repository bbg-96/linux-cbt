import type { Problem } from "../../../engine/types";

export const search01 = {
  id: "search-01",
  category: "search",
  title: "흩어진 로그 파일 찾기",
  difficulty: 1,
  tags: ["find", "-name", "-type f"],
  scenario:
    "장애 조사를 위해 app 디렉터리 곳곳에 흩어진 로그 파일(.log)의 전체 목록이 필요합니다. " +
    "하위 디렉터리가 여러 단계라 ls 로는 다 볼 수 없습니다.\n" +
    "주의: data/app.log 는 파일이 아니라 '디렉터리'입니다. 파일만 골라내야 합니다.",
  objectives: [
    "app 디렉터리 아래의 모든 *.log '파일'을 찾아 전체 경로를 /root/work/logs.txt 에 저장하세요.",
    "이름만 .log 인 디렉터리는 결과에 포함되면 안 됩니다.",
  ],
  setup: [
    "mkdir -p /root/work/app/src /root/work/app/logs/archive /root/work/app/data/app.log",
    "printf 'server started\\n' > /root/work/app/logs/server.log",
    "printf 'rotated\\n' > /root/work/app/logs/archive/old.log",
    "printf 'debug on\\n' > /root/work/app/src/debug.log",
    "printf 'not a log\\n' > /root/work/app/data/readme.txt",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/logs.txt",
      expect: { includes: "app/logs/archive/old.log" },
      label: "깊은 하위 경로까지 찾았는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "test \"$(grep -c '\\.log$' /root/work/logs.txt)\" = 3",
      label: "로그 파일이 정확히 3개인가",
    },
    {
      id: "c3",
      type: "command",
      cmd: "! grep -q data/app.log /root/work/logs.txt",
      label: "디렉터리(data/app.log)는 제외했는가",
    },
  ],
  hints: [
    "find 디렉터리 -name 패턴 형태로 재귀 검색합니다. 패턴은 따옴표로 감싸세요: -name \"*.log\"",
    "-type f 를 붙이면 일반 파일만, -type d 는 디렉터리만 찾습니다.",
  ],
  explanation:
    "정답:\n" +
    "find /root/work/app -name \"*.log\" -type f > /root/work/logs.txt\n\n" +
    "find 는 디렉터리 트리를 재귀로 내려가며 조건에 맞는 항목을 찾습니다. " +
    "-name 은 이름 패턴(글롭), -type f 는 일반 파일만으로 제한합니다.\n" +
    "-type 을 빼면 이름이 app.log 인 '디렉터리'도 결과에 섞입니다 — " +
    "find 의 조건들은 AND 로 결합되므로 필요한 조건을 겹겹이 쌓는 것이 요령입니다.",
  verify: {
    answer: ['find /root/work/app -name "*.log" -type f > /root/work/logs.txt'],
  },
} satisfies Problem;
