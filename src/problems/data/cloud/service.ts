import type { Problem } from "../../../engine/types";

export const SERVICE_PROBLEMS = [
  {
    id: "service-01",
    category: "service",
    title: "서비스 시작과 부팅 등록",
    difficulty: 1,
    tags: ["rc-service", "rc-update", "nc -z"],
    commands: ["rc-service", "rc-update", "nc"],
    scenario:
      "보고서 API가 서버 재부팅 후 올라오지 않았습니다. 현재 실습 VM은 Alpine/OpenRC이므로 systemctl 대신 rc-service와 rc-update를 사용합니다. " +
      "서비스를 시작하고 기본 런레벨에 등록한 뒤 포트까지 확인하세요.",
    objectives: ["report-api 서비스를 시작하세요.", "default 런레벨에 자동 시작으로 등록하세요.", "127.0.0.1:19090 포트가 열렸는지 확인하세요."],
    setup: [
      "rc-service report-api stop 2>/dev/null; true",
      "rc-update del report-api default 2>/dev/null; true",
      "mkdir -p /srv/report-api && echo healthy > /srv/report-api/index.html",
      "printf '#!/sbin/openrc-run\ncommand=\"/usr/sbin/httpd\"\ncommand_args=\"-f -p 19090 -h /srv/report-api\"\ncommand_background=\"yes\"\npidfile=\"/run/report-api.pid\"\n' > /etc/init.d/report-api",
      "chmod 755 /etc/init.d/report-api",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "rc-service report-api status", label: "report-api가 실행 중인가" },
      { id: "c2", type: "command", cmd: "rc-update show default | grep -q report-api", label: "부팅 자동 시작으로 등록됐는가" },
      { id: "c3", type: "command", cmd: "nc -z -w 2 127.0.0.1 19090", label: "19090 포트가 열렸는가" },
    ],
    hints: ["OpenRC 서비스 시작: rc-service <이름> start", "부팅 등록: rc-update add <이름> default"],
    explanation:
      "정답:\nrc-service report-api start\nrc-update add report-api default\nnc -zv -w 2 127.0.0.1 19090\n\n" +
      "실제 운영에서는 '프로세스 시작', '부팅 등록', '포트 응답'을 따로 확인합니다. Rocky·Ubuntu의 대응 명령은 systemctl start와 systemctl enable입니다.",
    verify: { answer: ["rc-service report-api start", "rc-update add report-api default"] },
  },
  {
    id: "service-02",
    category: "service",
    title: "설정 변경 후 서비스 재시작",
    difficulty: 2,
    tags: ["sed", "rc-service restart", "ss"],
    commands: ["sed", "rc-service", "ss"],
    scenario:
      "billing-api 포트가 변경됐지만 설정 파일만 수정하고 재시작하지 않아 이전 포트 19191을 계속 사용 중입니다. " +
      "요구 포트 19192로 설정을 바꾸고 서비스를 재시작한 뒤 기존 포트가 닫혔는지 확인하세요.",
    objectives: ["/etc/conf.d/billing-api의 PORT를 19192로 변경하세요.", "billing-api를 재시작하세요.", "19192는 LISTEN, 19191은 미사용 상태로 만드세요."],
    setup: [
      "rc-service billing-api stop 2>/dev/null; true",
      "mkdir -p /srv/billing-api && echo billing-ok > /srv/billing-api/index.html",
      "printf 'PORT=19191\n' > /etc/conf.d/billing-api",
      "printf '#!/sbin/openrc-run\ncommand=\"/usr/sbin/httpd\"\ncommand_args=\"-f -p ${PORT} -h /srv/billing-api\"\ncommand_background=\"yes\"\npidfile=\"/run/billing-api.pid\"\n' > /etc/init.d/billing-api",
      "chmod 755 /etc/init.d/billing-api",
      "rc-service billing-api start",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/etc/conf.d/billing-api", expect: { includes: "PORT=19192" }, label: "설정 포트가 변경됐는가" },
      { id: "c2", type: "command", cmd: "nc -z -w 2 127.0.0.1 19192", label: "새 포트가 열렸는가" },
      { id: "c3", type: "command", cmd: "! nc -z -w 1 127.0.0.1 19191", label: "기존 포트가 닫혔는가" },
    ],
    hints: ["sed -i 's/19191/19192/' 파일 로 값을 바꿀 수 있습니다.", "설정 파일을 바꾼 뒤 rc-service billing-api restart가 필요합니다."],
    explanation:
      "정답:\nsed -i 's/19191/19192/' /etc/conf.d/billing-api\nrc-service billing-api restart\nss -lntp | grep 19192\n\n" +
      "설정값(configured)과 실제 리스너(runtime)는 별개입니다. 재시작 후 새 포트가 열리고 이전 포트가 닫혔는지 모두 검증해야 합니다.",
    verify: { answer: ["sed -i 's/19191/19192/' /etc/conf.d/billing-api", "rc-service billing-api restart"] },
  },
  {
    id: "service-03",
    category: "service",
    title: "애플리케이션 오류 로그 요약",
    difficulty: 1,
    tags: ["grep -E", "wc -l", "tail"],
    commands: ["grep", "wc", "tail"],
    scenario:
      "결제 API 로그에서 장애 시간대의 ERROR와 CRITICAL만 추려야 합니다. 원문 전체를 전달하지 말고 오류 줄과 총 건수를 한 보고서에 기록하세요.",
    objectives: ["ERROR 또는 CRITICAL 줄만 /root/work/error-report.txt에 저장하세요.", "마지막 줄에 ERROR_COUNT=<건수>를 추가하세요."],
    setup: [
      "printf '10:00:01 INFO boot complete\n10:02:11 ERROR db timeout\n10:02:12 WARN retrying\n10:02:13 ERROR db timeout\n10:03:02 CRITICAL worker stopped\n10:04:00 INFO recovered\n' > /var/log/payment-api.log",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/error-report.txt", expect: { includes: "ERROR db timeout" }, label: "ERROR 로그가 추출됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/error-report.txt", expect: { includes: "CRITICAL worker stopped" }, label: "CRITICAL 로그가 추출됐는가" },
      { id: "c3", type: "file_content", path: "/root/work/error-report.txt", expect: { includes: "ERROR_COUNT=3" }, label: "오류 총 건수가 기록됐는가" },
    ],
    hints: ["grep -E 'ERROR|CRITICAL' 파일 로 두 패턴을 동시에 찾습니다.", "grep 결과를 wc -l에 파이프로 넘기면 건수를 셀 수 있습니다."],
    explanation:
      "정답 예시:\ngrep -E 'ERROR|CRITICAL' /var/log/payment-api.log > error-report.txt\necho \"ERROR_COUNT=$(grep -Ec 'ERROR|CRITICAL' /var/log/payment-api.log)\" >> error-report.txt\n\n" +
      "대용량 로그는 먼저 시간·레벨·요청 ID로 범위를 줄입니다. 원문 전체 복사는 민감정보 노출과 분석 지연을 함께 키웁니다.",
    verify: { answer: ["grep -E 'ERROR|CRITICAL' /var/log/payment-api.log > error-report.txt", "echo \"ERROR_COUNT=$(grep -Ec 'ERROR|CRITICAL' /var/log/payment-api.log)\" >> error-report.txt"] },
  },
  {
    id: "service-04",
    category: "service",
    title: "Nginx 설정 오류 복구",
    difficulty: 2,
    tags: ["nginx -t", "sed", "curl -fsS"],
    commands: ["nginx", "sed", "curl"],
    scenario:
      "배포 후 Nginx가 기동하지 않습니다. 설정 검사를 실행해 보니 신규 vhost의 listen 지시문에서 구문 오류가 발생합니다. " +
      "오류를 수정하고 설정 검사를 통과시킨 뒤 헬스 URL까지 확인하세요.",
    objectives: ["/etc/nginx/http.d/cbt-health.conf의 구문 오류를 수정하세요.", "nginx -t를 통과시키세요.", "Nginx를 시작하고 http://127.0.0.1:18081/health가 ok를 반환하게 하세요."],
    setup: [
      "nginx -s stop 2>/dev/null; true",
      // /run은 부팅마다 새로 만들어지는 tmpfs라 패키지가 만든 /run/nginx가 없다 —
      // 이 문제의 학습 목표는 listen 구문 오류이므로 pid 디렉터리는 셋업이 보장한다
      "mkdir -p /run/nginx && rm -f /run/nginx/nginx.pid",
      "mkdir -p /etc/nginx/http.d",
      "printf 'server {\n    listen 18081\n    location = /health { return 200 \"ok\\n\"; }\n}\n' > /etc/nginx/http.d/cbt-health.conf",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "nginx -t", label: "Nginx 설정 검사를 통과하는가" },
      { id: "c2", type: "command", cmd: "curl -fsS http://127.0.0.1:18081/health | grep -qx ok", label: "헬스 URL이 정상 응답하는가" },
    ],
    hints: ["nginx -t는 실제 기동 전에 파일과 줄 번호를 포함한 오류를 알려 줍니다.", "listen 18081 줄 끝에 필요한 문자를 확인하세요."],
    explanation:
      "정답:\nsed -i 's/listen 18081$/listen 18081;/' /etc/nginx/http.d/cbt-health.conf\nnginx -t\nnginx\ncurl -fsS http://127.0.0.1:18081/health\n\n" +
      "설정 변경은 구문 검사 → 적용 → 실제 요청 검증 순서로 진행합니다. 프로세스가 떴다는 사실만으로 요청 경로가 정상인 것은 아닙니다.",
    verify: { answer: ["sed -i 's/listen 18081$/listen 18081;/' /etc/nginx/http.d/cbt-health.conf", "nginx -t", "nginx"] },
  },
  {
    id: "service-05",
    category: "service",
    title: "포트 정상·헬스 비정상 구분",
    difficulty: 2,
    tags: ["nc -z", "curl", "계층 진단"],
    commands: ["nc", "curl"],
    scenario:
      "18082 포트의 TCP 연결은 성공하지만 로드밸런서 헬스체크는 실패합니다. TCP 계층과 HTTP 애플리케이션 계층을 각각 검사해 결과를 구분해서 남기세요.",
    objectives: ["TCP 연결 성공 시 TCP_OK를 /root/work/health-report.txt에 기록하세요.", "/health 응답이 status=degraded이면 HTTP_DEGRADED를 기록하세요."],
    setup: [
      "pkill -f 'httpd -f -p 18082' 2>/dev/null; true",
      "mkdir -p /srv/degraded && echo 'status=degraded' > /srv/degraded/health",
      "nohup httpd -f -p 18082 -h /srv/degraded >/tmp/degraded-httpd.log 2>&1 &",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/health-report.txt", expect: { includes: "TCP_OK" }, label: "TCP 계층 결과가 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/health-report.txt", expect: { includes: "HTTP_DEGRADED" }, label: "HTTP 계층 결과가 기록됐는가" },
    ],
    hints: ["nc -z -w 2 127.0.0.1 18082는 TCP 연결만 검사합니다.", "curl -fsS URL의 본문을 grep으로 판정할 수 있습니다."],
    explanation:
      "정답 예시:\nnc -z -w 2 127.0.0.1 18082 && echo TCP_OK > health-report.txt\ncurl -fsS http://127.0.0.1:18082/health | grep -q 'status=degraded' && echo HTTP_DEGRADED >> health-report.txt\n\n" +
      "nc 성공은 3-way handshake만 증명합니다. HTTP 상태·본문·인증·DB 의존성까지 확인해야 애플리케이션 정상으로 판정할 수 있습니다.",
    verify: { answer: ["nc -z -w 2 127.0.0.1 18082 && echo TCP_OK > health-report.txt", "curl -fsS http://127.0.0.1:18082/health | grep -q 'status=degraded' && echo HTTP_DEGRADED >> health-report.txt"] },
  },
] satisfies Problem[];
