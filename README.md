# 리눅스 실습 CBT

**▶ 바로 사용하기: https://bbg-96.github.io/linux-cbt/** (설치 불필요, 브라우저만 있으면 됨)

모바일 지원: 폰에서는 사이드바가 드로어로, 풀이 화면은 문제↔터미널 전환형으로 동작하고,
세션이 여럿이면 탭으로 전환한다. 터미널 위 키 툴바(Tab·Ctrl+C·Ctrl+D·Esc·화살표)로
소프트 키보드에 없는 키를 입력한다.
단, 2-VM 양단 문제는 메모리 구성이 커서(1GB) 저사양 폰에서는 실패할 수 있다.

## 터미널 워크스페이스 (mRemoteNG/MobaXterm 스타일)

- 풀이·연습 화면 왼쪽에 **서버 목록 레일**이 있다. 서버 이름과 상태 표시등만 보이고,
  행 클릭 = 접속, ⋯ 메뉴 = 기본 세션 열기 / ⧉ 세션 복제 / ⟳ 서버 재시작.
- **팬(화면) 분할 선택**: 상단에서 터미널 화면을 1·2·4개로 고른다. 각 세션은 팬의
  **탭**으로 붙고, 탭을 **드래그앤드롭으로 다른 팬에 옮길 수 있다** (예: web①·web②를
  한 화면에, was①·was②를 다른 화면에). 새 세션은 탭이 가장 적은 팬에 열린다.
- **⧉ 세션 복제**: 서버당 셸을 최대 2개 열 수 있다 (게스트의 ttyS0/ttyS1). ping을
  보내면서 tcpdump로 관찰하는 식의 두-창 작업을 어느 문제에서든 할 수 있다.
  복제 세션의 탭 ×는 **실제 종료**다 — 셸에 Ctrl+C·exit가 전달되고(inittab respawn),
  다시 복제하면 새 셸이 준비된다. 기본 세션(채점 채널)의 ×는 화면에서만 닫는다.
- 터미널은 실제 콘솔처럼: 안내 배너 없이 프롬프트만, Windows Terminal 'Campbell'
  팔레트, 컬러 프롬프트 `root@host:~#` (busybox ash의 `\[ \] \e` PS1 이스케이프
  지원을 실VM으로 검증해 적용).
- 채점·시딩은 복제 세션(a1/b1)에 아무 것도 보내지 않고 **입력만 잠깐 잠근다** —
  학습자가 켜 둔 실시간 관찰 프로세스를 보존하기 위해서다.

브라우저에서 **진짜 리눅스**가 부팅되는 실기 학습 사이트.
시나리오를 읽고 가상 터미널에서 직접 명령어로 해결하면 자동으로 채점된다.

