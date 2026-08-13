/**
 * 네트워크 상태는 workdir와 달리 전역이므로, 모든 network 문제의 setup은
 * 이 리셋 프리앰블로 시작한다. 각 줄은 어떤 상태에서도 rc 0으로 끝나야 한다
 * (시딩은 rc!=0에서 중단되므로).
 */
export const NET_RESET: string[] = [
  "modprobe virtio_net 2>/dev/null; true",
  "rc-service networkmanager stop >/dev/null 2>&1; true",
  "killall tcpdump 2>/dev/null; true",
  "killall udhcpc 2>/dev/null; true",
  "killall nc 2>/dev/null; true",
  "iptables -F 2>/dev/null; iptables -X 2>/dev/null; true",
  "iptables -P INPUT ACCEPT; iptables -P OUTPUT ACCEPT; iptables -P FORWARD ACCEPT",
  "ip addr flush dev eth0 2>/dev/null; true",
  "ip route flush dev eth0 2>/dev/null; true",
  "ip link set eth0 down 2>/dev/null; true",
  "ip link set lo up",
];

/**
 * vms:2 문제 전용 — 스냅숏 복원으로 두 게스트의 커널 MAC이 동일해지므로,
 * 드라이버를 다시 로드해 인스턴스별 MAC을 재읽는다. setup과 setupB 양쪽에 필수.
 */
export const MAC_REFRESH: string[] = [
  "ip link set eth0 down 2>/dev/null; true",
  "rmmod virtio_net 2>/dev/null; true",
  "modprobe virtio_net",
];
