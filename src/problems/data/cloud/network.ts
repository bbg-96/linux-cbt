import type { Problem } from "../../../engine/types";
import { MAC_REFRESH, NET_RESET } from "./network-shared";

export const NETWORK_PROBLEMS = [
  {
    id: "network-01",
    category: "network",
    title: "목적지별 실제 라우팅 경로 확인",
    difficulty: 1,
    tags: ["ip route", "ip route get", "Longest Prefix"],
    commands: ["ip", "route"],
    scenario:
      "서버에는 10.30.0.0/16과 더 구체적인 10.30.40.0/24 경로가 함께 있습니다. " +
      "목적지 10.30.40.50 트래픽이 실제로 선택하는 게이트웨이를 추측하지 말고 커널에 질의해 증적으로 남기세요.",
    objectives: ["전체 라우팅 테이블을 확인하세요.", "ip route get으로 10.30.40.50의 실제 경로를 /root/work/route.txt에 저장하세요."],
    setup: [
      ...NET_RESET,
      "ip link set eth0 up",
      "ip addr add 10.20.0.10/24 dev eth0",
      "ip route add 10.30.0.0/16 via 10.20.0.1",
      "ip route add 10.30.40.0/24 via 10.20.0.254",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/route.txt", expect: { includes: "10.30.40.50 via 10.20.0.254" }, label: "더 구체적인 /24 경로가 선택됐는가" },
    ],
    hints: ["ip route는 전체 테이블, ip route get <IP>는 한 목적지의 최종 선택 결과를 보여 줍니다.", "가장 긴 Prefix가 우선합니다. /24는 /16보다 구체적입니다."],
    explanation:
      "정답: ip route get 10.30.40.50 > /root/work/route.txt\n\n" +
      "운영 장애에서는 기본 게이트웨이만 보면 안 됩니다. 정책 라우팅과 더 구체적인 정적 경로 때문에 목적지마다 실제 경로가 달라질 수 있습니다.",
    verify: { answer: ["ip route get 10.30.40.50 > /root/work/route.txt"] },
  },
  {
    id: "network-02",
    category: "network",
    title: "잘못된 정적 경로 교체",
    difficulty: 2,
    tags: ["ip route replace", "ip route get"],
    commands: ["ip", "route"],
    scenario:
      "신규 DB 대역 10.50.0.0/16이 잘못된 게이트웨이 10.20.0.254로 등록됐습니다. 네트워크 작업계획서의 올바른 게이트웨이는 10.20.0.1입니다. " +
      "중복 경로를 만들지 말고 기존 경로를 교체하세요.",
    objectives: ["10.50.0.0/16 경로의 게이트웨이를 10.20.0.1로 교체하세요.", "ip route get 10.50.10.20으로 결과를 검증하세요."],
    setup: [...NET_RESET, "ip link set eth0 up", "ip addr add 10.20.0.10/24 dev eth0", "ip route add 10.50.0.0/16 via 10.20.0.254"],
    checks: [
      { id: "c1", type: "command", cmd: "ip route show 10.50.0.0/16 | grep -q 'via 10.20.0.1'", label: "정적 경로가 올바른 게이트웨이를 사용하는가" },
      { id: "c2", type: "command", cmd: "! ip route show 10.50.0.0/16 | grep -q '10.20.0.254'", label: "잘못된 경로가 제거됐는가" },
    ],
    hints: ["ip route replace는 경로가 있으면 교체하고 없으면 추가합니다.", "명령 형식: ip route replace <대역> via <게이트웨이>"],
    explanation:
      "정답: ip route replace 10.50.0.0/16 via 10.20.0.1\n\n" +
      "add를 반복하면 File exists 오류나 다중 경로가 생길 수 있습니다. 계획된 단일 경로 변경에는 replace가 재실행에도 안전합니다.",
    verify: { answer: ["ip route replace 10.50.0.0/16 via 10.20.0.1"] },
  },
  {
    id: "network-03",
    category: "network",
    title: "애플리케이션 관점의 이름 해석 복구",
    difficulty: 1,
    tags: ["getent ahostsv4", "/etc/hosts", "NSS"],
    commands: ["getent", "sed"],
    scenario:
      "사설 DNS 연동 전 임시로 app.internal을 10.20.30.40에 매핑해야 합니다. nslookup만 보는 대신 애플리케이션이 사용하는 NSS 경로를 getent로 검증하세요.",
    objectives: ["/etc/hosts에 10.20.30.40 app.internal 매핑을 추가하세요.", "getent ahostsv4 app.internal이 해당 IPv4를 반환하게 하세요."],
    setup: ["sed -i '/[[:space:]]app.internal$/d' /etc/hosts"],
    checks: [
      { id: "c1", type: "command", cmd: "getent ahostsv4 app.internal | grep -q '^10.20.30.40'", label: "app.internal이 지정 IP로 해석되는가" },
      { id: "c2", type: "command", cmd: "test $(grep -Ec '^[[:space:]]*10.20.30.40[[:space:]]+app.internal([[:space:]]|$)' /etc/hosts) -eq 1", label: "중복 없이 한 줄만 등록됐는가" },
    ],
    hints: ["echo '10.20.30.40 app.internal' >> /etc/hosts", "getent는 /etc/nsswitch.conf 순서에 따라 hosts 파일과 DNS를 모두 반영합니다."],
    explanation:
      "정답:\necho '10.20.30.40 app.internal' >> /etc/hosts\ngetent ahostsv4 app.internal\n\n" +
      "nslookup·dig는 DNS 서버를 직접 질의하지만 getent는 실제 애플리케이션과 같은 이름 해석 경로를 사용합니다. /etc/hosts 문제를 확인할 때 getent가 더 직접적입니다.",
    verify: { answer: ["echo '10.20.30.40 app.internal' >> /etc/hosts"] },
  },
  {
    id: "network-04",
    category: "network",
    title: "양단 TCP 포트 개통 확인",
    difficulty: 2,
    tags: ["nc -zv", "2 VM", "TCP"],
    commands: ["nc", "ss"],
    vms: 2,
    scenario:
      "Host B의 DB 대체 서비스가 15432 포트에서 대기 중입니다. Host A에서 실제 TCP 연결을 시도해 성공 결과를 파일로 남기세요. ping 성공만으로 포트 개통을 판정하면 안 됩니다.",
    objectives: ["Host B에서 ss로 15432 LISTEN 상태를 확인하세요.", "Host A에서 nc로 192.168.86.20:15432에 연결하세요.", "성공하면 Host A의 /root/work/port-check.txt에 TCP_OK를 기록하세요."],
    setup: [...NET_RESET, ...MAC_REFRESH, "ip link set eth0 up", "ip addr add 192.168.86.10/24 dev eth0"],
    setupB: [
      ...NET_RESET,
      ...MAC_REFRESH,
      "ip link set eth0 up",
      "ip addr add 192.168.86.20/24 dev eth0",
      "pkill -f 'httpd -f -p 15432' 2>/dev/null; true",
      "mkdir -p /srv/db-port && echo ready > /srv/db-port/index.html",
      "nohup httpd -f -p 15432 -h /srv/db-port >/tmp/db-port.log 2>&1 &",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/port-check.txt", expect: { includes: "TCP_OK" }, label: "Host A에서 TCP 연결 성공을 기록했는가" },
      { id: "c2", on: "b", type: "command", cmd: "ss -lnt | grep -q ':15432'", label: "Host B가 15432 포트를 LISTEN하는가" },
    ],
    hints: ["Host A: nc -z -w 3 192.168.86.20 15432", "성공한 경우에만 && echo TCP_OK로 파일을 만드세요."],
    explanation:
      "정답: [Host A] nc -z -w 3 192.168.86.20 15432 && echo TCP_OK > /root/work/port-check.txt\n\n" +
      "ping은 ICMP 경로만, nc는 TCP 포트까지 확인합니다. nc 성공 뒤에는 curl·psql처럼 실제 프로토콜 검증을 이어가야 합니다.",
    verify: { answer: [{ on: "a", cmd: "for i in 1 2 3; do nc -z -w 3 192.168.86.20 15432 && { echo TCP_OK > /root/work/port-check.txt; break; }; sleep 1; done" }] },
  },
  {
    id: "network-05",
    category: "network",
    title: "tcpdump로 ICMP 왕복 증명",
    difficulty: 2,
    tags: ["tcpdump", "ping", "세션 복제"],
    commands: ["tcpdump", "ping"],
    terminals: 2,
    scenario:
      "방화벽 담당자는 패킷이 서버까지 오지 않는다고 주장합니다. 터미널 위의 ⧉ 복제로 같은 서버의 " +
      "두 번째 셸을 열어, 세션 ②에서 캡처를 걸고 세션 ①에서 게이트웨이로 ping을 보내 요청과 응답을 pcap으로 남기세요.",
    objectives: [
      "⧉ 세션 복제로 같은 서버의 두 번째 터미널(세션 ②)을 여세요.",
      "세션 ②에서 ICMP 2개 이상을 /root/work/icmp.pcap에 캡처하세요.",
      "세션 ①에서 192.168.86.1로 ping을 발생시키세요.",
    ],
    setup: [...NET_RESET, "ip link set eth0 up", "ip addr add 192.168.86.10/24 dev eth0", "rm -f /root/work/icmp.pcap"],
    checks: [
      { id: "c1", type: "file_exists", path: "/root/work/icmp.pcap", label: "pcap 파일이 생성됐는가" },
      { id: "c2", type: "command", cmd: "tcpdump -nr /root/work/icmp.pcap icmp 2>/dev/null | grep -q ICMP", label: "ICMP 패킷이 캡처됐는가" },
    ],
    hints: [
      "터미널 타이틀바(또는 왼쪽 서버 목록)의 ⧉ 복제를 누르면 같은 서버의 세션 ②가 열립니다.",
      "세션 ②: tcpdump -ni eth0 -c 2 -w /root/work/icmp.pcap icmp",
      "캡처를 먼저 시작한 뒤 세션 ①에서 ping -c 2 192.168.86.1을 실행하세요.",
    ],
    explanation:
      "정답:\n[세션 ②] tcpdump -ni eth0 -c 2 -w /root/work/icmp.pcap icmp\n[세션 ①] ping -c 2 192.168.86.1\n\n" +
      "패킷 캡처는 추측을 구간 증거로 바꿉니다. 요청만 보이면 상대 또는 반환 경로, 요청·응답 모두 보이면 서버 위쪽 구간을 의심합니다.",
    verify: { answer: [{ on: "t2", cmd: "tcpdump -ni eth0 -c 2 -w /root/work/icmp.pcap icmp >/tmp/tcpdump.log 2>&1 &" }, "sleep 1; ping -c 2 -W 3 192.168.86.1"] },
  },
  {
    id: "network-06",
    category: "network",
    title: "방화벽 차단 규칙 앞에 예외 추가",
    difficulty: 2,
    tags: ["iptables -I", "nc -z", "규칙 순서"],
    commands: ["iptables", "nc"],
    scenario:
      "로컬 관리 API 18083이 실행 중이지만 INPUT 체인의 선행 DROP 규칙 때문에 접속되지 않습니다. 기존 규칙을 전부 지우지 말고 정확한 예외 규칙을 앞에 추가하세요.",
    objectives: ["lo 인터페이스의 TCP 18083을 허용하는 규칙을 INPUT 맨 앞에 추가하세요.", "기존 DROP 규칙은 유지하세요.", "nc로 연결 성공을 검증하세요."],
    setup: [
      ...NET_RESET,
      "pkill -f 'httpd -f -p 127.0.0.1:18083' 2>/dev/null; true",
      "mkdir -p /srv/admin-api && echo admin-ok > /srv/admin-api/index.html",
      "nohup httpd -f -p 127.0.0.1:18083 -h /srv/admin-api >/tmp/admin-api.log 2>&1 &",
      "iptables -A INPUT -i lo -p tcp --dport 18083 -j DROP",
    ],
    checks: [
      // -S의 첫 줄은 정책(-P) 줄이므로 "첫 번째 -A 규칙"을 비교해야 한다
      { id: "c1", type: "command", cmd: "iptables -S INPUT | grep -- '-A INPUT' | head -n 1 | grep -q -- '-i lo -p tcp -m tcp --dport 18083 -j ACCEPT'", label: "허용 규칙이 DROP보다 앞에 있는가" },
      { id: "c2", type: "command", cmd: "iptables -S INPUT | grep -q -- '--dport 18083 -j DROP'", label: "기존 DROP 규칙을 유지했는가" },
      { id: "c3", type: "command", cmd: "nc -z -w 2 127.0.0.1 18083", label: "18083 연결이 성공하는가" },
    ],
    hints: ["iptables -I INPUT 1 ... 은 규칙을 첫 번째 위치에 삽입합니다.", "규칙은 위에서 아래로 평가되므로 ACCEPT가 DROP보다 먼저 와야 합니다."],
    explanation:
      "정답: iptables -I INPUT 1 -i lo -p tcp --dport 18083 -j ACCEPT\n\n" +
      "장애 조치에서 iptables -F로 전체 정책을 지우는 것은 위험합니다. 최소 범위의 예외를 정확한 순서에 추가하고 연결을 재검증합니다.",
    verify: { answer: ["iptables -I INPUT 1 -i lo -p tcp --dport 18083 -j ACCEPT"] },
  },
  {
    id: "network-07",
    category: "network",
    title: "ARP 이웃 상태로 L2 도달 확인",
    difficulty: 2,
    tags: ["ping", "ip neigh", "2 VM"],
    commands: ["ping", "ip"],
    vms: 2,
    scenario:
      "Host A와 Host B가 같은 서브넷인데 통신 여부를 확인해야 합니다. Host A에서 B로 트래픽을 발생시킨 뒤 ARP 이웃 항목의 MAC과 상태를 증적으로 남기세요.",
    objectives: ["Host A에서 192.168.86.20으로 ping을 보내세요.", "Host A의 ip neigh 결과를 /root/work/neigh.txt에 저장하세요."],
    setup: [...NET_RESET, ...MAC_REFRESH, "ip link set eth0 up", "ip addr add 192.168.86.10/24 dev eth0", "ip neigh flush all 2>/dev/null; true"],
    setupB: [...NET_RESET, ...MAC_REFRESH, "ip link set eth0 up", "ip addr add 192.168.86.20/24 dev eth0", "ip neigh flush all 2>/dev/null; true"],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/neigh.txt", expect: { includes: "192.168.86.20" }, label: "Host B 이웃 항목이 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/neigh.txt", expect: { matches: "lladdr [0-9a-f:]{17}.*(REACHABLE|STALE|DELAY|PROBE)" }, label: "MAC과 정상 이웃 상태가 기록됐는가" },
    ],
    hints: ["ping이 ARP 요청을 발생시킨 뒤 ip neigh show 192.168.86.20을 실행합니다.", "FAILED나 INCOMPLETE이면 상대 응답, VLAN, IP 설정을 확인합니다."],
    explanation:
      "정답:\nping -c 3 -W 3 192.168.86.20\nip neigh show 192.168.86.20 > /root/work/neigh.txt\n\n" +
      "ARP 이웃 항목이 정상 MAC으로 해석되면 같은 L2 구간의 기본 연결은 성립합니다. 그다음 ICMP·TCP·애플리케이션 계층으로 올라갑니다.",
    verify: { answer: ["for i in 1 2 3; do ping -c 2 -W 3 192.168.86.20 && break; sleep 1; done", "ip neigh show 192.168.86.20 > /root/work/neigh.txt"] },
  },
] satisfies Problem[];
