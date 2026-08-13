import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net05 = {
  id: "net-05",
  category: "network",
  title: "tcpdump 실시간 패킷 관찰 (세션 복제)",
  difficulty: 3,
  tags: ["tcpdump", "ping"],
  commands: ["tcpdump", "ping"],
  terminals: 2,
  scenario:
    "실무에서 패킷 확인은 창 두 개로 합니다 — 한쪽에서 트래픽을 만들고, " +
    "다른 쪽에서 tcpdump 로 실시간으로 흘러가는 패킷을 지켜봅니다.\n" +
    "터미널 위의 ⧉ 복제 버튼(또는 서버 목록의 ⧉ 복제)을 누르면 같은 서버의 " +
    "두 번째 셸이 열립니다. 세션 ②에 tcpdump 를 켜 두고, 세션 ①에서 ping 을 " +
    "보내면서 패킷이 실제로 잡히는 것을 눈으로 확인하세요.",
  objectives: [
    "⧉ 세션 복제로 localhost의 두 번째 터미널(세션 ②)을 여세요.",
    "세션 ②에서 tcpdump -i lo -n icmp 를 실행해 두세요 (종료하지 말 것 — 채점도 실행 중인 상태에서).",
    "세션 ①에서 ping -c 3 127.0.0.1 을 실행하고, 세션 ②에 echo request/reply 가 찍히는 것을 관찰하세요.",
    "세션 ①에서 ping 결과 요약을 저장하세요: ping -c 3 127.0.0.1 | tail -2 > /root/work/ping.txt",
  ],
  setup: [...NET_RESET],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "pgrep -f 'tcpdump -i lo' >/dev/null",
      label: "세션 ②에서 tcpdump가 실행 중인가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/ping.txt",
      expect: { includes: "0% packet loss" },
      label: "ping 결과가 기록되고 손실이 없는가",
    },
  ],
  hints: [
    "터미널 타이틀바(또는 왼쪽 서버 목록)의 ⧉ 복제를 누르면 같은 서버의 세션 ②가 열립니다. 실무에서 SSH 창을 하나 더 여는 것과 같습니다.",
    "세션 ②: tcpdump -i lo -n icmp  (-i 인터페이스, -n 이름 해석 끔, icmp 는 캡처 필터). Ctrl+C 로 끄지 말고 그대로 두세요.",
    "세션 ①: ping -c 3 127.0.0.1 | tail -2 > /root/work/ping.txt — 실행 순간 세션 ②에 패킷이 찍히는 걸 보세요.",
  ],
  explanation:
    "정답 순서:\n" +
    "[세션 복제] ⧉ 버튼으로 같은 서버의 두 번째 셸을 연다\n" +
    "[세션 ②] tcpdump -i lo -n icmp     # 실시간 관찰 시작 (포그라운드 유지)\n" +
    "[세션 ①] ping -c 3 127.0.0.1 | tail -2 > /root/work/ping.txt\n\n" +
    "세션 ②에는 ping 한 번마다 ICMP echo request 와 echo reply 두 줄이 실시간으로 " +
    "찍힙니다 — 요청과 응답이 별개의 패킷이라는 것을 눈으로 확인하는 것이 핵심입니다.\n" +
    "이 두-창 패턴(한쪽 재현, 한쪽 관찰)은 방화벽 디버깅, 서비스 연결 추적 등 " +
    "실무 네트워크 조사에서 가장 기본이 되는 작업 방식입니다. mRemoteNG·MobaXterm " +
    "같은 도구의 '세션 복제'가 정확히 이 용도입니다.\n" +
    "관찰을 마치면 Ctrl+C 로 tcpdump 를 종료합니다. 파일로 남기고 싶을 때는 " +
    "-w 캡처.pcap 옵션을 쓰고 tcpdump -r 로 다시 읽습니다.",
  verify: {
    answer: [
      { on: "t2", cmd: "tcpdump -i lo -n icmp >/dev/null 2>&1 &" },
      { on: "a", cmd: "sleep 1; ping -c 3 127.0.0.1 | tail -2 > /root/work/ping.txt" },
    ],
  },
} satisfies Problem;
