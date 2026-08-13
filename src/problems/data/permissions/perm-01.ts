import type { Problem } from "../../../engine/types";

export const perm01 = {
  id: "perm-01",
  category: "permissions",
  title: "백업 스크립트 실행 권한",
  difficulty: 1,
  scenario:
    "당신은 서버 관리자입니다. 새로 배포된 백업 스크립트가 예약 작업에서 실행되지 않고 " +
    "'Permission denied' 오류만 남기고 있습니다.\n" +
    "확인해 보니 /root/work/backup.sh 파일에 실행 권한이 없습니다.",
  objectives: [
    "backup.sh의 권한을 rwxr--r-- (744)로 변경하세요.",
    "./backup.sh 로 직접 실행해 'backup done'이 출력되는지 확인하세요.",
  ],
  setup: [
    "printf '#!/bin/sh\\necho backup done\\n' > /root/work/backup.sh",
    "chmod 644 /root/work/backup.sh",
  ],
  checks: [
    { id: "c1", type: "file_exists", path: "/root/work/backup.sh", label: "backup.sh가 존재하는가" },
    { id: "c2", type: "file_mode", path: "/root/work/backup.sh", mode: "744", label: "권한이 744(rwxr--r--)인가" },
    {
      id: "c3",
      type: "command",
      cmd: "/root/work/backup.sh",
      expect: { includes: "backup done" },
      label: "스크립트가 정상 실행되는가",
    },
  ],
  hints: [
    "파일 권한은 chmod 명령으로 변경합니다. 현재 권한은 ls -l 로 확인해 보세요.",
    "숫자 모드에서 r=4, w=2, x=1 입니다. rwx=7, r--=4 이므로 744가 됩니다.",
  ],
  explanation:
    "정답: chmod 744 /root/work/backup.sh\n\n" +
    "rwx r-- r-- = (4+2+1)(4)(4) = 744.\n" +
    "소유자는 읽기·쓰기·실행이 모두 가능하고, 그룹과 기타 사용자는 읽기만 가능합니다.\n" +
    "실행 권한(x)이 없는 스크립트는 ./backup.sh 형태로 실행할 수 없습니다. " +
    "chmod u+x backup.sh 처럼 심볼릭 모드로 실행 권한만 추가한 뒤 " +
    "chmod go-w 등으로 조정하는 방법도 있습니다.",
  verify: { answer: ["chmod 744 /root/work/backup.sh"] },
} satisfies Problem;
