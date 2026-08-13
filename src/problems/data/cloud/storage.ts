import type { Problem } from "../../../engine/types";

export const STORAGE_PROBLEMS = [
  {
    id: "storage-01",
    category: "storage",
    title: "가득 찬 파일시스템의 원인 디렉터리 찾기",
    difficulty: 1,
    tags: ["df -hT", "du -xhd1", "sort -h"],
    commands: ["df", "du", "sort"],
    scenario:
      "/srv/app 파일시스템 사용량 경고가 발생했습니다. 전체 파일시스템을 확인한 뒤 같은 파일시스템 안에서 어떤 하위 디렉터리가 가장 큰지 조사해 보고서로 남기세요.",
    objectives: ["df -hT로 파일시스템 현황을 확인하세요.", "du -xhd1 /srv/app 결과를 크기순으로 정렬해 /root/work/du-report.txt에 저장하세요."],
    setup: [
      "rm -rf /srv/app && mkdir -p /srv/app/logs /srv/app/cache /srv/app/data",
      "dd if=/dev/zero of=/srv/app/logs/access.log bs=1M count=6 2>/dev/null",
      "dd if=/dev/zero of=/srv/app/cache/cache.bin bs=1M count=2 2>/dev/null",
      "dd if=/dev/zero of=/srv/app/data/index.bin bs=1M count=1 2>/dev/null",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/du-report.txt", expect: { includes: "/srv/app/logs" }, label: "logs 디렉터리 용량이 기록됐는가" },
      { id: "c2", type: "command", cmd: "test $(grep -n '/srv/app/logs$' /root/work/du-report.txt | cut -d: -f1) -gt $(grep -n '/srv/app/cache$' /root/work/du-report.txt | cut -d: -f1)", label: "작은 디렉터리부터 큰 디렉터리 순으로 정렬됐는가" },
    ],
    hints: ["df는 파일시스템, du는 디렉터리별 사용량을 보여 줍니다.", "du -xhd1 /srv/app | sort -h"],
    explanation:
      "정답: du -xhd1 /srv/app | sort -h > /root/work/du-report.txt\n\n" +
      "실무 순서는 df로 포화된 마운트를 찾고 du로 그 내부를 좁히는 것입니다. -x는 다른 마운트로 넘어가지 않아 조사 범위를 지킵니다.",
    verify: { answer: ["du -xhd1 /srv/app | sort -h > /root/work/du-report.txt"] },
  },
  {
    id: "storage-02",
    category: "storage",
    title: "보존기간이 지난 로그만 정리",
    difficulty: 2,
    tags: ["find -mtime", "-delete", "범위 제한"],
    commands: ["find"],
    scenario:
      "애플리케이션 로그 보존기간은 7일입니다. /var/log/order-api 아래의 .log 파일 중 7일보다 오래된 파일만 삭제하고 최신 로그와 .keep 파일은 보존하세요.",
    objectives: ["삭제 전에 find로 대상 목록을 확인하세요.", "7일보다 오래된 *.log만 삭제하세요.", "current.log와 .keep은 남기세요."],
    setup: [
      "rm -rf /var/log/order-api && mkdir -p /var/log/order-api",
      "echo old > /var/log/order-api/order-20200101.log",
      "echo old > /var/log/order-api/error-20200101.log",
      "echo current > /var/log/order-api/current.log",
      "echo keep > /var/log/order-api/.keep",
      "touch -t 202001010000 /var/log/order-api/*20200101.log",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "! test -e /var/log/order-api/order-20200101.log", label: "오래된 주문 로그가 삭제됐는가" },
      { id: "c2", type: "command", cmd: "! test -e /var/log/order-api/error-20200101.log", label: "오래된 오류 로그가 삭제됐는가" },
      { id: "c3", type: "file_exists", path: "/var/log/order-api/current.log", label: "최신 로그를 보존했는가" },
      { id: "c4", type: "file_exists", path: "/var/log/order-api/.keep", label: "비로그 파일을 보존했는가" },
    ],
    hints: ["먼저 -print로 확인: find /var/log/order-api -type f -name '*.log' -mtime +7 -print", "확인한 같은 조건의 끝을 -delete로 바꾸세요."],
    explanation:
      "정답:\nfind /var/log/order-api -type f -name '*.log' -mtime +7 -print\nfind /var/log/order-api -type f -name '*.log' -mtime +7 -delete\n\n" +
      "삭제 명령은 경로·파일형식·이름·기간을 모두 제한하고, 먼저 -print로 대상을 검토합니다. 운영에서는 백업·스냅샷 정책도 함께 확인해야 실제 공간이 회수됩니다.",
    verify: { answer: ["find /var/log/order-api -type f -name '*.log' -mtime +7 -delete"] },
  },
  {
    id: "storage-03",
    category: "storage",
    title: "용량은 남았는데 파일 생성이 안 되는 inode 장애",
    difficulty: 2,
    tags: ["df -i", "find -size 0", "inode"],
    commands: ["df", "find"],
    scenario:
      "/mnt/cache는 바이트 용량이 남았는데 파일 생성 오류가 발생합니다. 작은 빈 캐시 파일이 과도하게 쌓였습니다. inode 사용량을 확인하고 빈 캐시 파일만 정리하세요.",
    objectives: ["df -i /mnt/cache로 inode 현황을 확인하세요.", "/mnt/cache/tmp 아래의 0바이트 파일만 삭제하세요.", "내용이 있는 keep.db는 보존하세요."],
    setup: [
      "umount /mnt/cache 2>/dev/null; true",
      "mkdir -p /mnt/cache && mount -t tmpfs -o size=16m tmpfs /mnt/cache",
      "mkdir -p /mnt/cache/tmp /mnt/cache/data",
      "i=1; while test $i -le 500; do : > /mnt/cache/tmp/cache-$i; i=$((i+1)); done",
      "echo important > /mnt/cache/data/keep.db",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "test $(find /mnt/cache/tmp -type f -size 0 | wc -l) -eq 0", label: "빈 캐시 파일이 정리됐는가" },
      { id: "c2", type: "file_content", path: "/mnt/cache/data/keep.db", expect: { includes: "important" }, label: "데이터 파일을 보존했는가" },
    ],
    hints: ["df -h는 바이트, df -i는 inode를 봅니다.", "find /mnt/cache/tmp -type f -size 0 -delete"],
    explanation:
      "정답:\ndf -i /mnt/cache\nfind /mnt/cache/tmp -type f -size 0 -delete\n\n" +
      "inode가 고갈되면 용량이 남아도 새 파일을 만들 수 없습니다. 파일 개수가 많은 캐시·세션·메일 큐 디렉터리를 우선 확인합니다.",
    verify: { answer: ["find /mnt/cache/tmp -type f -size 0 -delete"] },
  },
  {
    id: "storage-04",
    category: "storage",
    title: "백업 경로가 실제 마운트인지 증명",
    difficulty: 1,
    tags: ["findmnt -T", "df -hT", "mountpoint"],
    commands: ["findmnt", "df"],
    scenario:
      "백업 경로 /mnt/backup이 단순 로컬 디렉터리인지 별도 파일시스템인지 확인해야 합니다. 경로 기준 마운트 정보와 파일시스템 용량을 한 보고서에 남기세요.",
    objectives: ["findmnt -T /mnt/backup 결과를 확인하세요.", "df -hT /mnt/backup 결과와 함께 /root/work/mount-report.txt에 저장하세요."],
    setup: ["umount /mnt/backup 2>/dev/null; true", "mkdir -p /mnt/backup", "mount -t tmpfs -o size=32m backup-tmpfs /mnt/backup"],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/mount-report.txt", expect: { includes: "/mnt/backup" }, label: "대상 마운트 경로가 기록됐는가" },
      { id: "c2", type: "file_content", path: "/root/work/mount-report.txt", expect: { includes: "tmpfs" }, label: "파일시스템 유형이 기록됐는가" },
    ],
    hints: ["{ findmnt -T /mnt/backup; df -hT /mnt/backup; } > 파일", "-T는 주어진 경로가 속한 마운트를 찾습니다."],
    explanation:
      "정답: { findmnt -T /mnt/backup; df -hT /mnt/backup; } > /root/work/mount-report.txt\n\n" +
      "NAS/NFS 마운트가 풀린 상태에서 백업을 실행하면 로컬 루트 디스크를 채울 수 있습니다. 백업 전에 mountpoint·findmnt·df를 함께 확인하는 이유입니다.",
    verify: { answer: ["{ findmnt -T /mnt/backup; df -hT /mnt/backup; } > /root/work/mount-report.txt"] },
  },
  {
    id: "storage-05",
    category: "storage",
    title: "rsync 미러와 체크섬 검증",
    difficulty: 3,
    tags: ["rsync -a --delete", "sha256sum", "diff -qr"],
    commands: ["rsync", "sha256sum", "diff"],
    scenario:
      "릴리스 디렉터리를 백업 경로에 정확히 미러링해야 합니다. 대상에는 원본에 없는 stale.bin이 남아 있습니다. rsync로 동기화한 뒤 원본 체크섬을 대상에서 검증하세요.",
    objectives: ["/srv/release/를 /srv/backup/release/에 --delete 옵션으로 미러링하세요.", "원본 파일의 SHA-256 manifest를 /root/work/release.sha256에 만드세요.", "대상에서 sha256sum -c가 통과하게 하세요."],
    setup: [
      "rm -rf /srv/release /srv/backup/release && mkdir -p /srv/release/config /srv/backup/release",
      "echo app-v2 > /srv/release/app.bin",
      "echo port=8443 > /srv/release/config/app.conf",
      "echo stale > /srv/backup/release/stale.bin",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "diff -qr /srv/release /srv/backup/release", label: "백업 대상이 원본과 정확히 일치하는가" },
      { id: "c2", type: "command", cmd: "! test -e /srv/backup/release/stale.bin", label: "대상에만 있던 오래된 파일이 제거됐는가" },
      { id: "c3", type: "command", cmd: "cd /srv/backup/release && sha256sum -c /root/work/release.sha256", label: "대상 파일 체크섬이 모두 일치하는가" },
    ],
    hints: ["디렉터리 뒤 슬래시 차이에 주의하세요: rsync -a --delete /srv/release/ /srv/backup/release/", "원본 디렉터리에서 find와 sha256sum으로 상대경로 manifest를 만드세요."],
    explanation:
      "정답 예시:\nrsync -a --delete /srv/release/ /srv/backup/release/\ncd /srv/release && find . -type f -print0 | sort -z | xargs -0 sha256sum > /root/work/release.sha256\ncd /srv/backup/release && sha256sum -c /root/work/release.sha256\n\n" +
      "복사 명령의 종료코드만으로는 누락·오염을 모두 잡지 못합니다. 파일 수·크기·체크섬 검증을 성공 판정 게이트로 사용합니다.",
    verify: { answer: ["rsync -a --delete /srv/release/ /srv/backup/release/", "cd /srv/release && find . -type f -print0 | sort -z | xargs -0 sha256sum > /root/work/release.sha256"] },
  },
] satisfies Problem[];
