/**
 * 네트워크 상태는 workdir와 달리 전역이므로, 모든 network 문제의 setup은
 * 이 리셋 프리앰블로 시작한다. 각 줄은 어떤 상태에서도 rc 0으로 끝나야 한다
 * (시딩은 rc!=0에서 중단되므로).
 */
export const NET_RESET: string[] = [
  "modprobe virtio_net 2>/dev/null; true",
  "killall tcpdump 2>/dev/null; true",
  "killall udhcpc 2>/dev/null; true",
  "iptables -F 2>/dev/null; iptables -X 2>/dev/null; true",
  "iptables -P INPUT ACCEPT; iptables -P OUTPUT ACCEPT; iptables -P FORWARD ACCEPT",
  "ip addr flush dev eth0 2>/dev/null; true",
  "ip route flush dev eth0 2>/dev/null; true",
  "ip link set eth0 down 2>/dev/null; true",
  "ip link set lo up",
];
