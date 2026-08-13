import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net01 = {
  id: "net-01",
  category: "network",
  title: "인터페이스 살리기",
  difficulty: 1,
  tags: ["ip link", "ip addr"],
  scenario:
    "새로 받은 서버에 접속했는데 네트워크가 전혀 안 됩니다. 확인해 보니 eth0 인터페이스가 " +
    "비활성(DOWN) 상태이고 IP 주소도 없습니다.\n" +
    "네트워크 관리 대장에 따르면 이 서버는 192.168.86.100/24 를 쓰기로 되어 있습니다.",
  objectives: [
    "ip link(또는 ifconfig -a)로 eth0 상태를 확인하세요.",
    "eth0 인터페이스를 활성화(UP)하세요.",
    "eth0 에 IP 192.168.86.100/24 를 설정하세요.",
  ],
  setup: [...NET_RESET],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "ip link show eth0 | grep -Eq ',UP[,>]'",
      label: "eth0가 UP 상태인가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "ip -4 addr show eth0 | grep -q 'inet 192.168.86.100/24'",
      label: "IP 192.168.86.100/24가 설정됐는가",
    },
  ],
  hints: [
    "인터페이스 활성화: ip link set eth0 up (ifconfig eth0 up 도 동일).",
    "주소 부여: ip addr add 192.168.86.100/24 dev eth0. 확인은 ip -4 addr show eth0.",
  ],
  explanation:
    "정답:\n" +
    "ip link set eth0 up\n" +
    "ip addr add 192.168.86.100/24 dev eth0\n\n" +
    "ip 명령은 리눅스 네트워크 관리의 현대 표준입니다 — link(인터페이스), addr(주소), " +
    "route(경로) 서브커맨드로 나뉩니다. /24 는 넷마스크 255.255.255.0 의 CIDR 표기입니다.\n" +
    "전통 명령으로는 ifconfig eth0 192.168.86.100 netmask 255.255.255.0 up 한 줄에 " +
    "해당합니다. 옛 문서에는 ifconfig가 많으니 둘 다 읽을 줄 알아야 합니다.\n" +
    "(이렇게 설정한 값은 재부팅하면 사라집니다 — 영구 설정은 배포판별 설정 파일 몫입니다.)",
  verify: {
    answer: ["ip link set eth0 up", "ip addr add 192.168.86.100/24 dev eth0"],
  },
} satisfies Problem;
