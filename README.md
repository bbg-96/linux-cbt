# 리눅스 실습 CBT

브라우저에서 **진짜 리눅스**가 부팅되는 실기 학습 사이트.
시나리오를 읽고 가상 터미널에서 직접 명령어로 해결하면 자동으로 채점된다.

- 터미널은 시뮬레이터가 아니다 — [v86](https://github.com/copy/v86) (x86→WebAssembly 에뮬레이터)이
  브라우저 안에서 **Alpine Linux 3.21**(커널 6.12-virt, i686)을 부팅한다.
- 가상 네트워크 내장: v86의 fetch 릴레이가 클라이언트 안에서 가상 라우터(192.168.86.1)로 동작해
  DHCP·ARP·ICMP가 실제로 오간다. 서버·백엔드 없음, 정적 호스팅 가능.
- 부트 스냅숏(`state.bin.zst`)으로 수 초 만에 셸이 뜬다. 진도는 localStorage에 저장.

## 문제 구성 (8 카테고리 · 30문제)

파일과 디렉터리 / 권한 관리 / 텍스트 처리와 파이프(awk 포함) / 파일 검색(find·ripgrep) /
프로세스 관리 / 압축과 아카이브 / 시스템과 디스크(df·du) / **네트워크**(ip·route·ping·netstat·
iptables·tcpdump·nmcli·nc)

네트워크 카테고리에는 두 가지 특수 문제 형태가 있다:

- **듀얼 터미널** (`terminals: 2`, net-05): 같은 VM의 ttyS0/ttyS1 두 셸이 상하로 표시된다.
  터미널 ②에 tcpdump 를 켜 두고 터미널 ①에서 ping 을 치며 패킷을 실시간 관찰하는 식.
- **양단(2-VM)** (`vms: 2`, net-07/08): 두 번째 v86 인스턴스(Host B)가 첫 진입 시 부팅되어
  L2 프레임 브리지로 연결된다. A에서 ping → B에서 tcpdump 수신 증명, B의 nc 서버 ← A 클라이언트
  등 진짜 두 호스트 간 통신을 실습한다.

모든 문제는 `verify.answer`(모범답안)를 갖고 있어 `__cbt.verifyAll()` 로
"초기상태 채점=불통과 → 모범답안 실행 → 재채점=통과" 사이클을 자동 회귀할 수 있다
(dev 또는 `?debug` 빌드).

## 실행

```bash
npm install        # postinstall이 v86 wasm을 public/vm에 복사
npm run dev        # http://localhost:5173  (Windows: dev.cmd 더블클릭)
```

```bash
npm run build && npm run preview   # 프로덕션 빌드 확인
npm test                           # 시리얼 프로토콜 단위 테스트 (vitest)
```

## VM 이미지 빌드 (WSL Ubuntu-24.04 + podman)

`public/vm/alpine/`(fs.json + rootfs-flat + state.bin.zst)은 생성물이라 git에 없다.
새로 만들려면:

```bash
wsl -d Ubuntu-24.04 -u root bash -lc "apt-get install -y podman python3 python3-zstandard zstd"
wsl -d Ubuntu-24.04 -u root bash -lc "cd /mnt/c/Users/pangp/linux-cbt/image/alpine && WITH_NM=1 bash ./build.sh"
node scripts/build-state.mjs   # 부트 스냅숏 생성 (이미지 재빌드 때마다 재실행)
```

- `image/alpine/Dockerfile` 이 게스트 구성의 전부다: 패키지, agetty 자동 로그인(ttyS0, root),
  virtio_net 모듈, lo만 올리는 네트워크 초기화, `WITH_NM=1` 시 dbus/NetworkManager/eudev.
- 빌드 중 "Permission denied"가 나면 dev 서버(브라우저 탭)가 이미지 파일을 잠근 것 —
  탭을 다른 페이지로 옮기고 재시도.
- `?legacy` URL 파라미터로 구 buildroot ISO(`public/vm/linux.iso`)를 부팅할 수 있다(임시 폴백).

## 구조

```
image/alpine/          Dockerfile · build.sh · fs2json.py · copy-to-sha256.py (v86 @f3d4472 vendor)
scripts/               copy-v86-assets.mjs · build-state.mjs(스냅숏 생성기)
public/vm/             bios(커밋) · linux.iso(레거시) · alpine/(생성물, gitignore)
src/vm/                vmConfig(V86 옵션 단일 소스) · vmService(부팅·스냅숏 폴백) · serialBus(트랜잭션)
src/engine/            Problem/Check 타입 · checkCompiler(채점) · grader · session(상태머신)
src/problems/          categories · data/<카테고리>/*.ts (satisfies Problem) · network/shared.ts(NET_RESET)
src/dev/verifyAll.ts   회귀 하네스
```

### 채점 원리 (시리얼 트랜잭션)

게스트 tty는 입력을 에코하므로, 명령을 nonce 붙은 센티널 마커로 감싸 한 줄로 보낸다:

```
{ <cmd> ; } >/tmp/.__g 2>&1; __r=$?; echo "@@""B:<nonce>"; cat /tmp/.__g; rm -f /tmp/.__g; echo "@@""E:<nonce>:$__r"
```

마커를 따옴표로 쪼개 보내므로 에코에는 온전한 마커가 나타나지 않고, 출력에서만
`@@B:<nonce>`/`@@E:<nonce>:<rc>`가 조립된다. 셋업/채점 중에는 표시·입력을 잠근다.
체크 타입: `command`(rc/출력) · `file_exists` · `file_mode`(ls -ld 파싱) · `file_content`.

### 문제 작성 규칙

- `src/problems/data/<카테고리>/`에 TS 파일 추가 후 `src/problems/index.ts`에 등록.
- 경로에 작은따옴표 금지, ash(busybox) 문법, setup 각 줄은 rc 0으로 끝나야 함
  (실패를 드러내려면 `&&` 체인). `verify.answer` 필수(회귀 자동화).
- **네트워크 문제는 반드시 `...NET_RESET`으로 setup을 시작** — 네트워크 상태는 전역이라
  이전 문제의 iptables 규칙·주소·NM이 남는다. NM이 필요하면 setup에서 udev/dbus/NM을 띄운다
  (net-06 참고, `setupTimeoutMs` 상향).
- **듀얼 터미널(`terminals: 2`)**: 채점은 터미널 ②(a1)를 절대 건드리지 않으므로(prologue 없음 —
  학습자의 실시간 tcpdump 보존) 체크는 a0에서 `pgrep` 등으로 확인한다.
  `ps | grep -q 패턴`은 grep 자신이 매치되는 버그가 있으니 `pgrep -f`를 쓸 것.
- **양단(`vms: 2`)**: `setupB`가 Host B(b0)에서 실행되고, 체크는 `on: "b"`로 B를 지정한다.
  규칙 3가지 — ① setup/setupB 모두 `...NET_RESET, ...MAC_REFRESH` 필수(스냅숏 복원 시 두
  게스트의 MAC이 같아지므로 드라이버 재로드로 분리), ② B에서 채점 시점에 포그라운드
  프로세스가 남으면 안 됨(`&` 또는 `-c` 자기종료만 — 채점 prologue가 Ctrl+C를 보냄),
  ③ DHCP 금지·정적 IP만(192.168.86.x, A=.10/B=.20 관례). 첫 L2 접촉은 ARP+JIT 콜드스타트로
  수 초 걸릴 수 있으니 setupB 마지막에 예열 ping을 넣는다 (net-08 참고).
  `terminals: 2`와 `vms: 2`는 동시 사용 불가(패널 최대 2개, 테스트로 강제됨).

### 게스트 환경 메모

- 셸: busybox ash(로그인 셸) + bash 설치됨. GNU findutils/gawk, iproute2, net-tools,
  iptables(legacy), tcpdump, ripgrep 포함. tar는 z 옵션 지원.
- 채점의 `file_mode`는 stat 대신 `ls -ld` 파싱을 유지한다(이미지 독립적).
- NetworkManager 특이사항(이미지에 반영됨): 장치 관리에 eudev 필요, ACD 오탐 방지로
  `ipv4.dad-timeout=0`이 conf.d에 내장, IPv6 RA가 없어 프로필에 `ipv6.method disabled` 권장.
- 스냅숏과 이미지가 어긋나면 vmService가 콜드 부팅으로 자동 폴백한다
  (이미지 재빌드 후 `node scripts/build-state.mjs` 재실행 필수 — V86 옵션 변경 시에도 동일).
- v86 fetch 릴레이는 서브넷 내 ARP 프록시·ICMP 스푸핑·게스트 간 TCP RST를 하므로,
  양단 문제 동안 A의 릴레이는 음소거되고 B는 아예 릴레이 없이 생성된다 (src/vm/netBridge.ts).

## 라이선스/출처

- [v86](https://github.com/copy/v86) — BSD-2-Clause (에뮬레이터, BIOS, 빌드 도구 vendor).
- 게스트 rootfs — Alpine Linux 3.21 패키지들 (각 패키지 라이선스; NetworkManager GPL 포함).
  로컬 학습용 개인 사용.
- `public/vm/linux.iso` — [copy/images](https://github.com/copy/images)의 buildroot 리눅스 (레거시 폴백).
