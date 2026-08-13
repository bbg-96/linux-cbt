import type { Problem } from "../../../engine/types";

export const arch01 = {
  id: "arch-01",
  category: "archive",
  title: "보고서 디렉터리 백업",
  difficulty: 1,
  tags: ["tar czf"],
  scenario:
    "분기 보고서가 담긴 reports 디렉터리를 다른 서버로 옮기기 전에 " +
    "하나의 압축 파일로 묶어야 합니다.\n" +
    "리눅스에서 가장 널리 쓰는 형식은 tar 로 묶고 gzip 으로 압축한 .tar.gz 입니다.",
  objectives: [
    "reports 디렉터리 전체를 /root/work/reports.tar.gz 로 묶어 압축하세요.",
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
    "tar 의 c(create), z(gzip 압축), f(파일명 지정) 옵션을 조합합니다.",
    "/root/work 에서: tar czf reports.tar.gz reports",
  ],
  explanation:
    "정답 (/root/work 에서):\n" +
    "tar czf reports.tar.gz reports\n\n" +
    "옵션 암기법 — c(create 묶기), z(gzip 압축), f(file 파일명). " +
    "tar 는 디렉터리 구조와 권한을 보존하며 여러 파일을 하나로 '묶고', " +
    "z 옵션이 gzip 압축을 함께 수행합니다. 확장자가 .tar.gz 두 단계인 이유가 이 구조입니다.\n" +
    "묶인 내용 확인은 tar tzf reports.tar.gz (t=list).\n" +
    "참고: z 옵션이 없는 구형 tar 에서는 tar cf reports.tar reports 후 " +
    "gzip reports.tar 처럼 두 단계로 나눠 실행합니다 — 원리는 동일합니다.",
  verify: { answer: ["cd /root/work; tar czf reports.tar.gz reports"] },
} satisfies Problem;
