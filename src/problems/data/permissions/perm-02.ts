import type { Problem } from "../../../engine/types";

export const perm02 = {
  id: "perm-02",
  category: "permissions",
  title: "민감 파일 접근 제한",
  difficulty: 1,
  tags: ["chmod", "600/644"],
  scenario:
    "보안 점검에서 지적을 받았습니다. DB 비밀번호가 들어 있는 secret.txt 가 " +
    "모든 사용자에게 읽기·쓰기(666)로 열려 있습니다.\n" +
    "반면 공지 파일 public.txt 는 누구나 읽을 수 있어야 하는데 실수로 쓰기 권한까지 열려 있습니다.",
  objectives: [
    "secret.txt 는 소유자만 읽고 쓸 수 있게 (600) 변경하세요.",
    "public.txt 는 소유자는 읽기·쓰기, 나머지는 읽기만 (644) 가능하게 변경하세요.",
  ],
  setup: [
    "printf 'db_password=s3cret!\\n' > /root/work/secret.txt",
    "printf 'notice: maintenance at 2am\\n' > /root/work/public.txt",
    "chmod 666 /root/work/secret.txt /root/work/public.txt",
  ],
  checks: [
    { id: "c1", type: "file_mode", path: "/root/work/secret.txt", mode: "600", label: "secret.txt 권한이 600인가" },
    { id: "c2", type: "file_mode", path: "/root/work/public.txt", mode: "644", label: "public.txt 권한이 644인가" },
  ],
  hints: [
    "현재 권한은 ls -l 로 확인합니다. rw-rw-rw- 가 666 입니다.",
    "chmod 600 파일, chmod 644 파일 처럼 숫자 모드로 한 번에 지정할 수 있습니다.",
  ],
  explanation:
    "정답:\n" +
    "chmod 600 /root/work/secret.txt\n" +
    "chmod 644 /root/work/public.txt\n\n" +
    "600 = rw- --- --- : 소유자만 읽기·쓰기. 비밀키, 자격증명 파일의 표준 권한입니다 " +
    "(예: SSH 개인키는 600이 아니면 접속이 거부됩니다).\n" +
    "644 = rw- r-- r-- : 소유자만 수정하고 나머지는 읽기 전용. 일반 문서/설정의 기본값입니다.",
  verify: {
    answer: ["chmod 600 /root/work/secret.txt", "chmod 644 /root/work/public.txt"],
  },
} satisfies Problem;
