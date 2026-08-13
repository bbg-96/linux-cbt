import type { Problem } from "../../../engine/types";

export const arch03 = {
  id: "arch-03",
  category: "archive",
  title: "대용량 로그 압축",
  difficulty: 1,
  tags: ["gzip", "zcat"],
  scenario:
    "디스크 용량 경고가 떴습니다. 더 이상 쓰지 않는 huge.log 가 공간을 차지하고 있는데, " +
    "감사(audit) 규정 때문에 삭제할 수는 없습니다.\n" +
    "압축해서 보관하면 규정도 지키고 공간도 확보할 수 있습니다.",
  objectives: [
    "huge.log 를 gzip 으로 압축하세요. 압축 후에는 huge.log.gz 만 남아야 합니다.",
  ],
  setup: [
    "printf 'log line one\\nMARKER-7f3a critical event recorded\\nlog line three\\n' > /root/work/huge.log",
  ],
  checks: [
    { id: "c1", type: "file_exists", path: "/root/work/huge.log.gz", label: "huge.log.gz가 생성되었는가" },
    { id: "c2", type: "command", cmd: "! test -e /root/work/huge.log", label: "원본 huge.log는 없는가" },
    {
      id: "c3",
      type: "command",
      cmd: "zcat /root/work/huge.log.gz | grep -q MARKER-7f3a",
      label: "압축 파일 안의 내용이 온전한가",
    },
  ],
  hints: [
    "단일 파일 압축은 gzip 파일명 한 줄이면 됩니다.",
    "gzip 은 기본적으로 원본을 .gz 로 대체합니다. 압축된 내용은 zcat 으로 볼 수 있습니다.",
  ],
  explanation:
    "정답:\n" +
    "gzip /root/work/huge.log\n\n" +
    "gzip 은 파일을 압축하면서 원본을 huge.log.gz 로 대체합니다 (원본을 남기고 싶으면 " +
    "gzip -k, 이 구형 busybox에는 없으므로 gzip -c huge.log > huge.log.gz 방식).\n" +
    "압축을 풀려면 gunzip huge.log.gz, 풀지 않고 내용만 보려면 zcat 이나 " +
    "zcat 파일 | grep 패턴 으로 검색할 수 있습니다. tar 가 '여러 파일 묶기'라면 " +
    "gzip 은 '한 파일 압축'을 담당합니다.",
  verify: { answer: ["gzip /root/work/huge.log"] },
} satisfies Problem;
