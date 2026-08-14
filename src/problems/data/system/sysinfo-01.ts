import type { Problem } from "../../../engine/types";

export const sysinfo01 = {
  id: "sysinfo-01",
  category: "system",
  title: "Linux 서버의 OS 기본 정보 확인",
  difficulty: 1,
  tags: ["hostnamectl", "lsblk", "df -hT", "timedatectl"],
  commands: ["hostnamectl", "lsblk", "timedatectl"],
  scenario:
    "신규 Linux 서버가 운영팀에 인계되었습니다. 서버 운영을 시작하기 전에 현재 서버의 " +
    "기본 정보를 확인하고, 운영 대상 서버의 상태를 파악해야 합니다.\n" +
    "시스템 설정은 절대 변경하지 말고 조회 명령어만 사용하세요. 확인한 결과는 인계 문서로 " +
    "쓸 수 있도록 /root/work/os-info.txt 한 파일에 모아 둡니다.\n\n" +
    "이 실습 서버는 Debian 12(systemd) 입니다 — Rocky·Ubuntu 와 같은 계열이라 " +
    "hostnamectl·timedatectl·lsblk 를 실무에서 쓰는 그대로 사용할 수 있습니다.",
  objectives: [
    "서버의 호스트명을 확인하세요.",
    "설치된 Linux 배포판의 종류와 버전을 확인하세요.",
    "현재 실행 중인 Kernel 버전을 확인하세요.",
    "전체 메모리와 사용 가능한 메모리를 사람이 읽기 쉬운 단위로 확인하세요.",
    "서버에 연결된 디스크·파티션 구성을 확인하세요.",
    "마운트된 파일시스템의 '종류'와 사용량을 확인하세요 (df 에 타입까지 나오는 옵션 필요).",
    "마지막 부팅 이후의 가동 시간을 확인하세요.",
    "현재 날짜·시간과 Time Zone 을 확인하세요.",
    "위 8개 항목의 결과를 모두 /root/work/os-info.txt 에 저장하세요.",
  ],
  // 조회 전용 문제라 준비할 상태가 없다 — workdir 초기화(시딩 공통)만으로 충분하다
  setup: [],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/os-info.txt",
      // hostname / hostnamectl(Static hostname:) / uname -a 어느 쪽으로 남겨도 인정
      expect: { matches: "(Static hostname:\\s*\\S+|^debuerreotype$|Linux debuerreotype)" },
      label: "호스트명이 기록됐는가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "Debian GNU/Linux 12|VERSION_ID=\"12\"" },
      label: "배포판 종류와 버전이 기록됐는가",
    },
    {
      id: "c3",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "6\\.1\\.[0-9]+-[0-9]+-686" },
      label: "Kernel 버전이 기록됐는가",
    },
    {
      id: "c4",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "Mem:\\s+\\S+" },
      label: "메모리 정보가 기록됐는가",
    },
    {
      id: "c5",
      type: "file_content",
      path: "/root/work/os-info.txt",
      // lsblk 출력(NAME MAJ:MIN … / sda 행) 또는 /proc/partitions 로 남겨도 인정
      expect: { matches: "MAJ:MIN|major\\s+minor|^sda\\s" },
      label: "디스크·파티션 구성이 기록됐는가",
    },
    {
      id: "c6",
      type: "file_content",
      path: "/root/work/os-info.txt",
      // df -hT 의 헤더에만 Type 컬럼이 있다 — 종류까지 확인했는지 구분된다
      expect: { matches: "Filesystem\\s+Type" },
      label: "파일시스템 '종류'와 사용량이 기록됐는가",
    },
    {
      id: "c7",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { includes: "load average" },
      label: "가동 시간이 기록됐는가",
    },
    {
      id: "c8",
      type: "file_content",
      path: "/root/work/os-info.txt",
      // timedatectl 의 Time zone 행, 또는 date 출력의 TZ 표기
      expect: { matches: "Time zone:|Local time:|(UTC|KST|[+-][0-9]{4}).*[0-9]{4}" },
      label: "날짜·시간과 Time Zone 이 기록됐는가",
    },
  ],
  hints: [
    "한 항목씩 명령을 실행해 화면으로 먼저 확인한 뒤, 같은 명령들을 { 명령1; 명령2; } > /root/work/os-info.txt 처럼 묶어 파일로 남기면 편합니다.",
    "호스트명은 hostnamectl, 배포판은 cat /etc/os-release, 커널은 uname -r, 메모리는 free -h 입니다.",
    "디스크는 lsblk, 파일시스템은 종류까지 필요하므로 df -h 가 아니라 df -hT, 가동 시간은 uptime, 시간·타임존은 timedatectl 입니다.",
  ],
  explanation:
    "정답 예시 (한 번에 모으기):\n" +
    "{ echo \"== hostname ==\"; hostnamectl; \\\n" +
    "  echo \"== os ==\"; cat /etc/os-release; \\\n" +
    "  echo \"== kernel ==\"; uname -r; \\\n" +
    "  echo \"== memory ==\"; free -h; \\\n" +
    "  echo \"== disk ==\"; lsblk; \\\n" +
    "  echo \"== filesystem ==\"; df -hT; \\\n" +
    "  echo \"== uptime ==\"; uptime; \\\n" +
    "  echo \"== datetime ==\"; timedatectl; } > /root/work/os-info.txt\n\n" +
    "확인 항목별 명령:\n" +
    "  호스트명            hostnamectl (또는 hostname)\n" +
    "  배포판·버전         cat /etc/os-release\n" +
    "  Kernel 버전         uname -r\n" +
    "  메모리              free -h\n" +
    "  디스크·파티션       lsblk\n" +
    "  파일시스템 사용량   df -hT\n" +
    "  가동 시간           uptime\n" +
    "  날짜·시간·TZ        timedatectl\n\n" +
    "hostnamectl 은 단순 조회가 아니라 systemd 의 hostnamed 데몬에 D-Bus 로 물어보는 " +
    "명령이라 호스트명뿐 아니라 Machine ID·가상화 여부·OS·커널까지 한 번에 보여 줍니다. " +
    "timedatectl 도 마찬가지로 시간·타임존과 함께 NTP 동기화 상태를 알려 줍니다 — " +
    "시간이 틀어진 서버는 로그 상관분석과 인증서·토큰 검증이 함께 깨지므로 초동 점검 " +
    "항목입니다. uname -a 하나로 커널·아키텍처·호스트명을 한 번에 훑을 수도 있습니다.\n\n" +
    "이런 기준정보 수집이 운영의 첫 단계인 이유는, 변경 작업 전후를 비교할 근거가 되고 " +
    "장애 인계 시 '어떤 서버였는지'를 다시 확인할 수 있기 때문입니다. 조회 명령만 쓰는 " +
    "것도 원칙입니다 — 인수인계 단계에서 설정을 바꾸면 원래 상태를 되돌릴 수 없습니다.",
  verify: {
    answer: [
      "{ echo hostname; hostnamectl; echo os; cat /etc/os-release; echo kernel; uname -r; echo memory; free -h; echo disk; lsblk; echo filesystem; df -hT; echo uptime; uptime; echo datetime; timedatectl; } > /root/work/os-info.txt",
    ],
  },
} satisfies Problem;
