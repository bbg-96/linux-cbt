import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net02 = {
  id: "net-02",
  category: "network",
  title: "기본 게이트웨이가 사라졌다",
  difficulty: 2,
  scenario:
    "eth0 에 IP(192.168.86.100/24)는 잡혀 있는데 외부로 나가는 통신이 전부 실패합니다.\n" +
    "같은 대역은 되고 다른 대역만 안 될 때 첫 번째 용의자는 라우팅 테이블 — " +
    "기본 게이트웨이(default route)가 없는 상태입니다. 게이트웨이는 192.168.86.1 입니다.",
  objectives: [
    "ip route(또는 route -n)로 라우팅 테이블을 확인하세요 — default 경로가 없습니다.",
    "기본 게이트웨이 192.168.86.1 을 추가하세요.",
    "ping 으로 게이트웨이와 통신되는지 확인하세요.",
  ],
  setup: [
    ...NET_RESET,
    "ip link set eth0 up",
    "ip addr add 192.168.86.100/24 dev eth0",
  ],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "ip route | grep -q '^default via 192.168.86.1'",
      label: "default 경로가 192.168.86.1로 잡혔는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "ping -c 1 -W 3 192.168.86.1",
      timeoutMs: 10000,
      label: "게이트웨이에 ping이 되는가",
    },
  ],
  hints: [
    "라우팅 테이블은 ip route 로 봅니다. 'default via …' 줄이 기본 게이트웨이입니다.",
    "추가: ip route add default via 192.168.86.1 (전통 명령: route add default gw 192.168.86.1)",
  ],
  explanation:
    "정답:\n" +
    "ip route add default via 192.168.86.1\n" +
    "ping -c 3 192.168.86.1\n\n" +
    "라우팅 테이블은 '이 목적지는 어디로 보낼까'의 규칙표입니다. " +
    "192.168.86.0/24 처럼 직접 연결된 대역은 주소를 설정할 때 커널이 자동으로 넣어 주지만, " +
    "그 밖의 모든 목적지를 담당하는 default 경로는 직접 지정해야 합니다.\n" +
    "같은 대역 통신은 되는데 다른 대역만 안 되면 거의 항상 default route 문제입니다. " +
    "전통 명령 route -n 은 같은 표를 다른 형식(0.0.0.0)으로 보여줍니다 — " +
    "ip route 의 'default'와 route -n 의 '0.0.0.0'은 같은 뜻입니다.",
  verify: {
    answer: ["ip route add default via 192.168.86.1", "ping -c 1 -W 3 192.168.86.1"],
  },
} satisfies Problem;
