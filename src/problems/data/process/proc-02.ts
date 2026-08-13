import type { Problem } from "../../../engine/types";

export const proc02 = {
  id: "proc-02",
  category: "process",
  title: "백그라운드 실행과 로그 남기기",
  difficulty: 2,
  scenario:
    "오래 걸리는 작업 스크립트 long_task.sh 를 실행해야 합니다. 그런데 그냥 실행하면 " +
    "터미널이 묶여서 다른 일을 못 합니다.\n" +
    "백그라운드로 돌리되, 출력은 나중에 확인할 수 있게 로그 파일로 남기세요.",
  objectives: [
    "long_task.sh 를 백그라운드로 실행하세요.",
    "표준 출력과 표준 에러를 모두 /root/work/task.log 로 리다이렉션하세요.",
    "채점 시점에 프로세스가 계속 실행 중이어야 합니다.",
  ],
  setup: [
    "killall -9 long_task.sh 2>/dev/null; true",
    "printf '#!/bin/sh\\nwhile :; do echo working; sleep 3; done\\n' > /root/work/long_task.sh",
    "chmod 755 /root/work/long_task.sh",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "ps w | grep -v grep | grep -q long_task",
      label: "long_task.sh가 실행 중인가",
    },
    { id: "c2", type: "file_exists", path: "/root/work/task.log", label: "task.log 파일이 있는가" },
    {
      id: "c3",
      type: "command",
      cmd: "grep -q working /root/work/task.log",
      label: "출력이 로그 파일로 리다이렉션되는가",
    },
  ],
  hints: [
    "명령 끝에 & 를 붙이면 백그라운드로 실행됩니다.",
    "2>&1 은 표준 에러를 표준 출력과 같은 곳으로 보냅니다: ./long_task.sh > task.log 2>&1 &",
  ],
  explanation:
    "정답 (/root/work 에서):\n" +
    "./long_task.sh > task.log 2>&1 &\n\n" +
    "& 는 셸이 명령의 종료를 기다리지 않게 합니다(백그라운드 잡). " +
    "> task.log 는 표준 출력(fd 1)을 파일로, 2>&1 은 표준 에러(fd 2)를 " +
    "표준 출력이 가는 곳(= task.log)으로 보냅니다. 순서가 중요합니다 — " +
    "2>&1 > task.log 로 쓰면 에러는 화면에 남습니다.\n" +
    "실행 중인 잡은 ps 로, 로그는 tail task.log 로 확인할 수 있습니다.",
} satisfies Problem;
