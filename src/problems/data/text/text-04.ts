import type { Problem } from "../../../engine/types";

export const text04 = {
  id: "text-04",
  category: "text",
  title: "awk로 컬럼 뽑기",
  difficulty: 1,
  tags: ["awk", "$1"],
  commands: ["awk"],
  scenario:
    "웹 서버 접근 로그 access.log 가 있습니다. 각 줄은 공백으로 구분된 " +
    "'IP 메서드 경로 상태코드 바이트' 형식입니다.\n" +
    "접속 IP 목록만 뽑아 달라는 요청을 받았습니다. 컬럼 단위 추출은 awk 의 주특기입니다.",
  objectives: [
    "access.log 의 1번째 컬럼(IP)만 추출해 순서 그대로 /root/work/ips.txt 에 저장하세요.",
  ],
  setup: [
    "printf '10.0.0.5 GET /index.html 200 1024\\n10.0.0.9 POST /api/login 200 512\\n10.0.0.5 GET /style.css 200 2048\\n10.0.0.7 GET /missing 404 128\\n10.0.0.9 GET /api/data 500 256\\n10.0.0.5 POST /api/save 200 640\\n10.0.0.7 GET /favicon.ico 404 64\\n10.0.0.9 GET /index.html 200 1024\\n' > /root/work/access.log",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/ips.txt",
      expect: {
        equals:
          "10.0.0.5\n10.0.0.9\n10.0.0.5\n10.0.0.7\n10.0.0.9\n10.0.0.5\n10.0.0.7\n10.0.0.9",
      },
      label: "IP 컬럼이 순서대로 정확히 추출됐는가",
    },
  ],
  hints: [
    "awk 는 각 줄을 공백 기준으로 $1, $2, … 필드로 쪼갭니다.",
    "awk '{print $1}' access.log 가 1번째 컬럼 출력입니다. > 로 파일에 저장하세요.",
  ],
  explanation:
    "정답:\n" +
    "awk '{print $1}' /root/work/access.log > /root/work/ips.txt\n\n" +
    "awk 는 '줄 → 필드' 구조로 텍스트를 다루는 언어입니다. 기본 구분자는 연속 공백이고, " +
    "$1 부터 $NF(마지막 필드)까지로 컬럼을 참조합니다.\n" +
    "cut -d' ' -f1 로도 비슷한 일을 할 수 있지만, awk 는 구분자가 불규칙해도 잘 동작하고 " +
    "조건·계산까지 확장할 수 있어 로그 분석의 표준 도구로 쓰입니다.",
  verify: {
    answer: ["awk '{print $1}' /root/work/access.log > /root/work/ips.txt"],
  },
} satisfies Problem;
