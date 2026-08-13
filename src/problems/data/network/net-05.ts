import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net05 = {
  id: "net-05",
  category: "network",
  title: "tcpdump로 패킷 캡처하기",
  difficulty: 3,
  scenario:
    "네트워크 문제를 눈으로 확인하는 최종 병기는 패킷 캡처입니다.\n" +
    "루프백(lo)에서 ICMP 패킷을 캡처 파일로 남기고 판독하는 훈련을 합니다. " +
    "캡처는 백그라운드로 걸어 두고, 직접 ping 트래픽을 만들어서 잡아냅니다.",
  objectives: [
    "tcpdump 를 백그라운드로 실행해 lo 인터페이스의 icmp 패킷 4개를 /root/work/cap.pcap 에 캡처하세요 (-i, -c, -w).",
    "ping -c 3 127.0.0.1 로 트래픽을 발생시키세요.",
    "tcpdump -r 로 캡처 파일을 읽어 ICMP echo 패킷이 잡혔는지 확인하세요.",
  ],
  setup: [...NET_RESET],
  checks: [
    { id: "c1", type: "file_exists", path: "/root/work/cap.pcap", label: "캡처 파일이 생성됐는가" },
    {
      id: "c2",
      type: "command",
      cmd: "tcpdump -nn -r /root/work/cap.pcap 2>/dev/null | grep -qi 'ICMP echo'",
      timeoutMs: 8000,
      label: "캡처 안에 ICMP echo 패킷이 있는가",
    },
  ],
  hints: [
    "캡처 걸기: tcpdump -i lo -c 4 -w /root/work/cap.pcap icmp &  (-c 4: 4개 잡으면 자동 종료)",
    "그다음 ping -c 3 127.0.0.1 로 트래픽을 만들고, tcpdump -nn -r /root/work/cap.pcap 으로 판독하세요.",
  ],
  explanation:
    "정답 순서:\n" +
    "tcpdump -i lo -c 4 -w /root/work/cap.pcap icmp &\n" +
    "ping -c 3 127.0.0.1\n" +
    "tcpdump -nn -r /root/work/cap.pcap\n\n" +
    "옵션 해부: -i(인터페이스) -c(N개 잡으면 종료 — 없으면 Ctrl+C까지 계속) " +
    "-w(원시 패킷을 pcap 파일로 저장) / -r(저장된 파일 판독) -nn(이름 해석 끄고 숫자로).\n" +
    "마지막의 icmp 는 캡처 필터(BPF)입니다 — 'port 80', 'host 10.0.0.5' 처럼 조건을 걸어 " +
    "필요한 패킷만 잡는 것이 tcpdump 활용의 핵심입니다.\n" +
    "-w 로 남긴 pcap 파일은 Wireshark 에서도 열립니다. 서버에서 캡처하고 " +
    "PC에서 분석하는 것이 실무의 일반적인 흐름입니다.",
  verify: {
    answer: [
      "cd /root/work; tcpdump -i lo -c 4 -w cap.pcap icmp 2>/dev/null & sleep 1; ping -c 3 127.0.0.1 >/dev/null 2>&1; sleep 1",
    ],
  },
} satisfies Problem;
