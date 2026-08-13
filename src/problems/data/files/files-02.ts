import type { Problem } from "../../../engine/types";

export const files02 = {
  id: "files-02",
  category: "files",
  title: "로그 파일 정리",
  difficulty: 1,
  tags: ["mv", "rm", "*.log"],
  commands: ["mv", "rm"],
  scenario:
    "서비스 로그 디렉터리가 정리되지 않은 채 방치되어 있습니다. /root/work/logs 안에 " +
    "로그 파일(.log)과 메모, 임시 파일이 섞여 있습니다.\n" +
    "로그 보관 정책에 따라 로그 파일만 별도 디렉터리로 옮기고 임시 파일은 삭제해야 합니다.",
  objectives: [
    "/root/work/archive 디렉터리를 만들고, logs 안의 *.log 파일을 모두 그리로 이동하세요 (복사가 아니라 이동).",
    "logs/temp.tmp 임시 파일을 삭제하세요.",
    "logs/note.txt 는 그대로 남겨 두세요.",
  ],
  setup: [
    "mkdir -p /root/work/logs",
    "printf 'app log data\\n' > /root/work/logs/app.log",
    "printf 'db log data\\n' > /root/work/logs/db.log",
    "printf 'do not delete me\\n' > /root/work/logs/note.txt",
    "printf 'temporary junk\\n' > /root/work/logs/temp.tmp",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "test -f /root/work/archive/app.log -a -f /root/work/archive/db.log",
      label: "archive에 두 로그 파일이 있는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "! test -e /root/work/logs/app.log -o -e /root/work/logs/db.log",
      label: "logs에서 로그 파일이 이동되었는가 (복사 아님)",
    },
    { id: "c3", type: "file_exists", path: "/root/work/logs/note.txt", label: "note.txt는 남아 있는가" },
    { id: "c4", type: "command", cmd: "! test -e /root/work/logs/temp.tmp", label: "temp.tmp가 삭제되었는가" },
  ],
  hints: [
    "와일드카드 *.log 로 여러 파일을 한 번에 다룰 수 있습니다.",
    "이동은 mv, 삭제는 rm 입니다. mv logs/*.log archive/ 형태를 생각해 보세요.",
  ],
  explanation:
    "정답 예시:\n" +
    "mkdir /root/work/archive\n" +
    "mv /root/work/logs/*.log /root/work/archive/\n" +
    "rm /root/work/logs/temp.tmp\n\n" +
    "cp 는 원본을 남기지만 mv 는 파일을 옮깁니다. 셸이 *.log 를 " +
    "app.log db.log 로 확장(글로빙)해 주기 때문에 파일을 일일이 지정할 필요가 없습니다.",
  verify: {
    answer: [
      "mkdir /root/work/archive",
      "mv /root/work/logs/app.log /root/work/logs/db.log /root/work/archive/",
      "rm /root/work/logs/temp.tmp",
    ],
  },
} satisfies Problem;
