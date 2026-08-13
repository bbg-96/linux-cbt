import type { Problem } from "../../../engine/types";

export const arch01 = {
  id: "arch-01",
  category: "archive",
  title: "보고서 디렉터리 백업",
  difficulty: 1,
  scenario:
    "분기 보고서가 담긴 reports 디렉터리를 다른 서버로 옮기기 전에 " +
    "하나의 압축 파일로 묶어야 합니다. 리눅스 표준 형식은 tar + gzip (.tar.gz) 입니다.\n" +
    "주의: 이 서버는 구형 장비라서 tar 에 z(압축) 옵션이 없습니다. " +
    "묶기(tar)와 압축(gzip)을 따로 해야 합니다.",
  objectives: [
    "reports 디렉터리를 tar 로 묶은 뒤 gzip 으로 압축해 /root/work/reports.tar.gz 를 만드세요.",
    "원본 reports 디렉터리는 그대로 두세요.",
  ],
  setup: [
    "mkdir -p /root/work/reports",
    "printf 'Q1 revenue up 12%%\\n' > /root/work/reports/q1.txt",
    "printf 'Q2 flat growth\\n' > /root/work/reports/q2.txt",
    "printf 'Q3 record quarter\\n' > /root/work/reports/q3.txt",
  ],
  checks: [
    { id: "c1", type: "file_exists", path: "/root/work/reports.tar.gz", label: "reports.tar.gz가 생성되었는가" },
    {
      id: "c2",
      type: "command",
      cmd: "zcat /root/work/reports.tar.gz | tar -t | grep -q q1.txt",
      label: "아카이브 안에 보고서 파일이 들어 있는가",
    },
    { id: "c3", type: "command", cmd: "test -d /root/work/reports", label: "원본 디렉터리가 남아 있는가" },
  ],
  hints: [
    "1단계: tar cf reports.tar reports 로 먼저 하나의 tar 파일로 묶습니다.",
    "2단계: gzip reports.tar 를 실행하면 reports.tar 가 reports.tar.gz 로 바뀝니다.",
  ],
  explanation:
    "정답 (/root/work 에서):\n" +
    "tar cf reports.tar reports\n" +
    "gzip reports.tar\n\n" +
    "tar 는 디렉터리 구조와 권한을 보존하며 여러 파일을 하나로 '묶고'(c=create, f=file), " +
    "gzip 이 그 결과를 '압축'합니다. 확장자가 .tar.gz 두 단계인 이유가 바로 이 구조입니다.\n" +
    "묶인 내용 확인은 zcat reports.tar.gz | tar -t 로 할 수 있습니다.\n" +
    "참고: 최신 시스템의 GNU tar 라면 tar czf reports.tar.gz reports 한 줄로 " +
    "두 단계를 동시에 처리할 수 있습니다 (z = gzip).",
} satisfies Problem;
