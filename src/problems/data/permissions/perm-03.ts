import type { Problem } from "../../../engine/types";

export const perm03 = {
  id: "perm-03",
  category: "permissions",
  title: "파일 소유권 인수인계",
  difficulty: 2,
  scenario:
    "동료 worker 계정에게 업무를 인수인계하게 되었습니다. 인수인계 문서 handover.txt 를 " +
    "worker 가 소유하도록 넘겨주고, 권한도 정리해야 합니다.\n" +
    "(worker 계정은 이미 생성되어 있습니다)",
  objectives: [
    "handover.txt 의 소유자(user)를 worker 로 변경하세요.",
    "handover.txt 의 그룹(group)도 worker 로 변경하세요.",
    "권한을 640 (rw- r-- ---) 으로 설정하세요.",
  ],
  setup: [
    "adduser -D worker 2>/dev/null; true",
    "printf 'project A: deploy every friday\\n' > /root/work/handover.txt",
    "chmod 644 /root/work/handover.txt",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "test \"$(ls -ld /root/work/handover.txt | awk '{print $3}')\" = worker",
      label: "소유자가 worker인가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "test \"$(ls -ld /root/work/handover.txt | awk '{print $4}')\" = worker",
      label: "그룹이 worker인가",
    },
    { id: "c3", type: "file_mode", path: "/root/work/handover.txt", mode: "640", label: "권한이 640인가" },
  ],
  hints: [
    "소유자 변경은 chown, 그룹 변경은 chgrp 입니다. 현재 소유자는 ls -l 로 확인합니다.",
    "chown 사용자:그룹 파일 형태로 소유자와 그룹을 한 번에 바꿀 수 있습니다.",
  ],
  explanation:
    "정답 예시:\n" +
    "chown worker:worker /root/work/handover.txt\n" +
    "chmod 640 /root/work/handover.txt\n\n" +
    "chown user:group 문법으로 소유자와 그룹을 동시에 변경할 수 있습니다 " +
    "(chown worker 파일 + chgrp worker 파일 두 번으로 나눠도 됩니다).\n" +
    "640 = rw- r-- --- : 소유자는 읽기·쓰기, 같은 그룹은 읽기만, 그 외에는 접근 불가. " +
    "팀 내 공유 문서에 자주 쓰는 패턴입니다.",
  verify: {
    answer: ["chown worker:worker /root/work/handover.txt", "chmod 640 /root/work/handover.txt"],
  },
} satisfies Problem;
