import type { Problem } from "../../../engine/types";

export const text01 = {
  id: "text-01",
  category: "text",
  title: "에러 로그 추출",
  difficulty: 1,
  scenario:
    "장애 보고서를 작성해야 합니다. 애플리케이션 로그 /root/work/app.log 에는 " +
    "INFO, WARN, ERROR 레벨의 메시지가 섞여 있습니다.\n" +
    "ERROR 라인만 골라 별도 파일로 만들어 두면 보고서 작성이 편해집니다.",
  objectives: [
    "app.log 에서 ERROR 가 포함된 라인만 추출해 /root/work/errors.txt 파일로 저장하세요.",
  ],
  setup: [
    "printf 'INFO server started\\nERROR db connection failed\\nINFO request handled\\nWARN slow query detected\\nERROR disk full\\nINFO cache warmed\\nERROR timeout occurred\\nINFO shutdown\\n' > /root/work/app.log",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/errors.txt",
      expect: { includes: "ERROR db connection failed" },
      label: "errors.txt에 ERROR 라인이 있는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: 'test "$(grep -c ERROR /root/work/errors.txt)" = 3',
      label: "ERROR 라인이 정확히 3개인가",
    },
    {
      id: "c3",
      type: "command",
      cmd: "! grep -qv ERROR /root/work/errors.txt",
      label: "ERROR가 아닌 라인은 없는가",
    },
  ],
  hints: [
    "grep 패턴 파일 은 패턴이 포함된 라인만 출력합니다.",
    "화면 출력을 파일로 저장하려면 > 리다이렉션을 붙입니다: grep ERROR app.log > errors.txt",
  ],
  explanation:
    "정답:\n" +
    "grep ERROR /root/work/app.log > /root/work/errors.txt\n\n" +
    "grep 은 패턴과 일치하는 라인을 골라내는 가장 기본적인 텍스트 필터입니다. " +
    "> 리다이렉션과 조합하면 필터 결과를 파일로 저장할 수 있습니다.\n" +
    "참고: grep -v ERROR 는 반대로 ERROR가 없는 라인만, grep -c ERROR 는 개수만 출력합니다.",
} satisfies Problem;
