import type { Problem } from "../../../engine/types";

/**
 * sysinfo-01 과 같은 조회형 문제라 채점도 같은 방식(세션 ① 셸 이력)이다.
 * 검사 패턴에는 반드시 대괄호 트릭(`i[p] link`)을 쓴다 — 검사 명령 자체가 같은 셸의
 * 이력에 남기 때문에, 안 그러면 두 번째 채점부터 검사가 자기 자신과 매치된다.
 *
 * 환경 메모 (실측):
 *  - v86 릴레이는 DNS 응답도, 외부 HTTP(CORS)도 하지 않는다. 그래서 setup 이 게스트
 *    안에 dnsmasq(사설 DNS)와 nginx(웹)를 띄워 dig·nslookup·curl 이 진짜 서버를
 *    상대로 동작하게 만든다.
 *  - 릴레이는 모든 주소의 ICMP 에 응답하므로 ping 은 어디로 보내도 성공한다.
 *    traceroute 도 홉이 사실상 1개다 — 문제·해설에서 이 점을 밝힌다.
 */
export const netinfo01 = {
  id: "netinfo-01",
  category: "inspect",
  title: "Linux 서버의 네트워크 기본 정보 및 연결 상태 확인",
  difficulty: 2,
  tags: ["ip addr", "ss -lntup", "dig", "curl"],
  commands: ["ip", "ss", "dig"],
  scenario:
    "앞 문제에서 서버의 OS 기본 정보를 파악했습니다. 이번에는 같은 서버의 네트워크를 " +
    "점검합니다 — 인터페이스와 주소, 경로, 이름 해석, 열린 포트, 실제 연결까지 " +
    "계층을 따라 내려가며 확인합니다.\n" +
    "설정은 이미 되어 있습니다(주소·게이트웨이·DNS·웹 서비스). 바꾸지 말고 조회 명령으로 " +
    "현재 상태를 읽어 내는 것이 목표입니다.\n\n" +
    "이 서버에는 사설 DNS(dnsmasq)와 웹 서버(nginx)가 함께 떠 있어 " +
    "`app.internal` 이름 해석과 HTTP 응답을 실제로 확인할 수 있습니다. " +
    "채점은 세션 ①의 명령 이력으로 합니다.",
  objectives: [
    "네트워크 인터페이스의 이름·UP/DOWN 상태·MAC 주소를 확인하세요.",
    "서버에 설정된 IP 주소와 Prefix 를 확인하세요.",
    "라우팅 테이블에서 기본 게이트웨이와 목적지별 경로를 확인하세요.",
    "DNS 서버와 검색 도메인 설정을 확인하세요.",
    "app.internal 이 정상적으로 IP 로 해석되는지 확인하세요 (dig 또는 nslookup).",
    "게이트웨이(192.168.86.1)까지 ICMP 통신이 되는지 확인하세요.",
    "게이트웨이까지의 네트워크 경로를 확인하세요 (이 환경에서는 ICMP 모드 traceroute -I).",
    "서버가 열고 있는 TCP/UDP 리스닝 포트를 확인하세요.",
    "현재 맺어져 있는 연결(ESTABLISHED)과 상대 주소·포트를 확인하세요.",
    "웹 서버의 80 포트에 TCP 접근이 되는지 확인하세요 (nc).",
    "HTTP 응답과 상태 코드를 확인하세요 (curl).",
    "인터페이스별 송수신 패킷·에러·드롭 통계를 확인하세요.",
  ],
  // 네트워크 상태는 전역이라 매번 같은 상태에서 시작하도록 전부 구성한다.
  // 각 줄은 어떤 상태에서도 rc 0 으로 끝나야 한다 (시딩은 rc!=0 에서 중단).
  setup: [
    // 이전 시도의 잔재 정리
    "pkill -f 'dnsmasq --no-resolv' 2>/dev/null; nginx -s quit 2>/dev/null; sleep 1; true",
    "ip addr flush dev eth0 2>/dev/null; ip route flush dev eth0 2>/dev/null; true",
    // 인터페이스·주소·경로 (v86 가상 라우터 대역)
    "ip link set eth0 up && ip addr add 192.168.86.10/24 dev eth0",
    "ip route replace default via 192.168.86.1 dev eth0",
    // 사설 DNS — 설정 파일 대신 플래그로 직접 (Debian 기본 conf 가 conf-dir 을 안 읽는다)
    "dnsmasq --no-resolv --listen-address=127.0.0.1 --bind-interfaces --address=/app.internal/10.20.30.40 --address=/db.internal/10.20.30.41 --pid-file=/run/dnsmasq.pid",
    "printf 'nameserver 127.0.0.1\\nsearch internal\\n' > /etc/resolv.conf",
    // 웹 서버 (리스닝 포트 + curl 대상)
    "mkdir -p /var/www/html && printf 'service ok\\n' > /var/www/html/index.html && nginx",
    // ESTABLISHED 연결 하나를 붙잡아 둔다 (ss -antp 로 볼 거리)
    "bash -c 'exec 3<>/dev/tcp/127.0.0.1/80; sleep 3600' >/dev/null 2>&1 &",
    "sleep 2",
    // 반드시 마지막 — 위 setup 이 실행한 ip link·ip addr 가 이력에 남으면
    // 학습자가 아무것도 안 해도 채점이 통과한다 (기준점을 여기서 만든다)
    "history -c",
  ],
  setupTimeoutMs: 20000,
  checks: [
    {
      id: "c1",
      type: "command",
      // 옵션은 여러 글자일 수 있다 (`ip -br link`) — 한 글자만 허용하면 놓친다
      cmd: "history | grep -qE 'i[p] (-[0-9a-z]+ )*link'",
      label: "인터페이스 상태를 조회했는가 (ip link)",
    },
    {
      id: "c2",
      type: "command",
      cmd: "history | grep -qE 'i[p] (-[0-9a-z]+ )*(addr|a)( |$)'",
      label: "IP 주소를 조회했는가 (ip addr)",
    },
    {
      id: "c3",
      type: "command",
      cmd: "history | grep -qE 'i[p] (-[0-9a-z]+ )*(route|r)( |$)'",
      label: "라우팅 테이블을 조회했는가 (ip route)",
    },
    {
      id: "c4",
      type: "command",
      cmd: "history | grep -qE 'resolv[.]conf'",
      label: "DNS 설정을 조회했는가 (/etc/resolv.conf)",
    },
    {
      id: "c5",
      type: "command",
      cmd: "history | grep -qE 'di[g] |nslooku[p] |gete[n]t (hosts|ahostsv4)'",
      label: "이름 해석을 확인했는가 (dig·nslookup·getent)",
    },
    {
      id: "c6",
      type: "command",
      cmd: "history | grep -qE 'pin[g] '",
      label: "ICMP 통신을 확인했는가 (ping)",
    },
    {
      id: "c7",
      type: "command",
      // 두 단어 모두 대괄호 트릭을 써야 한다 — 하나라도 그대로 쓰면 검사 명령 자신이
      // 이력에 남아 자기 자신과 매치되고, 학습자가 아무것도 안 해도 통과한다
      cmd: "history | grep -qE 'tracerout[e]|tracepat[h]'",
      label: "네트워크 경로를 확인했는가 (traceroute·tracepath)",
    },
    {
      id: "c8",
      type: "command",
      cmd: "history | grep -qE 's[s] +-[a-z]*l'",
      label: "리스닝 포트를 조회했는가 (ss -l…)",
    },
    {
      id: "c9",
      type: "command",
      cmd: "history | grep -qE 's[s] +-[a-z]*a[a-z]*( |$)'",
      label: "현재 연결을 조회했는가 (ss -a…)",
    },
    {
      id: "c10",
      type: "command",
      cmd: "history | grep -qE 'n[c] +-[a-z]*z'",
      label: "TCP 포트 접근을 확인했는가 (nc -z)",
    },
    {
      id: "c11",
      type: "command",
      cmd: "history | grep -qE 'cur[l] '",
      label: "HTTP 응답을 확인했는가 (curl)",
    },
    {
      id: "c12",
      type: "command",
      cmd: "history | grep -qE 'i[p] +-s +(-[a-z] +)*link'",
      label: "인터페이스 통계를 조회했는가 (ip -s link)",
    },
  ],
  hints: [
    "열두 항목을 각각 명령 하나로 확인합니다. 실행해서 출력을 읽으면 되고, 채점은 세션 ①의 실행 이력으로 확인됩니다.",
    "인터페이스 `ip link` · 주소 `ip addr` · 경로 `ip route` · DNS 설정 `cat /etc/resolv.conf` · 이름 해석 `dig app.internal` · 통신 `ping -c 3 192.168.86.1`",
    "경로 `traceroute -I 192.168.86.1` (기본 UDP 모드는 이 가상 라우터가 응답하지 않아 `* * *` 만 나옵니다) · 리스닝 포트 `ss -lntup` · 현재 연결 `ss -antp` · 포트 접근 `nc -zv 127.0.0.1 80` · HTTP `curl -I http://127.0.0.1/` · 통계 `ip -s link show eth0`",
  ],
  explanation:
    "정답 명령 — 계층을 따라 아래에서 위로 올라갑니다:\n" +
    "```\n" +
    "ip link                      # 1. NIC 이름·UP/DOWN·MAC\n" +
    "ip addr                      # 2. IPv4/IPv6 주소와 Prefix\n" +
    "ip route                     # 3. 기본 게이트웨이·목적지별 경로\n" +
    "cat /etc/resolv.conf         # 4. DNS 서버·검색 도메인\n" +
    "dig app.internal             # 5. 이름 해석 (nslookup·getent hosts 도 가능)\n" +
    "ping -c 3 192.168.86.1       # 6. ICMP 도달성\n" +
    "traceroute -I 192.168.86.1   # 7. 경로 (-I = ICMP 모드)\n" +
    "ss -lntup                    # 8. 리스닝 TCP/UDP 포트와 프로세스\n" +
    "ss -antp                     # 9. 현재 연결(ESTABLISHED)과 상대 주소\n" +
    "nc -zv 127.0.0.1 80          # 10. 특정 TCP 포트 접근\n" +
    "curl -I http://127.0.0.1/    # 11. HTTP 상태 코드\n" +
    "ip -s link show eth0         # 12. 송수신 패킷·에러·드롭\n" +
    "```\n" +
    "\n" +
    "| 확인 항목 | 명령 | 눈여겨볼 출력 |\n" +
    "| --- | --- | --- |\n" +
    "| 인터페이스 | `ip link` | `state UP`, `link/ether`(MAC) |\n" +
    "| IP 주소 | `ip addr` | `inet 192.168.86.10/24` |\n" +
    "| 라우팅 | `ip route` | `default via 192.168.86.1` |\n" +
    "| DNS 설정 | `cat /etc/resolv.conf` | `nameserver`, `search` |\n" +
    "| 이름 해석 | `dig app.internal` | `status: NOERROR`, A 레코드 |\n" +
    "| ICMP | `ping -c 3` | `0% packet loss`, rtt |\n" +
    "| 경로 | `traceroute -I` | 홉 목록·홉별 지연 |\n" +
    "| 리스닝 | `ss -lntup` | `LISTEN`, `users:((\"nginx\"…))` |\n" +
    "| 연결 | `ss -antp` | `ESTAB`, 상대 IP:Port |\n" +
    "| 포트 접근 | `nc -zv` | `succeeded!` |\n" +
    "| HTTP | `curl -I` | `HTTP/1.1 200 OK` |\n" +
    "| 통계 | `ip -s link` | RX/TX errors·dropped |\n" +
    "\n" +
    "순서에 의미가 있습니다. 링크가 DOWN 이면 주소가 있어도 소용없고, 주소가 있어도 " +
    "경로가 없으면 나가지 못하며, 경로가 있어도 이름 해석이 깨지면 애플리케이션은 " +
    "실패합니다. 그래서 장애 조사는 `ip link` → `ip addr` → `ip route` → DNS → " +
    "ICMP → TCP → HTTP 순으로 좁혀 갑니다. 이 순서를 지키면 \"인터넷이 안 돼요\"라는 " +
    "모호한 신고를 몇 분 안에 한 계층으로 좁힐 수 있습니다.\n" +
    "\n" +
    "**`ss` 옵션 읽는 법**: `-l` 리스닝만, `-a` 전부, `-n` 이름 해석 안 함(빠르고 " +
    "포트 번호 그대로), `-t`/`-u` TCP/UDP, `-p` 프로세스. 그래서 `ss -lntup` 은 " +
    "\"리스닝 중인 TCP·UDP 포트를 프로세스와 함께, 이름 해석 없이\" 입니다. " +
    "예전 `netstat -lntup` 과 같은 뜻이고, 요즘 배포판에서는 `ss` 가 표준입니다.\n" +
    "\n" +
    "**이름 해석 도구 차이**: `dig`·`nslookup` 은 DNS 서버에 직접 물어봅니다. " +
    "반면 `getent hosts` 는 애플리케이션과 똑같이 NSS 경로(`/etc/hosts` → DNS 순)를 " +
    "탑니다. \"dig 는 되는데 앱은 안 된다\"면 `/etc/hosts`나 `nsswitch.conf` 를 " +
    "의심해야 하므로, 둘 다 볼 줄 알아야 합니다.\n" +
    "\n" +
    "**traceroute 의 세 가지 모드**: 기본은 UDP 로 탐침을 보내고(`-U`), `-I` 는 ICMP, " +
    "`-T` 는 TCP(`-p` 로 포트 지정)를 씁니다. 방화벽이 UDP 탐침만 막는 경우가 흔해서 " +
    "실무에서는 `traceroute -I` 나 `-T -p 443` 으로 바꿔 보는 것이 정석입니다. " +
    "이 실습 환경의 가상 라우터도 UDP 탐침에는 응답하지 않아 기본 모드로는 `* * *` 만 " +
    "나오고, `-I` 로 바꾸면 게이트웨이가 정상적으로 잡힙니다 — 실제 장애 조사에서 " +
    "겪는 상황과 같은 이유(경로가 아니라 탐침 방식의 문제)입니다.\n" +
    "\n" +
    "**이 실습 환경의 한계**: 가상 라우터가 모든 주소의 ICMP 에 응답하므로 `ping` 은 " +
    "어디로 보내도 성공하고 홉도 사실상 하나뿐입니다. 또 DNS 와 외부 HTTP 는 " +
    "브라우저 밖으로 나가지 못해, 이 문제에서는 서버 자신이 사설 DNS(dnsmasq)와 " +
    "웹 서버(nginx)를 함께 돌립니다 — 그래서 `dig` 가 `app.internal` 을 실제로 " +
    "해석하고 `curl` 이 200 을 받습니다. 명령의 사용법과 출력 읽는 법을 익히는 것이 " +
    "여기서의 목표입니다.",
  verify: {
    answer: [
      "ip link",
      "ip addr",
      "ip route",
      "cat /etc/resolv.conf",
      "dig app.internal",
      "ping -c 2 -W 3 192.168.86.1",
      "traceroute -I -m 3 -w 1 192.168.86.1",
      "ss -lntup",
      "ss -antp",
      "nc -zv 127.0.0.1 80",
      "curl -sI http://127.0.0.1/",
      "ip -s link show eth0",
    ],
  },
} satisfies Problem;