- 터미널은 시뮬레이터가 아니다 — [v86](https://github.com/copy/v86) (x86→WebAssembly 에뮬레이터)이
  브라우저 안에서 진짜 리눅스를 부팅한다. 사이트별로 게스트가 다르다:
  **운영 = Alpine 3.21**(9p 루트, OpenRC), **스테이징 = Debian 12**(ext4 디스크, systemd).
- 가상 네트워크 내장: v86의 fetch 릴레이가 클라이언트 안에서 가상 라우터(192.168.86.1)로 동작해
  DHCP·ARP·ICMP가 실제로 오간다. 서버·백엔드 없음, 정적 호스팅 가능.
- 부트 스냅숏(`state.bin.zst`)으로 수 초 만에 셸이 뜬다. 진도는 localStorage에 저장.

## 문제 구성 (8 카테고리 · 30문제)

파일과 디렉터리 / 권한 관리 / 텍스트 처리와 파이프(awk 포함) / 파일 검색(find·ripgrep) /
프로세스 관리 / 압축과 아카이브 / 시스템과 디스크(df·du) / **네트워크**(ip·route·ping·netstat·
iptables·tcpdump·nmcli·nc)

이 30문제는 운영 사이트(`src/problems/all.ts`)에만 실린다. 스테이징 사이트는 선별용이라
기본값이 빈 목록이다(`src/problems/staging.ts`) — 문제가 없는 카테고리는 대시보드와
사이드바에서 자동으로 숨겨진다.

네트워크 카테고리에는 두 가지 특수 문제 형태가 있다:

- **듀얼 터미널** (`terminals: 2`, net-05): 세션 복제로 같은 VM의 두 번째 셸(ttyS1)을
  열어 푼다. 세션 ②에 tcpdump 를 켜 두고 세션 ①에서 ping 을 치며 패킷을 실시간
  관찰하는 식. 시딩이 세션 ②의 셸을 미리 준비해 두므로 복제 즉시 열린다.
- **양단(2-VM)** (`vms: 2`, net-07/08): 두 번째 v86 인스턴스(Host B)가 첫 진입 시 부팅되어
  L2 프레임 브리지로 연결된다. A에서 ping → B에서 tcpdump 수신 증명, B의 nc 서버 ← A 클라이언트
  등 진짜 두 호스트 간 통신을 실습한다. host-a/host-b 각각 세션 복제가 가능하다.

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

## 배포 (GitHub Pages) — 사이트 2개

정적 사이트라 파일만 올리면 되고, **사용자는 브라우저만 있으면 된다** (WSL·Docker·설치 불필요).
한 코드베이스에서 **문제 목록만 바꿔** 두 사이트에 배포한다 — 엔진·UI 개선은 양쪽에 자동 반영된다.

| 사이트 | 주소 | 문제 세트 | 배포 |
|---|---|---|---|
| 운영 | https://bbg-96.github.io/linux-cbt/ | `src/problems/all.ts` (전체 30문제) | `npm run build && npm run deploy` |
| 스테이징 | https://bbg-96.github.io/linux-cbt-staging/ | `src/problems/staging.ts` (선별, 현재 0개) | `npm run build:staging && npm run deploy:staging` |

- 스테이징에 문제를 넣으려면 `src/problems/staging.ts`의 배열에 추가한다. 기존 문제를
  import해 담아도 되고(`import { perm01 } from "./data/permissions/perm-01"`), 새로 만든
  문제 모듈을 넣어도 된다. 배열 순서가 곧 커리큘럼 순서다.
- 빌드 산출물이 섞이지 않도록 스테이징은 `dist-staging`으로 뽑고, 각각 다른 저장소의
  `gh-pages` 브랜치로 force push 한다(`scripts/deploy.mjs`의 타깃 표 참조).
- 테스트는 빌드 모드와 무관하게 항상 전체 카탈로그(`ALL_PROBLEMS`)를 검증한다.

- 이미지 산출물(`public/vm/alpine/`, 약 70MB)은 **main에 커밋하지 않는다.** `gh-pages`
  브랜치에만 담기므로 소스 히스토리가 바이너리로 부풀지 않는다. 산출물을 새로 만들려면
  위의 "VM 이미지 빌드" 절차를 따른다.
- `base: './'` + HashRouter라 `https://<계정>.github.io/linux-cbt/` 같은 하위 경로에서
  그대로 동작한다 (하위 경로 서빙으로 검증 완료).
- `public/.nojekyll`이 있어야 Jekyll이 1700여 개 파일을 건드리지 않는다.
- 이미지를 재빌드했다면 **반드시 `node scripts/build-state.mjs`로 스냅숏을 다시 만들고**
  배포한다. 어긋나면 스냅숏 복원이 실패해 콜드 부팅으로 폴백한다(동작은 하되 느려짐).
- `fs.json`·`state.bin.zst`는 이름이 고정이라 브라우저 캐시(max-age=600)에 남는데,
  스냅숏은 그 파일시스템의 9p inode 배치까지 담고 있어 **둘이 다른 빌드면 게스트가
  조용히 깨진다**(실제로 재배포 직후 modprobe에서 커널 oops로 관측됨). 그래서 두 URL에
  매니페스트의 `?v=<fs.json 해시>`를 붙여 짝을 고정한다(`src/vm/vmConfig.ts`).
- 첫 방문 시 약 25~30MB를 내려받고(스냅숏+커널+실제 접근 파일), 이후는 캐시된다.
  GitHub Pages 대역폭 소프트 한도는 월 100GB.

## 게스트 이미지 프로필 (alpine / debian)

사이트마다 다른 게스트를 쓴다. 프로필은 빌드 모드로 정해진다
(`.env.staging` 의 `VITE_IMAGE_PROFILE=debian`, 운영은 값이 없어 alpine).

| | 운영 (alpine) | 스테이징 (debian) |
|---|---|---|
| 배포판 | Alpine 3.21 (busybox·OpenRC) | Debian 12 bookworm (systemd 252) |
| 커널 | 6.12-virt | 6.1.0-686 (**비-PAE** — v86 검증 경로) |
| 루트 | 9p (fs.json + 내용해시 파일) | ext4 통짜 디스크, 1MiB 청크 + zstd |
| 스냅숏 | 21MB | 42MB |
| 배포 용량 | 80MB | 198MB |

Debian 프로필을 둔 이유는 `hostnamectl`·`timedatectl` 이 systemd 데몬에 D-Bus 로
질의하는 클라이언트라 musl 기반 Alpine 에는 존재할 수 없기 때문이다(`lsblk` 는
util-linux 라 Alpine 에도 넣을 수 있지만 같은 트랙으로 묶었다).

루트를 9p 가 아니라 **블록 디바이스**로 만든 것도 의도적이다 — 배포 환경에서 9p 커널
경로(`p9_fcall_init→__kmalloc`)가 무너지는 문제를 겪었는데, ext4 디스크는 그 코드를
아예 타지 않는다. v86 의 `use_parts` 로 **접근한 1MiB 청크만** 내려받으므로 디스크가
544MB 여도 첫 로딩은 스냅숏(42MB) 중심이다.

주의: 청크 파일명은 v86 이 URL 에서 유도한다 — `.../<partsDir>/rootfs.ext4.zst` 를 주면
`rootfs-<start>-<end>.ext4.zst` 를 찾는다. 이름이 어긋나면 404 만 나므로
`image/debian/build.sh` 의 명명 규칙을 바꾸지 말 것. 이 URL 에는 `?v=` 를 붙이면
안 되므로(파트 URL 이 깨진다), 캐시 짝 문제는 **파트 디렉터리 이름을 빌드마다 바꿔서**
막는다 — `manifest.partsDir` 가 그 이름의 단일 진실이다.

또한 hostnamed·timedated 는 유휴 30초에 자동 종료되는 버스 활성화 데몬이라, 에뮬레이터
에서는 호출마다 데몬 재기동으로 2초 이상 걸린다(실측 2.2s → 상주 시 0.2s). 이미지의
`ctl-keepalive` 유닛이 25초 주기 busctl 질의로 상주시키고, 스냅숏 생성 시 도구들을 한 번
실행(예열)해 첫 호출의 디스크 청크 페치도 없앤다.

### 게스트 네트워크로 할 수 있는 것과 없는 것 (실측)

v86 의 fetch 릴레이는 가상 라우터(192.168.86.1)로 동작하지만 만능이 아니다:

| 되는 것 | 안 되는 것 |
|---|---|
| ARP·DHCP·**모든 주소의 ICMP 응답**(ping 은 어디든 성공) | **DNS 질의 응답 없음** — `getent`/`dig` 가 그냥 타임아웃 |
| TCP 핸드셰이크(`/dev/tcp` 연결 성립) | 외부 HTTP 왕복 — 페이지 origin 에서 나가는 fetch 라 CORS 로 막힌다 |
| 게스트 내부(127.0.0.1)·게스트 간(2-VM) 통신 전부 | traceroute 의 다중 홉 (릴레이가 전부 응답해 홉이 1개) |

그래서 이름 해석·HTTP 문제는 **게스트 안에 서버를 띄워** 만든다 — `netinfo-01` 의 setup 이
`dnsmasq`(사설 DNS, 플래그로 직접 실행: Debian 기본 conf 는 conf-dir 을 읽지 않는다)와
`nginx` 를 띄우고, `/dev/tcp` 로 연결 하나를 붙잡아 `ss -antp` 에 ESTABLISHED 가 보이게 한다.
부팅 직후 상태는 **eth0 DOWN·주소 없음·리스닝 포트 0개**이므로, 네트워크 문제는 setup 에서
필요한 상태를 직접 구성해야 한다.

```bash
wsl -d Ubuntu-24.04 -u root bash -lc "cd /mnt/c/Users/pangp/linux-cbt/image/debian && bash ./build.sh"
node scripts/build-state-debian.mjs   # 부트 스냅숏 (이미지 재빌드 때마다 재실행)
```

`build-state-debian.mjs` 는 Node 에서 zstd 파트를 못 푸는 문제(v86 의 zstd 해제가
브라우저 Worker 를 쓴다) 때문에 `.cache/debian-parts-raw` 에 비압축 파트를 한 번
만들어 쓴다. 버퍼 타입·크기가 같아 스냅숏은 브라우저와 호환된다 — 다만 **통짜
`buffer` 로 부팅하면 안 된다**(스냅숏에 디스크 544MB 가 통째로 들어가 697MB 가 된다).

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
- **패키지를 늘릴 때는 반드시 배포본에서 검증한다.** nginx·rpm·coreutils·procps 등을 넣어
  rootfs를 1,728→4,925파일(51→78MB)로 키웠더니, 로컬 dev에서는 전 문제가 통과했는데
  GitHub Pages에서는 게스트 커널이 `p9_fcall_init→__kmalloc_noprof` NULL 역참조 oops를
  연발하며 부팅 직후부터 망가졌다(9p over HTTP 부하가 방아쇠). 전송 무결성·스냅숏 짝은
  모두 정상이었다. 판정은 배포본에서 `dmesg | grep -c 'Oops:'` 가 0인지로 한다 —
  dev 통과는 증거가 되지 않는다.
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
- **듀얼 터미널(`terminals: 2`)**: 채점은 복제 세션(a1/b1)을 절대 건드리지 않으므로
  (prologue 없음, 입력만 잠금 — 학습자의 실시간 tcpdump 보존) 체크는 a0에서 `pgrep`
  등으로 확인한다. `ps | grep -q 패턴`은 grep 자신이 매치되는 버그가 있으니 `pgrep -f`를 쓸 것.
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
