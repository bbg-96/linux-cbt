import type { Problem } from "../../../engine/types";

/**
 * 채점은 셸의 명령 이력(history)으로 한다 — 조회 명령은 시스템에 흔적을 남기지
 * 않으므로, "결과를 파일로 모으라"는 인위적 요구 없이 실행 여부만 확인한다.
 *
 * 이력 채점의 규칙:
 *  - setup 이 `history -c` 로 이전 시도를 지운다 ("다시 풀기" 리셋).
 *  - 검사 패턴은 반드시 대괄호 트릭(`hostnam[e]`)을 쓴다 — 검사 명령 자체도
 *    같은 셸의 이력에 남으므로, 안 그러면 검사가 자기 자신과 매치된다.
 *  - 채점은 세션 ①(a0) 셸의 이력만 본다 (이력은 셸마다 따로다).
 */
export const sysinfo01 = {
  id: "sysinfo-01",
  category: "inspect",
  title: "Linux 서버의 OS 기본 정보 확인",
  difficulty: 1,
  tags: ["hostnamectl", "lsblk", "df -hT", "timedatectl"],
  commands: ["hostnamectl", "lsblk", "timedatectl"],
  scenario:
    "신규 Linux 서버가 운영팀에 인계되었습니다. 서버 운영을 시작하기 전에 현재 서버의 " +
    "기본 정보를 확인하고, 운영 대상 서버의 상태를 파악해야 합니다.\n" +
    "시스템 설정은 절대 변경하지 말고, 각 항목을 조회 명령어로 하나씩 확인하며 출력을 " +
    "읽어 보세요. 이 실습 서버는 Debian 12(systemd) 라 Rocky·Ubuntu 와 같은 계열입니다.\n\n" +
    "채점은 세션 ①에서 실행한 명령 이력으로 확인합니다 — 결과를 어딘가에 적어 둘 필요 " +
    "없이, 올바른 명령을 실행하고 출력을 확인하면 됩니다.",
  objectives: [
    "서버의 호스트명을 확인하세요.",
    "설치된 Linux 배포판의 종류와 버전을 확인하세요.",
    "현재 실행 중인 Linux Kernel 버전을 확인하세요.",
    "전체 메모리와 현재 사용 가능한 메모리를 확인하세요.",
    "서버에 연결된 디스크 및 파티션 구성을 확인하세요.",
    "마운트된 파일시스템의 종류와 사용량을 확인하세요.",
    "서버가 마지막으로 부팅된 이후의 가동 시간을 확인하세요.",
    "현재 시스템의 날짜, 시간 및 Time Zone 을 확인하세요.",
  ],
  // 이전 시도의 이력을 지워 채점 기준점을 만든다
  setup: ["history -c"],
  checks: [
    {
      id: "c1",
      type: "command",
      cmd: "history | grep -qE 'hostnam[e]'",
      label: "호스트명을 조회했는가 (hostnamectl 또는 hostname)",
    },
    {
      id: "c2",
      type: "command",
      cmd: "history | grep -qE 'os-releas[e]'",
      label: "배포판 정보를 조회했는가 (cat /etc/os-release)",
    },
    {
      id: "c3",
      type: "command",
      cmd: "history | grep -qE 'unam[e]'",
      label: "커널 버전을 조회했는가 (uname -r)",
    },
    {
      id: "c4",
      type: "command",
      cmd: "history | grep -qE '(^|[ ;|])fre[e]'",
      label: "메모리를 조회했는가 (free -h)",
    },
    {
      id: "c5",
      type: "command",
      cmd: "history | grep -qE 'lsbl[k]'",
      label: "디스크·파티션 구성을 조회했는가 (lsblk)",
    },
    {
      id: "c6",
      type: "command",
      cmd: "history | grep -qE 'd[f] +-[a-zA-Z]*T'",
      label: "파일시스템 '종류'까지 조회했는가 (df -hT)",
    },
    {
      id: "c7",
      type: "command",
      cmd: "history | grep -qE 'uptim[e]'",
      label: "가동 시간을 조회했는가 (uptime)",
    },
    {
      id: "c8",
      type: "command",
      cmd: "history | grep -qE 'timedatec[t]l|(^|[ ;])dat[e]( |$|;)'",
      label: "날짜·시간과 Time Zone 을 조회했는가 (timedatectl)",
    },
  ],
  hints: [
    "여덟 항목을 각각 명령 하나로 확인할 수 있습니다. 실행하고 출력을 읽으면 그걸로 끝 — 채점은 실행 이력으로 확인됩니다 (세션 ①에서 실행하세요).",
    "호스트명 `hostnamectl` · 배포판 `cat /etc/os-release` · 커널 `uname -r` · 메모리 `free -h`",
    "디스크 `lsblk` · 파일시스템 종류+사용량 `df -hT` (`-T` 가 종류 컬럼) · 가동 시간 `uptime` · 시간/타임존 `timedatectl`",
  ],
  explanation:
    "정답 명령 — 하나씩 실행하며 출력을 읽습니다:\n" +
    "```\n" +
    "hostnamectl          # 호스트명 (+ Machine ID·가상화·OS·커널)\n" +
    "cat /etc/os-release  # 배포판 종류와 버전\n" +
    "uname -r             # 커널 버전\n" +
    "free -h              # 메모리 (사람이 읽기 쉬운 단위)\n" +
    "lsblk                # 디스크·파티션 트리\n" +
    "df -hT               # 파일시스템 종류(T)와 사용량\n" +
    "uptime               # 가동 시간·부하\n" +
    "timedatectl          # 날짜·시간·Time Zone·NTP 동기화\n" +
    "```\n" +
    "\n" +
    "| 확인 항목 | 명령 | 눈여겨볼 출력 |\n" +
    "| --- | --- | --- |\n" +
    "| 호스트명 | `hostnamectl` | Static hostname, Virtualization |\n" +
    "| 배포판·버전 | `cat /etc/os-release` | PRETTY_NAME, VERSION_ID |\n" +
    "| 커널 | `uname -r` | 버전-플레이버 (`uname -a` 는 한 줄 요약) |\n" +
    "| 메모리 | `free -h` | total / available (free 가 아니라 available 을 본다) |\n" +
    "| 디스크 | `lsblk` | TYPE disk/part, MOUNTPOINTS |\n" +
    "| 파일시스템 | `df -hT` | Type, Use%, Mounted on |\n" +
    "| 가동 시간 | `uptime` | up …, load average |\n" +
    "| 시간·TZ | `timedatectl` | Time zone, NTP synchronized |\n" +
    "\n" +
    "`hostnamectl` 은 단순 조회가 아니라 systemd 의 hostnamed 데몬에 D-Bus 로 물어보는 " +
    "명령이라 호스트명뿐 아니라 Machine ID·가상화 여부·OS·커널까지 한 번에 보여 줍니다. " +
    "`timedatectl` 도 시간·타임존과 함께 NTP 동기화 상태를 알려 줍니다 — 시간이 틀어진 " +
    "서버는 로그 상관분석과 인증서·토큰 검증이 함께 깨지므로 초동 점검 항목입니다.\n" +
    "\n" +
    "`free -h` 에서는 free 가 아니라 **available** 이 실제 여유입니다 — 리눅스는 남는 " +
    "메모리를 캐시로 쓰다가 필요하면 즉시 돌려줍니다. `df -hT` 의 `-T` 는 파일시스템 " +
    "종류 컬럼을 붙여 주는데, NFS 마운트나 tmpfs 를 구분해야 하는 운영 조사에서 " +
    "자주 씁니다.\n" +
    "\n" +
    "이런 기준정보 수집이 운영의 첫 단계인 이유는, 변경 작업 전후를 비교할 근거가 되고 " +
    "장애 인계 시 '어떤 서버였는지'를 다시 확인할 수 있기 때문입니다. 조회 명령만 쓰는 " +
    "것도 원칙입니다 — 인수인계 단계에서 설정을 바꾸면 원래 상태를 되돌릴 수 없습니다.",
  verify: {
    answer: [
      "hostnamectl",
      "cat /etc/os-release",
      "uname -r",
      "free -h",
      "lsblk",
      "df -hT",
      "uptime",
      "timedatectl",
    ],
  },
} satisfies Problem;
