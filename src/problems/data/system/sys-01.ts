import type { Problem } from "../../../engine/types";

export const sys01 = {
  id: "sys-01",
  category: "system",
  title: "디스크 사용률 보고",
  difficulty: 1,
  tags: ["df -h", "grep"],
  scenario:
    "모니터링에서 /mnt/data 파티션의 용량 경고가 왔습니다. 정확한 사용률을 확인해서 " +
    "보고 파일로 남겨야 합니다.\n" +
    "df 는 마운트된 파일시스템별 전체/사용/가용 용량과 사용률(%)을 보여줍니다.",
  objectives: [
    "df -h 출력에서 /mnt/data 마운트 줄'만' 골라 /root/work/usage.txt 로 저장하세요.",
  ],
  setup: [
    "umount /mnt/data 2>/dev/null; true",
    "mkdir -p /mnt/data && mount -t tmpfs -o size=8m tmpfs /mnt/data",
    "dd if=/dev/zero of=/mnt/data/blob.bin bs=1024 count=5120 2>/dev/null",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/usage.txt",
      expect: { includes: "/mnt/data" },
      label: "/mnt/data 줄이 있는가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/usage.txt",
      expect: { matches: "[0-9]+%" },
      label: "사용률(%)이 포함됐는가",
    },
    {
      id: "c3",
      type: "command",
      cmd: 'test "$(wc -l < /root/work/usage.txt)" -eq 1',
      label: "딱 한 줄만 저장했는가 (필터 사용)",
    },
  ],
  hints: [
    "df -h 는 사람이 읽기 좋은 단위(M, G)로 보여줍니다. 먼저 전체 출력을 보세요.",
    "특정 줄만 고르려면 파이프로 grep 을 연결합니다: df -h | grep /mnt/data",
  ],
  explanation:
    "정답:\n" +
    "df -h | grep /mnt/data > /root/work/usage.txt\n\n" +
    "df(disk free)는 파일시스템 단위 용량 현황을 보여줍니다. -h(human-readable)는 " +
    "바이트 대신 M/G 단위로 표시합니다.\n" +
    "실무에서는 df -h 로 어느 파티션이 찼는지 먼저 보고(Use% 열), " +
    "그다음 du 로 그 안의 어떤 디렉터리가 원인인지 파고드는 순서로 조사합니다. " +
    "출력에서 특정 마운트만 보고 싶을 때 grep 파이프가 기본 패턴입니다.",
  verify: {
    answer: ["df -h | grep /mnt/data > /root/work/usage.txt"],
  },
} satisfies Problem;
