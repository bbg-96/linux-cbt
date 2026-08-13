import type { Problem } from "../../../engine/types";

export const TRIAGE_PROBLEMS = [
  {
    id: "triage-01",
    category: "triage",
    title: "신규 서버 기준정보 수집",
    difficulty: 1,
    tags: ["hostname", "uptime", "free -m", "df -hT"],
    commands: ["hostname", "uptime", "df"],
    scenario:
      "신규 VM을 인수했습니다. 작업 전에 서버 식별값, 커널, 부하, 메모리, 파일시스템을 한 파일로 남겨야 합니다. " +
      "이 기준정보는 변경 전·후 비교와 장애 인계에 사용됩니다.",
    objectives: [
      "hostname과 uname -r 결과를 HOST=, KERNEL= 형식으로 기록하세요.",
      "uptime, free -m, df -hT 결과를 /root/work/baseline.txt에 함께 저장하세요.",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/baseline.txt", expect: { includes: "HOST=" }, label: "호스트명이 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/baseline.txt", expect: { includes: "KERNEL=" }, label: "커널 버전이 기록됐는가" },
      { id: "c3", type: "file_content", path: "/root/work/baseline.txt", expect: { matches: "load average|load averages" }, label: "부하 정보가 기록됐는가" },
      { id: "c4", type: "file_content", path: "/root/work/baseline.txt", expect: { includes: "Mem:" }, label: "메모리 정보가 기록됐는가" },
      { id: "c5", type: "file_content", path: "/root/work/baseline.txt", expect: { includes: "Filesystem" }, label: "파일시스템 정보가 기록됐는가" },
    ],
    hints: [
      "여러 명령을 중괄호로 묶으면 리다이렉션을 한 번만 쓸 수 있습니다.",
      "예: { echo \"HOST=$(hostname)\"; uptime; } > baseline.txt",
    ],
    explanation:
      "정답 예시:\n{ echo \"HOST=$(hostname)\"; echo \"KERNEL=$(uname -r)\"; uptime; free -m; df -hT; } > /root/work/baseline.txt\n\n" +
      "운영 작업은 현재 상태를 남기는 것부터 시작합니다. hostname은 대상 오인 작업을 막고, uptime은 재부팅·부하, " +
      "free는 메모리, df는 파일시스템 포화 여부를 빠르게 보여 줍니다.",
    verify: { answer: ["{ echo \"HOST=$(hostname)\"; echo \"KERNEL=$(uname -r)\"; uptime; free -m; df -hT; } > /root/work/baseline.txt"] },
  },
  {
    id: "triage-02",
    category: "triage",
    title: "실행 인자로 애플리케이션 찾기",
    difficulty: 1,
    tags: ["pgrep -af", "ps"],
    commands: ["pgrep", "ps"],
    scenario:
      "결제 큐가 지연되고 있지만 서비스 이름을 모릅니다. 운영자가 기억하는 단서는 프로세스 인자에 " +
      "--queue billing이 포함된다는 것뿐입니다. PID와 전체 실행 명령을 증적으로 남기세요.",
    objectives: ["pgrep -af 또는 ps를 사용해 대상 프로세스를 찾으세요.", "결과를 /root/work/process.txt에 저장하세요."],
    setup: [
      "pkill -f '/usr/local/bin/api-worker --queue billing' 2>/dev/null; true",
      "printf '#!/bin/sh\nwhile :; do sleep 30; done\n' > /usr/local/bin/api-worker",
      "chmod 755 /usr/local/bin/api-worker",
      "nohup /usr/local/bin/api-worker --queue billing >/var/log/api-worker.log 2>&1 &",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/process.txt", expect: { includes: "api-worker" }, label: "대상 프로세스가 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/process.txt", expect: { includes: "--queue billing" }, label: "전체 실행 인자가 기록됐는가" },
    ],
    hints: ["pgrep의 -f는 실행 파일 이름뿐 아니라 전체 명령행을 검색합니다.", "-a는 PID와 함께 전체 명령행을 출력합니다."],
    explanation:
      "정답: pgrep -af 'api-worker.*--queue billing' > /root/work/process.txt\n\n" +
      "프로세스 이름만 보면 같은 프로그램의 여러 인스턴스를 구분하지 못합니다. 포트, 환경, 큐 이름처럼 실행 인자에 있는 단서를 함께 확인해야 합니다.",
    verify: { answer: ["pgrep -af 'api-worker.*--queue billing' > /root/work/process.txt"] },
  },
  {
    id: "triage-03",
    category: "triage",
    title: "LISTEN 포트의 소유 프로세스 확인",
    difficulty: 1,
    tags: ["ss -lntp", "pgrep -af"],
    commands: ["ss", "pgrep"],
    scenario:
      "모니터링에는 18080 포트가 열렸다고 나오지만 어떤 프로세스가 열었는지 알 수 없습니다. " +
      "리스닝 주소·포트와 프로세스 실행 인자를 한 증적 파일에 남기세요.",
    objectives: ["ss -lntp에서 18080 리스너를 확인하세요.", "pgrep -af로 httpd 실행 인자를 함께 기록하세요.", "결과를 /root/work/listener.txt에 저장하세요."],
    setup: [
      "pkill -f 'httpd -f -p 18080' 2>/dev/null; true",
      "mkdir -p /srv/triage-health && echo ok > /srv/triage-health/index.html",
      "nohup httpd -f -p 18080 -h /srv/triage-health >/tmp/triage-httpd.log 2>&1 &",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/listener.txt", expect: { includes: "18080" }, label: "리스닝 포트가 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/listener.txt", expect: { includes: "httpd" }, label: "소유 프로세스가 기록됐는가" },
    ],
    hints: ["ss -lntp | grep ':18080' 로 TCP LISTEN 소켓을 좁힙니다.", "두 명령의 출력을 { ...; ...; } 묶음으로 한 파일에 저장할 수 있습니다."],
    explanation:
      "정답: { ss -lntp | grep ':18080'; pgrep -af 'httpd.*18080'; } > /root/work/listener.txt\n\n" +
      "포트가 열렸다는 사실만으로 정상 서비스라고 단정할 수 없습니다. 어떤 PID가 어느 주소에 바인딩했는지까지 연결해야 다음 조사로 넘어갈 수 있습니다.",
    verify: { answer: ["{ ss -lntp | grep ':18080'; pgrep -af 'httpd.*18080'; } > /root/work/listener.txt"] },
  },
  {
    id: "triage-04",
    category: "triage",
    title: "CPU 폭주 프로세스 정상 종료",
    difficulty: 2,
    tags: ["ps", "kill", "TERM"],
    commands: ["ps", "kill"],
    scenario:
      "CPU 사용률이 급상승했습니다. 원인은 테스트용 yes 프로세스지만 원인 증적 없이 바로 kill -9을 쓰면 안 됩니다. " +
      "먼저 PID와 사용률을 남기고 기본 TERM 신호로 종료하세요.",
    objectives: ["ps 출력에서 yes 프로세스를 찾아 /root/work/cpu.txt에 저장하세요.", "kill -9이 아닌 기본 kill로 해당 PID를 종료하세요."],
    setup: ["pkill -x yes 2>/dev/null; true", "yes >/dev/null 2>&1 & echo $! > /root/work/cpu-hog.pid", "sleep 1"],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/cpu.txt", expect: { includes: "yes" }, label: "종료 전 증적이 남았는가" },
      { id: "c2", type: "command", cmd: "! kill -0 $(cat /root/work/cpu-hog.pid) 2>/dev/null", label: "CPU 폭주 프로세스가 종료됐는가" },
    ],
    hints: ["ps aux --sort=-%cpu | head 로 CPU 상위 프로세스를 봅니다.", "대상 PID는 /root/work/cpu-hog.pid에도 기록돼 있습니다. kill $(cat 파일)처럼 사용할 수 있습니다."],
    explanation:
      "정답 예시:\nps aux --sort=-%cpu | head > /root/work/cpu.txt\nkill $(cat /root/work/cpu-hog.pid)\n\n" +
      "기본 kill은 TERM(15)을 보내 정상 종료 기회를 줍니다. KILL(9)은 종료 처리를 건너뛰므로 TERM이 실패할 때만 마지막 수단으로 사용합니다.",
    verify: { answer: ["ps aux --sort=-%cpu | head > /root/work/cpu.txt", "kill $(cat /root/work/cpu-hog.pid)"] },
  },
  {
    id: "triage-05",
    category: "triage",
    title: "장애 인계용 증적 묶음 만들기",
    difficulty: 2,
    tags: ["ps", "ss", "ip route", "tar"],
    commands: ["ps", "ss", "tar"],
    scenario:
      "야간 장애를 다음 근무자에게 인계해야 합니다. 구두 설명 대신 서버 식별, 프로세스, 포트, 라우팅, 디스크 현황을 " +
      "각각 파일로 수집하고 하나의 압축 파일로 묶으세요.",
    objectives: [
      "hostname.txt, processes.txt, ports.txt, routes.txt, disk.txt를 /root/work/evidence에 만드세요.",
      "evidence 디렉터리를 /root/work/evidence.tar.gz로 압축하세요.",
    ],
    setup: ["rm -rf /root/work/evidence /root/work/evidence.tar.gz", "mkdir -p /root/work/evidence"],
    checks: [
      { id: "c1", type: "command", cmd: "tar -tzf /root/work/evidence.tar.gz | grep -q 'evidence/hostname.txt'", label: "호스트명 증적이 압축됐는가" },
      { id: "c2", type: "command", cmd: "tar -tzf /root/work/evidence.tar.gz | grep -q 'evidence/ports.txt'", label: "포트 증적이 압축됐는가" },
      { id: "c3", type: "command", cmd: "tar -tzf /root/work/evidence.tar.gz | grep -q 'evidence/routes.txt'", label: "라우팅 증적이 압축됐는가" },
      { id: "c4", type: "command", cmd: "tar -tzf /root/work/evidence.tar.gz | grep -q 'evidence/disk.txt'", label: "디스크 증적이 압축됐는가" },
    ],
    hints: ["명령마다 > evidence/파일명으로 저장하세요.", "상위 디렉터리에서 tar -czf evidence.tar.gz evidence 를 실행하면 구조가 보존됩니다."],
    explanation:
      "정답 예시:\nhostname > evidence/hostname.txt\nps aux > evidence/processes.txt\nss -lntup > evidence/ports.txt\nip route > evidence/routes.txt\ndf -hT > evidence/disk.txt\ntar -czf evidence.tar.gz evidence\n\n" +
      "좋은 장애 인계는 결론뿐 아니라 재검증 가능한 원시 증적을 남깁니다. 비밀번호·토큰·환경변수 전체 덤프는 증적에 넣지 않는 것이 원칙입니다.",
    verify: { answer: [
      "hostname > evidence/hostname.txt",
      "ps aux > evidence/processes.txt",
      "ss -lntup > evidence/ports.txt",
      "ip route > evidence/routes.txt",
      "df -hT > evidence/disk.txt",
      "tar -czf evidence.tar.gz evidence",
    ] },
  },
] satisfies Problem[];
