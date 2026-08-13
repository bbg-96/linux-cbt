import type { Problem } from "../../../engine/types";

export const proc03 = {
  id: "proc-03",
  category: "process",
  title: "죽지 않는 프로세스 강제 종료",
  difficulty: 3,
  tags: ["kill -9", "trap", "SIGKILL"],
  scenario:
    "stubborn.sh 프로세스가 떠 있는데, kill 로 종료 신호를 보내도 죽지 않습니다. " +
    "이 스크립트는 TERM 신호를 무시하도록 작성되어 있기 때문입니다.\n" +
    "이런 프로세스를 정리하는 마지막 수단을 사용해야 합니다.",
  objectives: [
    "stubborn.sh 프로세스를 종료하세요 (일반 kill 은 통하지 않습니다).",
    "/root/work/stubborn.sh 파일은 남겨 두세요.",
  ],
  setup: [
    "killall -9 stubborn.sh 2>/dev/null; true",
    "printf '#!/bin/sh\\ntrap \"\" TERM\\nwhile :; do sleep 5; done\\n' > /root/work/stubborn.sh",
    "chmod 755 /root/work/stubborn.sh",
    "/root/work/stubborn.sh &",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "! ps w | grep -v grep | grep -q stubborn",
      label: "stubborn.sh 프로세스가 종료되었는가",
    },
    { id: "c2", type: "file_exists", path: "/root/work/stubborn.sh", label: "스크립트 파일은 남아 있는가" },
  ],
  hints: [
    "먼저 ps w | grep stubborn 으로 PID를 찾고 kill <PID> 를 시도해 보세요 — 안 죽는 것을 직접 확인해 보세요.",
    "TERM(15)은 프로세스가 무시할 수 있지만, KILL(9) 신호는 무시할 수 없습니다: kill -9 <PID>",
  ],
  explanation:
    "정답 예시:\n" +
    "ps w | grep stubborn     # PID 확인\n" +
    "kill <PID>               # → trap 때문에 무시됨\n" +
    "kill -9 <PID>            # 또는 killall -9 stubborn.sh\n\n" +
    "kill 의 기본 신호 TERM(15)은 '정리하고 종료해 달라'는 요청이라 프로세스가 " +
    "trap 으로 무시하거나 정리 작업 후 종료할 수 있습니다. 반면 KILL(9)은 커널이 " +
    "프로세스를 즉시 제거하므로 무시가 불가능합니다.\n" +
    "단, -9 는 프로세스에게 정리할 기회를 주지 않아 임시 파일이나 락이 남을 수 있으니 " +
    "항상 일반 kill 을 먼저 시도하는 것이 올바른 순서입니다.",
  verify: { answer: ["killall -9 stubborn.sh"] },
} satisfies Problem;
