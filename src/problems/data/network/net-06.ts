import type { Problem } from "../../../engine/types";
import { NET_RESET } from "./shared";

export const net06 = {
  id: "net-06",
  category: "network",
  title: "nmcli로 고정 IP 프로필 전환",
  difficulty: 3,
  tags: ["nmcli", "connection"],
  scenario:
    "RHEL·CentOS 계열 서버는 NetworkManager 가 네트워크를 관리하고, 관리 도구는 nmcli 입니다.\n" +
    "이 서버에는 NetworkManager 가 켜져 있고 eth0 는 자동(DHCP) 연결로 붙어 있습니다. " +
    "운영 정책에 따라 'lab' 이라는 고정 IP 프로필로 전환해야 합니다:\n" +
    "IP 192.168.86.50/24, 게이트웨이 192.168.86.1, IPv6 는 사용하지 않는 환경입니다.",
  objectives: [
    "nmcli device status 로 eth0 가 NetworkManager 관리 중인지 확인하세요.",
    "고정 IP 연결 프로필 lab 을 만드세요 (ipv4.method manual, 192.168.86.50/24, gateway 192.168.86.1, ipv6.method disabled).",
    "lab 프로필을 활성화하고, 게이트웨이에 ping 이 되는지 확인하세요.",
  ],
  setup: [
    ...NET_RESET,
    "rc-service udev start >/dev/null 2>&1; rc-service udev-trigger start >/dev/null 2>&1; true",
    "rc-service dbus start >/dev/null 2>&1; true",
    "rc-service networkmanager start >/dev/null 2>&1; true",
    "i=0; while ! nmcli general status >/dev/null 2>&1; do i=$((i+1)); [ $i -gt 45 ] && exit 1; sleep 1; done",
    "nmcli connection delete lab >/dev/null 2>&1; true",
  ],
  setupTimeoutMs: 60_000,
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "nmcli -t -f NAME connection show --active | grep -qx lab",
      timeoutMs: 15000,
      label: "lab 프로필이 활성 상태인가",
    },
    {
      id: "c2",
      type: "command",
      cmd: "ip -4 addr show eth0 | grep -q 'inet 192.168.86.50/24'",
      label: "eth0에 고정 IP가 적용됐는가",
    },
    {
      id: "c3",
      type: "command",
      cmd: "ping -c 1 -W 3 192.168.86.1",
      timeoutMs: 10000,
      label: "게이트웨이와 통신되는가",
    },
  ],
  hints: [
    "프로필 생성 골격: nmcli connection add type ethernet ifname eth0 con-name lab ipv4.method manual ipv4.addresses <IP/프리픽스> ipv4.gateway <GW>",
    "이 환경엔 IPv6 라우터가 없으므로 ipv6.method disabled 를 붙여야 활성화가 지연되지 않습니다. 활성화는 nmcli connection up lab.",
  ],
  explanation:
    "정답:\n" +
    "nmcli connection add type ethernet ifname eth0 con-name lab " +
    "ipv4.method manual ipv4.addresses 192.168.86.50/24 ipv4.gateway 192.168.86.1 ipv6.method disabled\n" +
    "nmcli connection up lab\n\n" +
    "NetworkManager 의 핵심 개념: device(물리 장치)와 connection(설정 프로필)이 분리되어 " +
    "있고, 한 장치에 여러 프로필을 만들어 두고 up/down 으로 전환합니다.\n" +
    "ipv4.method manual 이 고정 IP 모드이고(auto 가 DHCP), 프로필은 " +
    "/etc/NetworkManager/system-connections/ 에 저장되어 재부팅에도 유지됩니다 — " +
    "ip 명령의 일회성 설정과의 결정적 차이입니다.\n" +
    "확인 명령 모음: nmcli device status(장치), nmcli connection show --active(활성 프로필), " +
    "nmcli -t(스크립트용 간결 출력). IPv6 미사용 환경에서 ipv6.method disabled 를 " +
    "빼먹으면 IPv6 자동 설정을 기다리느라 활성화가 오래 걸리거나 실패할 수 있습니다.",
  verify: {
    answer: [
      "nmcli connection add type ethernet ifname eth0 con-name lab ipv4.method manual ipv4.addresses 192.168.86.50/24 ipv4.gateway 192.168.86.1 ipv6.method disabled",
      "nmcli connection up lab",
    ],
  },
} satisfies Problem;
