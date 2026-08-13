import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net04 = {
  id: "net-04",
  category: "network",
  title: "iptables로 트래픽 차단하기",
  difficulty: 3,
  tags: ["iptables", "DROP"],
  commands: ["iptables", "ping"],
  scenario:
    "방화벽 훈련입니다. iptables 규칙이 실제 트래픽을 어떻게 차단하는지 " +
    "루프백(lo) 인터페이스에서 안전하게 체험해 봅니다.\n" +
    "지금은 ping 127.0.0.1 이 정상 동작합니다. INPUT 체인에 규칙을 추가해 " +
    "lo 로 들어오는 ICMP(ping)를 차단하고, 실제로 막히는지 확인하세요.",
  objectives: [
    "먼저 ping -c 1 127.0.0.1 이 되는 것을 확인하세요.",
    "INPUT 체인에 lo 인터페이스의 icmp 프로토콜을 DROP 하는 규칙을 추가하세요.",
    "다시 ping 해서 응답이 오지 않는 것(차단)을 확인하세요.",
  ],
  setup: [...NET_RESET, "ping -c 1 -W 2 127.0.0.1 >/dev/null"],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "iptables -S | grep -q -- '-A INPUT -i lo -p icmp -j DROP'",
      label: "차단 규칙이 INPUT 체인에 있는가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "! ping -c 1 -W 1 127.0.0.1 >/dev/null 2>&1",
      timeoutMs: 8000,
      label: "ping이 실제로 차단되는가 (행동 검증)",
    },
  ],
  hints: [
    "규칙 문법: iptables -A 체인 -i 인터페이스 -p 프로토콜 -j 처리. 체인은 INPUT, 처리는 DROP.",
    "iptables -A INPUT -i lo -p icmp -j DROP — 현재 규칙 확인은 iptables -S 또는 iptables -L -n.",
  ],
  explanation:
    "정답:\n" +
    "iptables -A INPUT -i lo -p icmp -j DROP\n\n" +
    "규칙 해부: -A INPUT(들어오는 패킷 체인 끝에 추가) -i lo(이 인터페이스로 들어오는 것만) " +
    "-p icmp(ping이 쓰는 프로토콜) -j DROP(응답 없이 버림 — REJECT는 거절 통지를 보냄).\n" +
    "확인은 iptables -S(규칙을 명령 형태로) / iptables -L -n(표 형태). " +
    "삭제는 -A 를 -D 로 바꿔 실행하거나 iptables -F(전체 비우기).\n" +
    "실무 주의: 원격 서버에서 INPUT 정책을 함부로 DROP 하면 자기 SSH가 잘려 " +
    "콘솔로 달려가야 합니다. 규칙은 항상 '허용을 먼저, 차단을 나중에' 순서로 검토하세요.",
  verify: {
    answer: ["iptables -A INPUT -i lo -p icmp -j DROP"],
  },
} satisfies Problem;
