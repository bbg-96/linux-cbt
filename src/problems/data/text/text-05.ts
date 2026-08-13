import type { Problem } from "../../../engine/types";

export const text05 = {
  id: "text-05",
  category: "text",
  title: "awk로 로그 통계 내기",
  difficulty: 2,
  tags: ["awk", "END", "집계"],
  scenario:
    "어제 배포 이후 오류가 늘었다는 제보가 있습니다. access.log " +
    "('IP 메서드 경로 상태코드 바이트' 형식)를 집계해 두 가지 수치를 보고해야 합니다:\n" +
    "404 응답 횟수와 총 전송 바이트.",
  objectives: [
    "상태코드(4번째 컬럼)가 404 인 요청 수를 /root/work/notfound.txt 에 저장하세요.",
    "전송 바이트(5번째 컬럼)의 총합을 /root/work/total.txt 에 저장하세요.",
  ],
  setup: [
    "printf '10.0.0.5 GET /index.html 200 1024\\n10.0.0.9 POST /api/login 200 512\\n10.0.0.5 GET /style.css 200 2048\\n10.0.0.7 GET /missing 404 128\\n10.0.0.9 GET /api/data 500 256\\n10.0.0.5 POST /api/save 200 640\\n10.0.0.7 GET /favicon.ico 404 64\\n10.0.0.9 GET /index.html 200 1024\\n' > /root/work/access.log",
  ],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/notfound.txt",
      expect: { equals: "2" },
      label: "404 요청 수가 정확한가 (2)",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/total.txt",
      expect: { equals: "5696" },
      label: "총 전송 바이트가 정확한가 (5696)",
    },
  ],
  hints: [
    "awk '조건 {동작}' 형태로 조건에 맞는 줄만 처리할 수 있습니다: $4 == 404",
    "END { } 블록은 모든 줄을 읽은 뒤 실행됩니다. 합계는 { s += $5 } END { print s } 패턴을 씁니다.",
  ],
  explanation:
    "정답:\n" +
    "awk '$4 == 404 { n++ } END { print n }' /root/work/access.log > /root/work/notfound.txt\n" +
    "awk '{ s += $5 } END { print s }' /root/work/access.log > /root/work/total.txt\n\n" +
    "awk 프로그램은 '패턴 { 동작 }' 의 나열입니다. 패턴이 참인 줄에만 동작이 실행되고, " +
    "END 블록은 파일 끝에서 한 번 실행됩니다. 변수는 선언 없이 0에서 시작하므로 " +
    "카운트(n++)와 누적합(s += $5)이 한 줄로 끝납니다.\n" +
    "참고: 404 카운트는 grep -c ' 404 ' 로도 비슷하게 구할 수 있지만, " +
    "'4번째 컬럼이 404'라는 정확한 조건은 awk 만 표현할 수 있습니다 " +
    "(바이트 수가 404인 줄을 잘못 세는 사고를 막아줍니다).",
  verify: {
    answer: [
      "awk '$4 == 404 { n++ } END { print n }' /root/work/access.log > /root/work/notfound.txt",
      "awk '{ s += $5 } END { print s }' /root/work/access.log > /root/work/total.txt",
    ],
  },
} satisfies Problem;
