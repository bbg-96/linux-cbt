import type { Problem } from "../../../engine/types";
import { MAC_REFRESH, NET_RESET } from "./shared";

export const net07 = {
  id: "net-07",
  category: "network",
  title: "양단 통신 개통과 수신 확인",
  difficulty: 3,
  tags: ["ip addr", "ping", "tcpdump -r"],
  commands: ["ip", "ping", "tcpdump"],
  vms: 2,
  scenario:
    "진짜 두 대의 서버가 같은 네트워크에 연결되어 있습니다. 서버 목록의 host-b는 " +
    "192.168.86.20/24 로 이미 설정되어 있지만, host-a는 아직 IP가 없습니다.\n" +
    "A를 설정해 통신을 개통하고, '상대편에서' 패킷이 실제로 도착하는지 " +
    "B의 tcpdump 캡처로 증명하세요.",
  objectives: [
    "Host A: eth0를 UP 하고 192.168.86.10/24 를 설정하세요.",
    "Host B: eth0의 ICMP 패킷 4개를 /root/work/cap.pcap 으로 캡처하도록 백그라운드 실행하세요 (tcpdump -c 4 -w … &).",
    "Host A: ping -c 3 192.168.86.20 으로 트래픽을 보내세요.",
    "Host B: tcpdump -r 로 캡처를 판독해 A(.10)가 보낸 echo request 가 잡혔는지 확인하세요.",
  ],
  setup: [...NET_RESET, ...MAC_REFRESH],
  setupB: [
    ...NET_RESET,
    ...MAC_REFRESH,
    "ip link set eth0 up",
    "ip addr add 192.168.86.20/24 dev eth0",
  ],
  checks: [
    {
      id: "c1",
      on: "a",
      type: "command",
      cmd: "ip -4 addr show eth0 | grep -q 'inet 192.168.86.10/24'",
      label: "Host A에 192.168.86.10/24가 설정됐는가",
    },
    {
      id: "c2",
      on: "a",
      type: "command",
      cmd: "ping -c 2 -W 3 192.168.86.20",
      timeoutMs: 12000,
      label: "Host A에서 Host B로 ping이 되는가",
    },
    {
      id: "c3",
      on: "b",
      type: "command",
      cmd: "tcpdump -nn -r /root/work/cap.pcap 2>/dev/null | grep -q '192.168.86.10 > 192.168.86.20'",
      timeoutMs: 8000,
      label: "B의 캡처에 A가 보낸 패킷이 담겼는가",
    },
  ],
  hints: [
    "Host A: ip link set eth0 up && ip addr add 192.168.86.10/24 dev eth0",
    "Host B에서 먼저 캡처를 걸고(tcpdump -i eth0 -c 4 -w /root/work/cap.pcap icmp &) A에서 ping 하세요. 판독은 tcpdump -nn -r /root/work/cap.pcap",
  ],
  explanation:
    "정답 순서:\n" +
    "[Host A] ip link set eth0 up\n" +
    "[Host A] ip addr add 192.168.86.10/24 dev eth0\n" +
    "[Host B] tcpdump -i eth0 -c 4 -w /root/work/cap.pcap icmp &\n" +
    "[Host A] ping -c 3 192.168.86.20\n" +
    "[Host B] tcpdump -nn -r /root/work/cap.pcap\n\n" +
    "같은 대역(/24)이라 라우터 없이 L2로 직접 통신합니다. 내 쪽 ping 성공만으로는 " +
    "증거가 반쪽입니다 — '상대편 인터페이스에 패킷이 실제로 들어왔는가'를 캡처로 " +
    "확인하는 것이 장애 조사의 핵심입니다 (방화벽·라우팅 문제를 갈라내는 기준점).\n" +
    "-c 4 는 4개를 잡으면 tcpdump가 스스로 종료되므로 백그라운드에 남지 않습니다. " +
    "순서도 중요합니다: 캡처를 먼저 걸고 트래픽을 만들어야 놓치지 않습니다.",
  verify: {
    answer: [
      { on: "a", cmd: "ip link set eth0 up; ip addr add 192.168.86.10/24 dev eth0" },
      { on: "b", cmd: "cd /root/work; tcpdump -i eth0 -c 4 -w cap.pcap icmp >/dev/null 2>&1 &" },
      { on: "a", cmd: "sleep 1; ping -c 3 192.168.86.20 >/dev/null 2>&1; sleep 1; true" },
    ],
  },
} satisfies Problem;
