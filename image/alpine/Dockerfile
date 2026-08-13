# linux-cbt 학습용 Alpine 이미지 (v86 tools/docker/alpine @f3d4472 기반 개조)
FROM docker.io/i386/alpine:3.21

ENV KERNEL=virt
# 학습 도구 패키지 (원본의 nodejs 대신 문제군에 필요한 도구들)
ENV ADDPKGS="bash iproute2 net-tools iptables tcpdump ripgrep findutils gawk"
# 1이면 NetworkManager(nmcli) 포함 — 기본 런레벨에는 넣지 않는다
ARG WITH_NM=0

RUN apk add openrc alpine-base agetty alpine-conf linux-$KERNEL linux-firmware-none $ADDPKGS
RUN if [ "$WITH_NM" = "1" ]; then apk add dbus networkmanager networkmanager-cli; fi

RUN sed -i 's/getty 38400 tty1/agetty --autologin root tty1 linux/' /etc/inittab
RUN echo 'ttyS0::respawn:/sbin/agetty --autologin root -s ttyS0 115200 vt100' >> /etc/inittab
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
