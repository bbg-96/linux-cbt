# linux-cbt 학습용 Alpine 이미지 (v86 tools/docker/alpine @f3d4472 기반 개조)
FROM docker.io/i386/alpine:3.21

ENV KERNEL=virt
# 학습 도구 패키지 (원본의 nodejs 대신 문제군에 필요한 도구들)
#  - 기초 트랙: bash iproute2 net-tools iptables tcpdump ripgrep findutils gawk
#  - 클라우드 실무 트랙(스테이징) 추가분:
#      busybox-extras  httpd (테스트용 경량 웹서버 — 서비스/포트 문제의 더미 서비스)
#      procps          ps aux --sort=, pgrep -af 등 실서버와 같은 GNU 동작
#      coreutils       sort -h, head -n -6 처럼 busybox에 없는 GNU 옵션
#      util-linux      findmnt (마운트 확인)
#      curl            HTTP 계층 헬스체크
#      nginx           설정 검사(nginx -t) 문제
#      rsync           미러링·dry-run 문제
#      rpm sqlite      RPM DB 재구축 문제 (rpm-dev = rpmbuild)
ENV ADDPKGS="bash iproute2 net-tools iptables tcpdump ripgrep findutils gawk \
busybox-extras procps coreutils util-linux curl nginx rsync rpm rpm-dev sqlite"
# 1이면 NetworkManager(nmcli) 포함 — 기본 런레벨에는 넣지 않는다
ARG WITH_NM=0

RUN apk add openrc alpine-base agetty alpine-conf linux-$KERNEL linux-firmware-none $ADDPKGS
# NetworkManager는 장치 관리에 udev 이벤트가 필요하다 (없으면 strictly unmanaged)
RUN if [ "$WITH_NM" = "1" ]; then apk add dbus networkmanager networkmanager-cli eudev; fi
# v86 가상 라우터가 광범위하게 ARP 응답을 해 NM의 중복 주소 감지(ACD)가 오탐하므로 비활성화
RUN if [ "$WITH_NM" = "1" ]; then mkdir -p /etc/NetworkManager/conf.d \
  && printf '[connection]\nipv4.dad-timeout=0\n' > /etc/NetworkManager/conf.d/90-v86.conf; fi

RUN sed -i 's/getty 38400 tty1/agetty --autologin root tty1 linux/' /etc/inittab
RUN echo 'ttyS0::respawn:/sbin/agetty --autologin root -s ttyS0 115200 vt100' >> /etc/inittab
# 듀얼 터미널: 두 번째 시리얼 콘솔 (v86 uart1)
RUN echo 'ttyS1::respawn:/sbin/agetty --autologin root -s ttyS1 115200 vt100' >> /etc/inittab
RUN echo "root:" | chpasswd

RUN setup-hostname localhost

# NIC 드라이버는 부팅 시 로드하되, eth0 설정 자체는 문제(net-01)가 가르친다
RUN echo virtio_net >> /etc/modules
RUN printf 'auto lo\niface lo inet loopback\n' > /etc/network/interfaces

# https://wiki.alpinelinux.org/wiki/Alpine_Linux_in_a_chroot#Preparing_init_services
RUN for i in devfs dmesg mdev hwdrivers; do rc-update add $i sysinit; done
RUN for i in hwclock modules sysctl hostname syslog bootmisc networking; do rc-update add $i boot; done
RUN rc-update add killprocs shutdown

# 9p 루트 부팅용 initramfs
RUN mkinitfs -F "base virtio 9p" $(cat /usr/share/kernel/$KERNEL/kernel.release)
