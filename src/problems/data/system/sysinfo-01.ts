import type { Problem } from "../../../engine/types";

export const sysinfo01 = {
  id: "sysinfo-01",
  category: "system",
  title: "Linux 서버의 OS 기본 정보 확인",
  difficulty: 1,
  tags: ["uname -r", "df -hT", "free -h", "uptime"],
  commands: ["uname", "df", "free"],
  scenario:
    "신규 Linux 서버가 운영팀에 인계되었습니다. 서버 운영을 시작하기 전에 현재 서버의 " +
    "기본 정보를 확인하고, 운영 대상 서버의 상태를 파악해야 합니다.\n" +
    "시스템 설정은 절대 변경하지 말고 조회 명령어만 사용하세요. 확인한 결과는 인계 문서로 " +
    "쓸 수 있도록 /root/work/os-info.txt 한 파일에 모아 둡니다.\n\n" +
    "참고: 이 실습 서버는 Alpine Linux(OpenRC) 라서 systemd 계열인 hostnamectl·timedatectl 과 " +
    "util-linux 의 lsblk 가 없습니다. 같은 정보를 주는 기본 명령으로 대신하세요 " +
    "(해설에 Rocky·Ubuntu 대응 명령을 함께 정리해 두었습니다).\n" +
    "또한 루트 파일시스템이 9p 라서 디스크는 CD-ROM(sr0)과 loop 장치만 보입니다 — " +
    "명령을 익히는 것이 목적이므로 출력이 단출한 것은 정상입니다.",
  objectives: [
    "서버의 호스트명을 확인하세요.",
    "설치된 Linux 배포판의 종류와 버전을 확인하세요 (/etc/os-release).",
    "현재 실행 중인 Kernel 버전을 확인하세요.",
    "전체 메모리와 사용 가능한 메모리를 사람이 읽기 쉬운 단위로 확인하세요.",
    "서버에 연결된 디스크·파티션 구성을 확인하세요 (lsblk 대신 /proc/partitions).",
    "마운트된 파일시스템의 '종류'와 사용량을 확인하세요 (df 에 타입까지 나오는 옵션 필요).",
    "마지막 부팅 이후의 가동 시간을 확인하세요.",
    "현재 날짜·시간과 Time Zone 을 확인하세요 (timedatectl 대신 date).",
    "위 8개 항목의 결과를 모두 /root/work/os-info.txt 에 저장하세요.",
  ],
  // 조회 전용 문제라 준비할 상태가 없다 — workdir 초기화(시딩 공통)만으로 충분하다
  setup: [],
  checks: [
    {
      id: "c1",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "^localhost$" },
      label: "호스트명이 기록됐는가",
    },
    {
      id: "c2",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "ID=alpine|Alpine Linux" },
      label: "배포판 종류와 버전이 기록됐는가",
    },
    {
      id: "c3",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "6\\.12\\.[0-9]+-[0-9]+-virt" },
      label: "Kernel 버전이 기록됐는가",
    },
    {
      id: "c4",
      type: "file_content",
      path: "/root/work/os-info.txt",
      expect: { matches: "Mem:.*[0-9]" },
      label: "메모리 정보가 기록됐는가",
    },
    {
      id: "c5",
      type: "file_content",
      path: "/root/work/os-info.txt",
      // /proc/partitions(major minor / sr0) 또는 /sys/block 목록(loop0…) 어느 쪽이든 인정.
      // fdisk -l·blkid 는 이 게스트에서 아무것도 출력하지 않아 대안이 될 수 없다(실측).
      expect: { matches: "major\\s+minor|sr0|loop0" },
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
      expect: { matches: "(UTC|KST|[+-][0-9]{4}).*[0-9]{4}" },
      label: "날짜·시간과 Time Zone 이 기록됐는가",
    },
  ],
  hints: [
    "한 항목씩 명령을 실행해 화면으로 먼저 확인한 뒤, 같은 명령들을 { 명령1; 명령2; } > /root/work/os-info.txt 처럼 묶어 파일로 남기면 편합니다.",
    "배포판은 cat /etc/os-release, 커널은 uname -r, 메모리는 free -h, 가동 시간은 uptime 입니다.",
    "파일시스템은 '종류'까지 필요하므로 df -h 가 아니라 df -hT 를 씁니다. 디스크 구성은 lsblk 가 없으니 cat /proc/partitions 로 봅니다 (이 VM은 루트가 9p 라 실제 디스크는 CD-ROM sr0 과 loop 장치뿐입니다).",
  ],
  explanation:
    "정답 예시 (한 번에 모으기):\n" +
    "{ echo \"== hostname ==\"; hostname; \\\n" +
    "  echo \"== os ==\"; cat /etc/os-release; \\\n" +
    "  echo \"== kernel ==\"; uname -r; \\\n" +
    "  echo \"== memory ==\"; free -h; \\\n" +
    "  echo \"== disk ==\"; cat /proc/partitions; \\\n" +
    "  echo \"== filesystem ==\"; df -hT; \\\n" +
    "  echo \"== uptime ==\"; uptime; \\\n" +
    "  echo \"== datetime ==\"; date; } > /root/work/os-info.txt\n\n" +
    "확인 항목별 명령 (실무 표준 / 이 실습 서버):\n" +
    "  호스트명            hostnamectl        → hostname\n" +
    "  배포판·버전         cat /etc/os-release (동일)\n" +
    "  Kernel 버전         uname -r           (동일)\n" +
    "  메모리              free -h            (동일)\n" +
    "  디스크·파티션       lsblk              → cat /proc/partitions (또는 ls /sys/block)\n" +
    "  파일시스템 사용량   df -hT             (동일)\n" +
    "  가동 시간           uptime             (동일)\n" +
    "  날짜·시간·TZ        timedatectl        → date (TZ는 date +%Z)\n\n" +
    "hostnamectl·timedatectl 은 systemd 도구라 systemd 를 쓰는 Rocky·Ubuntu 에서는 그대로 " +
    "사용할 수 있고, lsblk 는 util-linux 패키지에 들어 있습니다. 어느 배포판이든 " +
    "uname -a 하나로 커널·아키텍처·호스트명을 한 번에 훑을 수 있습니다.\n\n" +
    "이런 기준정보 수집이 운영의 첫 단계인 이유는, 변경 작업 전후를 비교할 근거가 되고 " +
    "장애 인계 시 '어떤 서버였는지'를 다시 확인할 수 있기 때문입니다. 조회 명령만 쓰는 " +
    "것도 원칙입니다 — 인수인계 단계에서 설정을 바꾸면 원래 상태를 되돌릴 수 없습니다.",
  verify: {
    answer: [
      "{ echo hostname; hostname; echo os; cat /etc/os-release; echo kernel; uname -r; echo memory; free -h; echo disk; cat /proc/partitions; echo filesystem; df -hT; echo uptime; uptime; echo datetime; date; } > /root/work/os-info.txt",
    ],
  },
} satisfies Problem;
