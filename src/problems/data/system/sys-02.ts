import type { Problem } from "../../../engine/types";

export const sys02 = {
  id: "sys-02",
  category: "system",
  title: "용량 범인 찾기 (du)",
  difficulty: 2,
  tags: ["du -sk", "sort -n"],
  scenario:
    "df 로 보니 디스크가 차오르고 있는데, 어느 디렉터리가 원인인지 모릅니다.\n" +
    "/root/work/data 아래 하위 디렉터리별 용량을 조사해서 가장 큰 범인을 찾아내세요.",
  objectives: [
    "du 로 data 하위 디렉터리(logs, cache, docs)별 용량을 확인하세요.",
    "가장 용량이 큰 디렉터리의 '이름'(예: cache)을 /root/work/biggest.txt 에 저장하세요.",
  ],
  setup: [
    "mkdir -p /root/work/data/logs /root/work/data/cache /root/work/data/docs",
    "dd if=/dev/zero of=/root/work/data/logs/app.log bs=1024 count=300 2>/dev/null",
    "dd if=/dev/zero of=/root/work/data/cache/tmp.bin bs=1024 count=120 2>/dev/null",
    "printf 'readme\\n' > /root/work/data/docs/readme.txt",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/biggest.txt",
      expect: { equals: "logs" },
      label: "가장 큰 디렉터리를 정확히 찾았는가",
    },
    { id: "c2", type: "command", cmd: "test -d /root/work/data/logs", label: "조사만 하고 지우지는 않았는가" },
  ],
  hints: [
    "du -sk /root/work/data/* 는 하위 디렉터리별 합계를 KB 단위로 보여줍니다 (-s=합계, -k=KB).",
    "사람이 읽기 좋게 보려면 du -sh, 정렬까지 하려면 du -sk ... | sort -n 을 씁니다.",
  ],
  explanation:
    "정답 예시:\n" +
    "du -sk /root/work/data/*        # 디렉터리별 용량 확인 → logs가 최대\n" +
    "echo logs > /root/work/biggest.txt\n\n" +
    "du(disk usage)는 디렉터리/파일이 실제로 차지하는 용량을 보여줍니다. " +
    "-s 는 항목별 합계 한 줄씩, -k 는 KB, -h 는 사람이 읽는 단위입니다.\n" +
    "du -sk dir/* | sort -n 처럼 정렬과 조합하면 용량 순위가 바로 나옵니다. " +
    "df(파일시스템 전체) → du(디렉터리별 상세) 순서가 용량 조사의 정석입니다.",
  verify: {
    answer: ["du -sk /root/work/data/*", "echo logs > /root/work/biggest.txt"],
  },
} satisfies Problem;
