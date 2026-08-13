# 리눅스 실습 CBT

브라우저에서 **진짜 리눅스**가 부팅되는 실기 학습 사이트.
시나리오를 읽고 가상 터미널에서 직접 명령어로 해결하면 자동으로 채점된다.

- 터미널은 시뮬레이터가 아니다 — [v86](https://github.com/copy/v86) (x86→WebAssembly 에뮬레이터)이
  브라우저 안에서 실제 리눅스 커널(buildroot/busybox, `linux.iso`)을 부팅한다.
- 서버·백엔드 없음. 정적 사이트라 GitHub Pages 등에 그대로 배포 가능.
- 진도/오답 상태는 localStorage에 저장된다.

## 실행

```bash
npm install        # postinstall이 v86 wasm을 public/vm에 복사
npm run dev        # http://localhost:5173
```

Windows에서 더블클릭 실행: `dev.cmd`

```bash
npm run build      # 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 로컬 확인
npm test           # 시리얼 프로토콜 단위 테스트 (vitest)
```

## 구조

```
public/vm/          linux.iso(커밋됨), BIOS(커밋됨), v86.wasm(설치 시 복사)
src/vm/             vmService(V86 생명주기) · serialBus(라인 파서, 트랜잭션) · serialProtocol(순수 로직)
src/terminal/       xterm.js 싱글턴 서비스 + 패널
src/engine/         Problem/Check 타입 · checkCompiler(채점) · grader · session(상태머신)
src/problems/       카테고리 · 문제 데이터 (TS 모듈, satisfies Problem)
src/store/          진도 저장 (localStorage, 버전드)
src/pages/          문제 목록 · 풀이 화면 · 자유 터미널(#/terminal)
```

### 채점 원리 (시리얼 트랜잭션)

게스트 tty는 입력을 에코하므로, 명령을 센티널 마커로 감싸 한 줄로 보낸다:

```
{ <cmd> ; } >/tmp/.__g 2>&1; __r=$?; echo "@@""B:<nonce>"; cat /tmp/.__g; rm -f /tmp/.__g; echo "@@""E:<nonce>:$__r"
```

- 마커 문자열을 따옴표로 쪼개 전송하므로 에코에는 온전한 마커가 나타나지 않는다.
- 트랜잭션마다 랜덤 nonce → 사용자 출력과의 충돌 불가.
- 마커 사이 출력을 캡처해 `{ rc, output }` 으로 판정한다. 셋업/채점 중에는 표시·입력을 잠근다.

### 문제 추가 방법

`src/problems/data/<category>/` 에 TS 파일을 만들고 `src/problems/index.ts` 에 등록한다.
체크 타입: `command`(rc/출력) · `file_exists` · `file_mode`(ls -ld 파싱) · `file_content`.
작성 규칙: 경로에 작은따옴표 금지, busybox(ash)에서 동작하는 명령만, setup 실패는 `&& 체인`으로 드러내기.

### 게스트 환경 주의

이미지는 2014년 buildroot(busybox 1.21, 커널 2.6.34 i686)라 일부 최신 옵션이 없다:

- `stat` 없음 → 채점은 `ls -ld` 파싱 사용
- `tar` 에 z 옵션 없음 → `tar cf` + `gzip`, 해제는 `zcat x.tar.gz | tar x -C dir`
- bash 없음 (ash), GNU 롱옵션 대부분 없음

## 라이선스/출처

- [v86](https://github.com/copy/v86) — BSD-2-Clause. BIOS(SeaBIOS/vgabios)는 v86 저장소에서 가져옴.
- `public/vm/linux.iso` — [copy/images](https://github.com/copy/images)의 buildroot 리눅스 (GPL 구성요소 포함, 개인 학습용 로컬 사용).

## 로드맵 (Phase 4)

- WSL에서 Alpine 9p 커스텀 이미지 빌드 + `save_state` 스냅샷 → 즉시 부팅
- `emulator.read_file()` 기반 9p 채점 백엔드 (문제 데이터 무변경 교체)
- bash·GNU coreutils 환경에서 사용자 관리/스크립트/cron 문제군 추가
