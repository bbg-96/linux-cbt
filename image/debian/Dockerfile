# linux-cbt 스테이징용 Debian 이미지 (systemd 계열 명령 실습용)
#
# Alpine 이미지와 나누어 쓰는 이유: hostnamectl·timedatectl 은 systemd 데몬에
# D-Bus로 질의하는 클라이언트라 systemd 가 PID 1 이어야 하고, systemd 는 musl
# 환경(Alpine)에 이식되지 않는다. 그래서 이 트랙만 glibc/systemd 배포판을 쓴다.
#
# 커널은 반드시 비-PAE(linux-image-686)를 쓴다. v86 에 PAE 코드가 있긴 하나
# 검증된 경로가 아니고, Debian i386 은 "older PCs" 플레이버로 비-PAE를 제공한다.
FROM docker.io/i386/debian:12

ENV DEBIAN_FRONTEND=noninteractive
# 실습 도구는 최소로 — rootfs 가 커질수록 첫 방문 다운로드가 늘어난다
ENV ADDPKGS="systemd-sysv dbus udev util-linux procps iproute2 iputils-ping \
net-tools iptables tcpdump ripgrep findutils gawk file less nano tzdata"

RUN apt-get update \
 && apt-get install -y --no-install-recommends linux-image-686 $ADDPKGS \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man /usr/share/locale

# root 로그인 비밀번호 없음 + 시리얼 콘솔 자동 로그인 (ttyS0=세션①, ttyS1=세션②)
RUN passwd -d root
RUN mkdir -p /etc/systemd/system/serial-getty@ttyS0.service.d \
             /etc/systemd/system/serial-getty@ttyS1.service.d
RUN printf '[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin root --noclear %%I 115200 vt100\n' \
      > /etc/systemd/system/serial-getty@ttyS0.service.d/autologin.conf \
 && cp /etc/systemd/system/serial-getty@ttyS0.service.d/autologin.conf \
       /etc/systemd/system/serial-getty@ttyS1.service.d/autologin.conf
RUN systemctl enable serial-getty@ttyS0.service serial-getty@ttyS1.service

# 부팅 시간을 잡아먹거나 에뮬레이터에서 의미 없는 유닛들을 끈다.
# (systemd-networkd 는 끄지 않는다 — 네트워크 문제에서 쓸 여지가 있고 비용이 작다)
RUN systemctl disable apt-daily.timer apt-daily-upgrade.timer 2>/dev/null || true
RUN systemctl mask systemd-random-seed.service systemd-update-utmp.service \
      e2scrub_reap.service systemd-timesyncd.service 2>/dev/null || true

# 하드웨어 랜덤·엔트로피가 없는 환경이라 부팅이 멈추지 않도록
RUN printf 'root=/dev/sda\n' > /etc/kernel-img.conf || true

# hostnamed·timedated 는 유휴 30초면 스스로 종료하는 버스 활성화 데몬이라,
# 학습자가 hostnamectl/timedatectl 을 칠 때마다 에뮬레이터에서 데몬을 새로
# 띄우는 수 초의 비용이 든다. 25초 주기로 가볍게 질의해 상주시킨다.
# (busctl 은 클라이언트 로딩이 가장 가벼운 경로 — hostnamectl 재호출보다 싸다)
RUN printf '[Unit]\nDescription=Keep hostnamed/timedated resident (emulator latency)\nAfter=multi-user.target\n\n[Service]\nExecStart=/bin/sh -c "while :; do busctl get-property org.freedesktop.hostname1 /org/freedesktop/hostname1 org.freedesktop.hostname1 Hostname >/dev/null 2>&1; busctl get-property org.freedesktop.timedate1 /org/freedesktop/timedate1 org.freedesktop.timedate1 Timezone >/dev/null 2>&1; sleep 25; done"\nRestart=always\n\n[Install]\nWantedBy=multi-user.target\n' > /etc/systemd/system/ctl-keepalive.service
RUN systemctl enable ctl-keepalive.service

RUN hostnamectl set-hostname localhost 2>/dev/null; echo localhost > /etc/hostname
RUN printf '127.0.0.1\tlocalhost\n' > /etc/hosts

# 루트 파일시스템은 파티션 없는 통짜 ext4 (v86 hda) — 부트로더를 쓰지 않고
# 커널·initrd 를 직접 로드하므로 /etc/fstab 은 루트만 있으면 된다
RUN printf '/dev/sda / ext4 rw,relatime 0 1\n' > /etc/fstab

# 학습 편의: 컬러 프롬프트는 앱이 PS1 로 주입하므로 여기서는 건드리지 않는다
