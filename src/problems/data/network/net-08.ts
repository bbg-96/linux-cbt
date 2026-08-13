import type { Problem } from "../../../engine/types";
import { MAC_REFRESH, NET_RESET } from "./shared";

export const net08 = {
  id: "net-08",
  category: "network",
  title: "서버-클라이언트: nc로 양단 데이터 전송",
  difficulty: 3,
  tags: ["nc -l", "nc", "파이프"],
  commands: ["nc"],
  vms: 2,
  scenario:
    "두 서버 간 파일 전송 경로가 뚫려 있는지 점검해야 합니다. 정식 서비스 대신 " +
    "nc(netcat)로 임시 서버를 띄워 확인하는 것이 현장의 단골 수법입니다.\n" +
    "Host B(192.168.86.20)에 수신 서버를 열고, Host A(192.168.86.10)에서 " +
    "메시지를 보내 실제로 도착하는지 확인하세요. 두 호스트의 IP는 이미 설정되어 있습니다.",
  objectives: [
    "Host B: 5000번 포트로 들어오는 데이터를 /root/work/received.txt 에 저장하는 nc 서버를 백그라운드로 여세요.",
    "Host A: 'hello from A' 메시지를 B의 5000번 포트로 보내세요 (echo + 파이프 + nc).",
    "Host B: cat 으로 received.txt 에 메시지가 도착했는지 확인하세요.",
  ],
  setup: [
    ...NET_RESET,
    ...MAC_REFRESH,
    "ip link set eth0 up",
    "ip addr add 192.168.86.10/24 dev eth0",
  ],
  setupB: [
    ...NET_RESET,
    ...MAC_REFRESH,
    "ip link set eth0 up",
    "ip addr add 192.168.86.20/24 dev eth0",
    // 첫 L2 접촉은 ARP+JIT 콜드스타트로 수 초 걸릴 수 있어 시딩에서 경로를 예열한다
    "ping -c 3 -W 3 192.168.86.10 >/dev/null 2>&1; true",
  ],
  checks: [
    {
      id: "c1",
      on: "b",
      type: "file_exists",
      path: "/root/work/received.txt",
      label: "B에 수신 파일이 생성됐는가",
    },
    {
      id: "c2",
      on: "b",
      type: "file_content",
      path: "/root/work/received.txt",
      expect: { includes: "hello from A" },
      label: "A가 보낸 메시지가 B에 도착했는가",
    },
  ],
  hints: [
    "Host B (서버 먼저!): nc -l -p 5000 > /root/work/received.txt &   — busybox nc는 연결 한 번 받으면 종료되는 원샷 서버입니다.",
    "Host A (클라이언트): echo 'hello from A' | nc -w 3 192.168.86.20 5000   (-w 3 = 3초 타임아웃)",
  ],
  explanation:
    "정답 순서:\n" +
    "[Host B] nc -l -p 5000 > /root/work/received.txt &\n" +
    "[Host A] echo 'hello from A' | nc -w 3 192.168.86.20 5000\n" +
    "[Host B] cat /root/work/received.txt\n\n" +
    "nc 는 'TCP 소켓의 cat'입니다 — -l(listen)이면 서버, 주소·포트를 주면 클라이언트가 " +
    "됩니다. 표준 입출력과 소켓을 그대로 이어주기 때문에 리다이렉션·파이프와 조합해 " +
    "즉석 파일 전송, 포트 개통 점검, 방화벽 테스트에 두루 씁니다.\n" +
    "순서가 핵심입니다: 서버(-l)가 먼저 떠 있어야 클라이언트가 접속할 수 있습니다. " +
    "접속이 안 될 때의 점검 순서는 ping(도달) → nc 접속(포트) → iptables(차단 규칙) 순입니다.",
  verify: {
    answer: [
      { on: "b", cmd: "nc -l -p 5000 > /root/work/received.txt 2>/dev/null &" },
      {
        on: "a",
        cmd: "sleep 1; for i in 1 2 3; do echo 'hello from A' | nc -w 3 192.168.86.20 5000 && break; sleep 1; done; true",
      },
    ],
  },
} satisfies Problem;
