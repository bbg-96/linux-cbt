import type { Problem } from "../../../engine/types";

export const SECURITY_PROBLEMS = [
  {
    id: "security-01",
    category: "security",
    title: "보안 Agent 설치·서비스·프로세스 증적",
    difficulty: 2,
    tags: ["pgrep -af", "rc-service status", "ls -l"],
    commands: ["pgrep", "rc-service", "ls"],
    scenario:
      "고객에게 보안 Agent가 설치되고 실행 중이라는 증적을 전달해야 합니다. 프로세스 하나만으로 설치를 단정하지 말고 파일·서비스·프로세스 세 축을 한 파일에 수집하세요.",
    objectives: ["/opt/ds_agent/ds_agent 파일 정보를 확인하세요.", "ds-agent 서비스 상태를 확인하세요.", "실제 ds_agent 프로세스와 인자를 확인하세요.", "결과를 /root/work/agent-evidence.txt에 저장하세요."],
    setup: [
      "rc-service ds-agent stop 2>/dev/null; true",
      "mkdir -p /opt/ds_agent",
      "printf '#!/bin/sh\nwhile :; do sleep 30; done\n' > /opt/ds_agent/ds_agent",
      "chmod 755 /opt/ds_agent/ds_agent",
      "printf '#!/sbin/openrc-run\ncommand=\"/opt/ds_agent/ds_agent\"\ncommand_args=\"--mode protect\"\ncommand_background=\"yes\"\npidfile=\"/run/ds-agent.pid\"\n' > /etc/init.d/ds-agent",
      "chmod 755 /etc/init.d/ds-agent",
      "rc-service ds-agent start",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/agent-evidence.txt", expect: { includes: "/opt/ds_agent/ds_agent" }, label: "설치 파일 증적이 있는가" },
      { id: "c2", type: "file_content", path: "/root/work/agent-evidence.txt", expect: { matches: "started|status: started" }, label: "서비스 실행 증적이 있는가" },
      { id: "c3", type: "file_content", path: "/root/work/agent-evidence.txt", expect: { includes: "--mode protect" }, label: "실제 프로세스 인자가 기록됐는가" },
    ],
    hints: ["{ ls -l 파일; rc-service 서비스 status; pgrep -af 패턴; } > 증적파일", "pgrep -af는 PID와 전체 실행 인자를 함께 보여 줍니다."],
    explanation:
      "정답: { ls -l /opt/ds_agent/ds_agent; rc-service ds-agent status; pgrep -af '/opt/ds_agent/ds_agent'; } > /root/work/agent-evidence.txt 2>&1\n\n" +
      "설치 파일만 있으면 미실행일 수 있고, 프로세스만 보면 임시 실행일 수 있습니다. 패키지/파일, 서비스 등록, 런타임 프로세스를 교차 확인해야 증적성이 높습니다.",
    verify: { answer: ["{ ls -l /opt/ds_agent/ds_agent; rc-service ds-agent status; pgrep -af '/opt/ds_agent/ds_agent'; } > /root/work/agent-evidence.txt 2>&1"] },
  },
  {
    id: "security-02",
    category: "security",
    title: "민감 설정 파일 권한 최소화",
    difficulty: 1,
    tags: ["ls -l", "chmod 600", "소유권"],
    commands: ["ls", "chmod", "chown"],
    scenario:
      "배포 과정에서 DB 접속정보 파일 /etc/order-api/credentials.env가 모든 사용자에게 읽히는 644 권한으로 생성됐습니다. root만 읽고 쓸 수 있게 조치하세요.",
    objectives: ["현재 권한과 소유자를 확인하세요.", "소유자를 root:root로 맞추세요.", "권한을 600으로 변경하세요."],
    setup: ["mkdir -p /etc/order-api", "printf 'DB_USER=order\nDB_PASSWORD=training-secret\n' > /etc/order-api/credentials.env", "chown nobody:nobody /etc/order-api/credentials.env", "chmod 644 /etc/order-api/credentials.env"],
    checks: [
      { id: "c1", type: "file_mode", path: "/etc/order-api/credentials.env", mode: "600", label: "파일 권한이 600인가" },
      { id: "c2", type: "command", cmd: "test $(ls -ln /etc/order-api/credentials.env | awk '{print $3}') -eq 0 && test $(ls -ln /etc/order-api/credentials.env | awk '{print $4}') -eq 0", label: "소유자가 root:root인가" },
    ],
    hints: ["chmod 600 파일은 소유자만 읽기·쓰기가 가능합니다.", "chown root:root 파일"],
    explanation:
      "정답:\nchown root:root /etc/order-api/credentials.env\nchmod 600 /etc/order-api/credentials.env\n\n" +
      "비밀번호·토큰·개인키는 최소 권한으로 보관합니다. 채팅이나 장애 증적에 파일 내용을 복사하지 말고 권한·소유권·해시만 확인합니다.",
    verify: { answer: ["chown root:root /etc/order-api/credentials.env", "chmod 600 /etc/order-api/credentials.env"] },
  },
  {
    id: "security-03",
    category: "security",
    title: "관리 포트의 전체 인터페이스 노출 제거",
    difficulty: 2,
    tags: ["ss -lntp", "127.0.0.1", "pkill"],
    commands: ["ss", "sed", "pkill"],
    scenario:
      "관리 API 18084는 로컬 프록시만 사용해야 하지만 0.0.0.0에 바인딩되어 모든 인터페이스에 노출됐습니다. 설정을 루프백으로 바꾸고 프로세스를 재기동하세요.",
    objectives: ["ss로 현재 노출 주소를 확인하세요.", "/etc/admin-api.listen을 127.0.0.1:18084로 변경하세요.", "관리 API를 재기동하고 0.0.0.0 노출이 사라지게 하세요."],
    setup: [
      "pkill -f 'httpd -f -p .*18084' 2>/dev/null; true",
      "mkdir -p /usr/local/sbin", // Alpine 기본 이미지에는 /usr/local/sbin이 없다
      "mkdir -p /srv/admin-only && echo admin > /srv/admin-only/index.html",
      "echo '0.0.0.0:18084' > /etc/admin-api.listen",
      "printf '#!/bin/sh\npkill -f \"httpd -f -p .*18084\" 2>/dev/null || true\nLISTEN=$(cat /etc/admin-api.listen)\nnohup httpd -f -p \"$LISTEN\" -h /srv/admin-only >/tmp/admin-only.log 2>&1 &\n' > /usr/local/sbin/start-admin-api",
      "chmod 755 /usr/local/sbin/start-admin-api",
      "/usr/local/sbin/start-admin-api",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "ss -lnt | grep -q '127.0.0.1:18084'", label: "관리 API가 루프백에만 바인딩됐는가" },
      { id: "c2", type: "command", cmd: "! ss -lnt | grep -q '0.0.0.0:18084'", label: "전체 인터페이스 노출이 제거됐는가" },
      { id: "c3", type: "command", cmd: "nc -z -w 2 127.0.0.1 18084", label: "로컬 관리 API는 정상 동작하는가" },
    ],
    hints: ["sed -i 's/0.0.0.0/127.0.0.1/' /etc/admin-api.listen", "설정 변경 후 /usr/local/sbin/start-admin-api를 다시 실행하세요."],
    explanation:
      "정답:\nsed -i 's/0.0.0.0/127.0.0.1/' /etc/admin-api.listen\n/usr/local/sbin/start-admin-api\nss -lntp | grep 18084\n\n" +
      "방화벽만 믿기보다 서비스 자체도 필요한 주소에만 바인딩하는 것이 방어 계층을 하나 더 만듭니다.",
    verify: { answer: ["sed -i 's/0.0.0.0/127.0.0.1/' /etc/admin-api.listen", "/usr/local/sbin/start-admin-api"] },
  },
  {
    id: "security-04",
    category: "security",
    title: "배포 파일 체크섬 불일치 복구",
    difficulty: 2,
    tags: ["sha256sum -c", "diff", "cp"],
    commands: ["sha256sum", "diff", "cp"],
    scenario:
      "배포 후 설정 파일이 기준본과 달라졌다는 경고가 발생했습니다. trusted.sha256으로 손상 파일을 식별하고 golden 사본에서 복구한 뒤 전체 검증을 통과시키세요.",
    objectives: ["sha256sum -c로 불일치 파일을 확인하세요.", "손상된 app.conf만 golden 사본에서 복구하세요.", "모든 체크섬이 OK가 되게 하세요."],
    setup: [
      "rm -rf /opt/release && mkdir -p /opt/release/current /opt/release/golden",
      "echo 'port=8443' > /opt/release/golden/app.conf",
      "echo 'feature=true' > /opt/release/golden/feature.conf",
      "cp -a /opt/release/golden/. /opt/release/current/",
      "cd /opt/release/current && sha256sum app.conf feature.conf > /opt/release/trusted.sha256",
      "echo 'port=8080' > /opt/release/current/app.conf",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "cd /opt/release/current && sha256sum -c /opt/release/trusted.sha256", label: "전체 체크섬 검증을 통과하는가" },
      { id: "c2", type: "command", cmd: "diff -q /opt/release/current/app.conf /opt/release/golden/app.conf", label: "손상 파일이 기준본과 일치하는가" },
    ],
    hints: ["cd /opt/release/current && sha256sum -c ../trusted.sha256", "FAILED가 나온 파일만 golden 디렉터리에서 복사하세요."],
    explanation:
      "정답:\ncd /opt/release/current\nsha256sum -c ../trusted.sha256\ncp ../golden/app.conf ./app.conf\nsha256sum -c ../trusted.sha256\n\n" +
      "체크섬은 파일 내용의 변경을 검출합니다. 전체 디렉터리를 덮어쓰기 전에 불일치 범위를 좁히고 승인된 기준본에서 필요한 파일만 복구합니다.",
    verify: { answer: ["cp /opt/release/golden/app.conf /opt/release/current/app.conf"] },
  },
] satisfies Problem[];
