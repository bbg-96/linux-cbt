import type { Problem } from "../../../engine/types";

export const search02 = {
  id: "search-02",
  category: "search",
  title: "크기와 날짜로 파일 정리",
  difficulty: 2,
  tags: ["find", "-size", "-mtime", "-exec"],
  commands: ["find"],
  scenario:
    "data 디렉터리가 용량 경고를 울리고 있습니다. 정리 규칙은 두 가지입니다:\n" +
    "큰 파일(100KB 초과)은 archive 디렉터리로 옮기고, " +
    "수정한 지 30일이 넘은 설정 파일(.cfg)은 목록을 만들어 검토를 요청해야 합니다.",
  objectives: [
    "data 에서 100KB 초과 파일을 찾아 /root/work/archive 디렉터리로 이동하세요 (find 의 -size 와 -exec).",
    "data 에서 수정된 지 30일 넘은 .cfg 파일 목록을 /root/work/old.txt 로 저장하세요 (-mtime).",
  ],
  setup: [
    "mkdir -p /root/work/data",
    "dd if=/dev/zero of=/root/work/data/big.bin bs=1024 count=200 2>/dev/null",
    "dd if=/dev/zero of=/root/work/data/small.bin bs=1024 count=10 2>/dev/null",
    "printf 'retry=3\\n' > /root/work/data/old1.cfg",
    "printf 'debug=0\\n' > /root/work/data/old2.cfg",
    "touch -t 202001010000 /root/work/data/old1.cfg /root/work/data/old2.cfg",
    "printf 'port=80\\n' > /root/work/data/new.cfg",
  ],
  checks: [
    { id: "c1", type: "file_exists", path: "/root/work/archive/big.bin", label: "큰 파일이 archive로 이동했는가" },
    { id: "c2", type: "command", cmd: "! test -e /root/work/data/big.bin", label: "원래 위치에서는 사라졌는가" },
    { id: "c3", type: "file_exists", path: "/root/work/data/small.bin", label: "작은 파일은 그대로인가" },
    {
      id: "c4",
      type: "command",
      cmd: "grep -q old1.cfg /root/work/old.txt && grep -q old2.cfg /root/work/old.txt && ! grep -q new.cfg /root/work/old.txt",
      label: "오래된 .cfg만 목록에 있는가",
    },
  ],
  hints: [
    "-size +100k 는 100KB 초과, -mtime +30 은 30일 초과를 뜻합니다 (+는 초과, -는 미만).",
    "-exec mv {} /root/work/archive/ \\; 처럼 찾은 파일({})마다 명령을 실행할 수 있습니다. 끝의 \\; 를 잊지 마세요.",
  ],
  explanation:
    "정답:\n" +
    "mkdir -p /root/work/archive\n" +
    "find /root/work/data -type f -size +100k -exec mv {} /root/work/archive/ \\;\n" +
    "find /root/work/data -name \"*.cfg\" -mtime +30 > /root/work/old.txt\n\n" +
    "-size +100k: 100KB 초과 (k=KB, M=MB). -mtime +30: 마지막 수정이 30일 초과 전.\n" +
    "-exec 명령 {} \\; 는 찾은 각 항목을 {} 자리에 넣어 명령을 실행합니다 — " +
    "find 가 '찾기'를 넘어 '일괄 처리' 도구가 되는 지점입니다. " +
    "실행 전에 -exec 대신 -print 로 대상 목록을 눈으로 확인하는 습관이 안전합니다.",
  verify: {
    answer: [
      "mkdir -p /root/work/archive",
      "find /root/work/data -type f -size +100k -exec mv {} /root/work/archive/ \\;",
      'find /root/work/data -name "*.cfg" -mtime +30 > /root/work/old.txt',
    ],
  },
} satisfies Problem;
