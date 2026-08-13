import type { Problem } from "../../../engine/types";

export const text03 = {
  id: "text-03",
  category: "text",
  title: "설정 값 일괄 치환",
  difficulty: 2,
  scenario:
    "서비스 포트를 8080에서 9090으로 옮기기로 했습니다. 설정 파일 config.ini 에는 " +
    "8080이 여러 곳에 등장합니다.\n" +
    "편집기로 일일이 고치는 대신 한 줄 명령으로 전부 바꿔야 합니다.",
  objectives: [
    "config.ini 안의 8080을 모두 9090으로 변경하세요 (파일 자체를 수정).",
    "다른 설정 값은 건드리지 마세요.",
  ],
  setup: [
    "printf '[server]\\nport=8080\\nhost=localhost\\n\\n[backup]\\nport=8080\\nretry=3\\n' > /root/work/config.ini",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: 'test "$(grep -c port=9090 /root/work/config.ini)" = 2',
      label: "두 포트가 모두 9090으로 바뀌었는가",
    },
    { id: "c2", type: "command", cmd: "! grep -q 8080 /root/work/config.ini", label: "8080이 남아 있지 않은가" },
    {
      id: "c3",
      type: "command",
      cmd: "grep -q host=localhost /root/work/config.ini && grep -q retry=3 /root/work/config.ini",
      label: "다른 설정이 보존되었는가",
    },
  ],
  hints: [
    "sed 의 치환 문법은 s/찾을것/바꿀것/ 이며, 라인 내 전부 바꾸려면 뒤에 g 를 붙입니다.",
    "sed -i 옵션을 쓰면 출력 대신 파일을 직접 수정합니다: sed -i s/8080/9090/g 파일",
  ],
  explanation:
    "정답:\n" +
    "sed -i s/8080/9090/g /root/work/config.ini\n\n" +
    "sed 의 s(substitute) 명령은 스트림 편집의 핵심입니다. g 플래그가 없으면 " +
    "각 라인의 첫 번째 일치만 바뀝니다. -i(in-place) 는 파일을 직접 수정하므로 " +
    "실수하면 되돌리기 어렵습니다 — 실무에서는 먼저 -i 없이 실행해 결과를 눈으로 " +
    "확인한 뒤 -i 를 붙이는 습관이 안전합니다.",
  verify: { answer: ["sed -i s/8080/9090/g /root/work/config.ini"] },
} satisfies Problem;
