import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net03 = {
  id: "net-03",
  category: "network",
  title: "네트워크 장애 진단 풀코스",
  difficulty: 2,
  scenario:
    "\"서버가 안 붙어요\"라는 신고가 들어왔습니다. 진단 순서대로 확인해 보니 " +
    "eth0 는 UP 인데 IP가 없습니다. 이 대역은 DHCP 서버(192.168.86.1)가 주소를 나눠줍니다.\n" +
    "복구 후, 서버에서 리스닝 중인 TCP 포트 현황도 함께 보고해야 합니다 " +
    "(8080 포트에 서비스가 하나 떠 있습니다).",
  objectives: [
    "udhcpc 로 eth0 에 DHCP 주소를 받으세요 (udhcpc -i eth0 -n -q).",
    "게이트웨이 192.168.86.1 에 ping 으로 통신을 확인하세요.",
    "netstat -tln 출력(리스닝 TCP 포트)을 /root/work/ports.txt 로 저장하세요.",
  ],
  setup: [
    ...NET_RESET,
    "ip link set eth0 up",
    "killall nc 2>/dev/null; true",
    "nc -l -p 8080 >/dev/null 2>&1 &",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "ip -4 addr show eth0 | grep -q 'inet 192.168.86.'",
      label: "DHCP로 주소를 받았는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "ip route | grep -q '^default via'",
      label: "기본 경로까지 자동 구성됐는가",
    },
    {
      id: "c3",
      type: "command",
      cmd: "ping -c 1 -W 3 192.168.86.1",
      timeoutMs: 10000,
      label: "게이트웨이와 통신되는가",
    },
    {
      id: "c4",
      type: "file_content",
      path: "/root/work/ports.txt",
      expect: { includes: ":8080" },
      label: "리스닝 포트 8080이 보고서에 있는가",
    },
  ],
  hints: [
    "DHCP 클라이언트: udhcpc -i eth0 -n -q (-i 인터페이스, -n 실패 시 종료, -q 임대 후 종료).",
    "netstat -tln: t=TCP, l=리스닝만, n=숫자 표기. 출력을 > 로 파일에 저장하세요.",
  ],
  explanation:
    "정답:\n" +
    "udhcpc -i eth0 -n -q\n" +
    "ping -c 3 192.168.86.1\n" +
    "netstat -tln > /root/work/ports.txt\n\n" +
    "DHCP는 주소만 주는 게 아니라 게이트웨이·DNS까지 한 번에 구성해 줍니다 — " +
    "임대를 받고 나면 ip route 에 default 경로가 자동으로 생긴 것을 확인할 수 있습니다.\n" +
    "진단 순서를 기억하세요: ① ip link (인터페이스 UP?) → ② ip addr (주소 있음?) → " +
    "③ ip route (경로 있음?) → ④ ping 게이트웨이 → ⑤ netstat (서비스가 듣고 있음?). " +
    "아래(물리)에서 위(서비스)로 올라가는 이 순서가 네트워크 장애 진단의 정석입니다.",
  verify: {
    answer: [
      "udhcpc -i eth0 -n -q >/dev/null 2>&1",
      "ping -c 1 -W 3 192.168.86.1",
      "netstat -tln > /root/work/ports.txt",
    ],
  },
} satisfies Problem;
