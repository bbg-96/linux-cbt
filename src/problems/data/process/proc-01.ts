import type { Problem } from "../../../engine/types";

export const proc01 = {
  id: "proc-01",
  category: "process",
  title: "폭주 프로세스 종료",
  difficulty: 1,
  scenario:
    "누군가 테스트하다 만 스크립트 rogue.sh 가 백그라운드에서 계속 돌고 있습니다. " +
    "서버 점검 전에 이 프로세스를 정리해야 합니다.\n" +
    "단, 스크립트 파일 자체는 나중에 원인 분석에 필요하니 지우면 안 됩니다.",
  objectives: [
    "실행 중인 rogue.sh 프로세스를 찾아 종료하세요.",
    "/root/work/rogue.sh 파일은 삭제하지 마세요.",
  ],
  setup: [
    "killall -9 rogue.sh 2>/dev/null; true",
    "printf '#!/bin/sh\\nwhile :; do sleep 5; done\\n' > /root/work/rogue.sh",
    "chmod 755 /root/work/rogue.sh",
    "/root/work/rogue.sh &",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "! ps w | grep -v grep | grep -q rogue",
      label: "rogue.sh 프로세스가 종료되었는가",
    },
    { id: "c2", type: "file_exists", path: "/root/work/rogue.sh", label: "스크립트 파일은 남아 있는가" },
  ],
  hints: [
    "실행 중인 프로세스는 ps 로 확인합니다. ps w | grep rogue 로 좁혀 보세요.",
    "PID를 확인했다면 kill <PID>, 또는 이름으로 한 번에: killall rogue.sh",
  ],
  explanation:
    "정답 예시:\n" +
    "ps w | grep rogue        # PID 확인\n" +
    "kill <PID>               # 또는 killall rogue.sh\n\n" +
    "kill 은 기본적으로 TERM(15) 신호를 보내 프로세스에게 정상 종료를 요청합니다. " +
    "ps 출력에서 grep 자기 자신도 걸리는 것을 걸러내려면 grep -v grep 을 덧붙입니다.\n" +
    "프로세스 종료와 파일 삭제는 별개입니다 — 파일을 지워도 이미 뜬 프로세스는 계속 돕니다.",
  verify: { answer: ["killall rogue.sh"] },
} satisfies Problem;
