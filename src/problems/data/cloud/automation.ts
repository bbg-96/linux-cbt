import type { Problem } from "../../../engine/types";

export const AUTOMATION_PROBLEMS = [
  {
    id: "automation-01",
    category: "automation",
    title: "백업 cron 주기 교정",
    difficulty: 1,
    tags: ["crontab -l", "03:00", "매일"],
    commands: ["crontab", "sed"],
    scenario:
      "백업은 매일 03:00에 실행돼야 하지만 현재 root crontab에는 일요일에만 실행되도록 등록돼 있습니다. 다른 cron 항목을 훼손하지 않고 주기만 교정하세요.",
    objectives: ["crontab -l로 현재 등록 내용을 확인하세요.", "/usr/local/bin/nightly-backup 실행 주기를 매일 03:00으로 변경하세요.", "기존 health-report 항목은 유지하세요."],
    setup: [
      "printf '#!/bin/sh\necho backup\n' > /usr/local/bin/nightly-backup",
      "chmod 755 /usr/local/bin/nightly-backup",
      "printf '0 3 * * 0 /usr/local/bin/nightly-backup\n*/5 * * * * /usr/local/bin/health-report\n' | crontab -",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "crontab -l | grep -Eq '^0[[:space:]]+3[[:space:]]+\\*[[:space:]]+\\*[[:space:]]+\\*[[:space:]]+/usr/local/bin/nightly-backup$'", label: "백업이 매일 03:00으로 등록됐는가" },
      { id: "c2", type: "command", cmd: "crontab -l | grep -q '/usr/local/bin/health-report'", label: "기존 health-report 항목을 보존했는가" },
    ],
    hints: ["crontab -l > /tmp/root.cron으로 백업한 뒤 sed로 대상 줄만 바꾸세요.", "cron의 요일 *는 매일을 뜻합니다."],
    explanation:
      "정답 예시:\ncrontab -l > /tmp/root.cron\nsed -i 's#^0 3 \\* \\* 0 /usr/local/bin/nightly-backup$#0 3 * * * /usr/local/bin/nightly-backup#' /tmp/root.cron\ncrontab /tmp/root.cron\n\n" +
      "운영 cron 수정 전에는 항상 현재 목록을 백업하고 대상 한 줄만 변경합니다. 실행 사용자, 타임존, 중복 실행 방지도 함께 확인해야 합니다.",
    verify: { answer: ["crontab -l > /tmp/root.cron", "sed -i 's#^0 3 \\* \\* 0 /usr/local/bin/nightly-backup$#0 3 * * * /usr/local/bin/nightly-backup#' /tmp/root.cron", "crontab /tmp/root.cron"] },
  },
  {
    id: "automation-02",
    category: "automation",
    title: "실행 전 bash 구문 검사",
    difficulty: 1,
    tags: ["bash -n", "if then fi", "실행 전 검증"],
    commands: ["bash", "sed"],
    scenario:
      "운영 배포 스크립트가 수정됐습니다. 실제 실행 전에 bash -n으로 검사했더니 if문 구문 오류가 납니다. 데이터 변경 명령을 실행하지 말고 구문만 고치세요.",
    objectives: ["bash -n /root/work/deploy.sh로 오류를 확인하세요.", "누락된 then을 추가해 구문 검사를 통과시키세요.", "스크립트 실행 결과가 source ok를 출력하게 하세요."],
    setup: [
      "mkdir -p /srv/source",
      "printf '#!/usr/bin/env bash\nset -euo pipefail\nif test -d /srv/source\n  echo \"source ok\"\nfi\n' > /root/work/deploy.sh",
      "chmod 755 /root/work/deploy.sh",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "bash -n /root/work/deploy.sh", label: "bash 구문 검사를 통과하는가" },
      { id: "c2", type: "command", cmd: "/root/work/deploy.sh | grep -qx 'source ok'", label: "수정된 스크립트가 의도대로 동작하는가" },
    ],
    hints: ["bash -n은 명령을 실행하지 않고 문법만 검사합니다.", "if 조건 뒤에는 then이 필요합니다."],
    explanation:
      "정답:\nsed -i 's#if test -d /srv/source#if test -d /srv/source; then#' /root/work/deploy.sh\nbash -n /root/work/deploy.sh\n\n" +
      "설정·백업·배포 스크립트는 실제 변경 전에 구문 검사와 dry-run을 먼저 수행합니다. bash -n 통과는 로직 정합성까지 보장하지 않으므로 테스트 환경 검증이 이어져야 합니다.",
    verify: { answer: ["sed -i 's#if test -d /srv/source#if test -d /srv/source; then#' /root/work/deploy.sh"] },
  },
  {
    id: "automation-03",
    category: "automation",
    title: "최신 6일 백업 보존",
    difficulty: 3,
    tags: ["sort", "head -n -6", "xargs"],
    commands: ["find", "sort", "xargs"],
    scenario:
      "/srv/daily-backup에는 YYYYMMDD 형식의 일별 백업 7개가 있습니다. 가장 최근 6일만 보존하고 더 오래된 날짜 디렉터리만 정리하세요. latest 심볼릭 링크는 건드리면 안 됩니다.",
    objectives: ["삭제 전 날짜 디렉터리 목록을 정렬해 확인하세요.", "최신 6개를 제외한 오래된 날짜 디렉터리만 삭제하세요.", "20260806~20260811과 latest 링크를 보존하세요."],
    setup: [
      "rm -rf /srv/daily-backup && mkdir -p /srv/daily-backup",
      "for d in 20260805 20260806 20260807 20260808 20260809 20260810 20260811; do mkdir -p /srv/daily-backup/$d; echo $d > /srv/daily-backup/$d/manifest.txt; done",
      "ln -s 20260811 /srv/daily-backup/latest",
    ],
    checks: [
      { id: "c1", type: "command", cmd: "! test -e /srv/daily-backup/20260805", label: "가장 오래된 백업이 삭제됐는가" },
      { id: "c2", type: "command", cmd: "test $(find /srv/daily-backup -mindepth 1 -maxdepth 1 -type d -name '20[0-9][0-9][01][0-9][0-3][0-9]' | wc -l) -eq 6", label: "날짜 백업이 정확히 6개 남았는가" },
      { id: "c3", type: "command", cmd: "test -L /srv/daily-backup/latest && test $(readlink /srv/daily-backup/latest) = 20260811", label: "latest 링크를 보존했는가" },
      { id: "c4", type: "file_exists", path: "/srv/daily-backup/20260806/manifest.txt", label: "보존 대상 중 가장 오래된 백업이 남았는가" },
    ],
    hints: ["find로 날짜 디렉터리만 고른 뒤 sort합니다.", "정렬된 목록에서 tail이 아니라 head -n -6으로 최신 6개를 제외한 앞부분을 고를 수 있습니다."],
    explanation:
      "정답 예시:\nfind /srv/daily-backup -mindepth 1 -maxdepth 1 -type d -name '20??????' | sort | head -n -6\nfind /srv/daily-backup -mindepth 1 -maxdepth 1 -type d -name '20??????' | sort | head -n -6 | xargs -r rm -rf\n\n" +
      "실무에서는 백업 성공·파일 수·크기 검증 뒤에만 보존정책을 실행합니다. 현재 백업 중인 경로와 마운트 검증 실패 시에는 삭제하면 안 됩니다.",
    verify: { answer: ["find /srv/daily-backup -mindepth 1 -maxdepth 1 -type d -name '20??????' | sort | head -n -6 | xargs -r rm -rf"] },
  },
  {
    id: "automation-04",
    category: "automation",
    title: "rsync dry-run 후 검증 게이트",
    difficulty: 3,
    tags: ["rsync -ani", "--delete", "diff -qr"],
    commands: ["rsync", "diff"],
    scenario:
      "설정 배포 전에 대상에서 변경·삭제될 항목을 검토해야 합니다. 먼저 rsync dry-run 결과를 남기고 실제 동기화한 뒤, 원본과 대상이 완전히 같을 때만 VERIFIED를 기록하세요.",
    objectives: ["rsync -ani --delete 결과를 /root/work/plan.txt에 저장하세요.", "실제 rsync -a --delete를 수행하세요.", "diff -qr 통과 시 /root/work/verified.txt에 VERIFIED를 기록하세요."],
    setup: [
      "rm -rf /srv/config-source /srv/config-target && mkdir -p /srv/config-source /srv/config-target",
      "echo port=443 > /srv/config-source/app.conf",
      "echo enabled=true > /srv/config-source/feature.conf",
      "echo old > /srv/config-target/stale.conf",
    ],
    checks: [
      { id: "c1", type: "file_content", path: "/root/work/plan.txt", expect: { includes: "app.conf" }, label: "dry-run 계획에 신규 파일이 기록됐는가" },
      // rsync는 "*deleting   stale.conf"처럼 공백 폭이 버전에 따라 달라 정규식으로 본다
      { id: "c2", type: "file_content", path: "/root/work/plan.txt", expect: { matches: "deleting\\s+stale\\.conf" }, label: "삭제 예정 파일이 기록됐는가" },
      { id: "c3", type: "command", cmd: "diff -qr /srv/config-source /srv/config-target", label: "원본과 대상이 완전히 일치하는가" },
      { id: "c4", type: "file_content", path: "/root/work/verified.txt", expect: { equals: "VERIFIED" }, label: "검증 성공 후에만 완료 표식을 남겼는가" },
    ],
    hints: ["rsync -ani --delete 원본/ 대상/ 에서 n이 dry-run, i가 변경 목록입니다.", "diff -qr 원본 대상 && echo VERIFIED > verified.txt"],
    explanation:
      "정답:\nrsync -ani --delete /srv/config-source/ /srv/config-target/ > plan.txt\nrsync -a --delete /srv/config-source/ /srv/config-target/\ndiff -qr /srv/config-source /srv/config-target && echo VERIFIED > verified.txt\n\n" +
      "--delete는 강력하므로 dry-run 검토가 필수입니다. 완료 표식은 복사 명령 실행 여부가 아니라 사후 검증 성공 여부에 종속시킵니다.",
    verify: { answer: ["rsync -ani --delete /srv/config-source/ /srv/config-target/ > plan.txt", "rsync -a --delete /srv/config-source/ /srv/config-target/", "diff -qr /srv/config-source /srv/config-target && echo VERIFIED > verified.txt"] },
  },
  {
    id: "automation-05",
    category: "automation",
    title: "구조 모드에서 RPM DB 복구",
    difficulty: 3,
    tags: ["rpmdb --rebuilddb", "--root", "DB 백업", "복구 검증"],
    commands: ["rpm", "rpmdb", "tar"],
    scenario:
      "보안 Agent 설치 여부를 확인하던 중 파일은 남아 있지만 RPM 조회가 SQLite 인덱스 오류와 함께 실패합니다. " +
      "장애 서버의 루트 디스크는 구조 VM의 /mnt/sysroot에 마운트돼 있습니다. 원본 DB를 먼저 보존하고, 마운트된 시스템의 RPM DB를 재구축한 뒤 Agent 등록과 DB 무결성을 검증하세요.",
    objectives: [
      "/var/log/rpmdb-incident.log에서 최초 조회 오류를 확인하세요.",
      "실행 중인 rpm/dnf 작업이 없는지 확인하고 /mnt/sysroot/var/lib/rpm을 /root/work/rpmdb-before.tgz로 백업하세요.",
      "rpmdb --root /mnt/sysroot --rebuilddb로 대상 시스템의 DB를 복구하세요.",
      "rpmdb --verifydb와 rpm -q 결과를 검증하고 패키지 조회 결과를 /root/work/rpmdb-recovery.txt에 기록하세요.",
    ],
    setup: [
      "rm -rf /tmp/cbt-rpmbuild /mnt/sysroot /root/work/rpmdb-before.tgz /root/work/rpmdb-recovery.txt && mkdir -p /root/work /tmp/cbt-rpmbuild/BUILD /tmp/cbt-rpmbuild/BUILDROOT /tmp/cbt-rpmbuild/RPMS /tmp/cbt-rpmbuild/SOURCES /tmp/cbt-rpmbuild/SPECS /tmp/cbt-rpmbuild/SRPMS /mnt/sysroot/var/lib/rpm",
      "printf 'Name: cbt-agent\nVersion: 1.0\nRelease: 1\nSummary: CBT fixture\nLicense: MIT\nBuildArch: noarch\n%%description\nCBT fixture\n%%install\nmkdir -p %%{buildroot}/opt/cbt-agent\necho enabled=true > %%{buildroot}/opt/cbt-agent/agent.conf\n%%files\n/opt/cbt-agent/agent.conf\n' > /tmp/cbt-rpmbuild/SPECS/cbt-agent.spec",
      "rpmbuild --define '_topdir /tmp/cbt-rpmbuild' --define '__os_install_post %{nil}' -bb /tmp/cbt-rpmbuild/SPECS/cbt-agent.spec >/tmp/cbt-rpmbuild/build.log 2>&1",
      "rpm --root /mnt/sysroot --initdb",
      "rpm --root /mnt/sysroot -i --nodeps /tmp/cbt-rpmbuild/RPMS/noarch/cbt-agent-1.0-1.noarch.rpm",
      "rm -f /mnt/sysroot/var/lib/rpm/rpmdb.sqlite-shm /mnt/sysroot/var/lib/rpm/rpmdb.sqlite-wal && sqlite3 /mnt/sysroot/var/lib/rpm/rpmdb.sqlite 'DROP TABLE Name;'",
      "rpm --root /mnt/sysroot -q cbt-agent >/var/log/rpmdb-incident.log 2>&1; true",
    ],
    checks: [
      { id: "c1", type: "file_exists", path: "/root/work/rpmdb-before.tgz", label: "복구 전 RPM DB를 백업했는가" },
      { id: "c2", type: "command", cmd: "tar -tzf /root/work/rpmdb-before.tgz | grep -q '^rpm/rpmdb.sqlite$'", label: "백업에 원본 RPM DB가 들어 있는가" },
      { id: "c3", type: "command", cmd: "rpmdb --root /mnt/sysroot --verifydb", label: "복구 후 RPM DB 무결성 검사를 통과하는가" },
      { id: "c4", type: "command", cmd: "rpm --root /mnt/sysroot -q cbt-agent | grep -qx 'cbt-agent-1.0-1.noarch'", label: "설치 패키지 헤더가 다시 조회되는가" },
      { id: "c5", type: "file_content", path: "/root/work/rpmdb-recovery.txt", expect: { equals: "cbt-agent-1.0-1.noarch" }, label: "복구 결과를 증적으로 기록했는가" },
    ],
    hints: [
      "구조 환경에서 /mnt/sysroot는 대상 서버의 /입니다. rpmdb와 rpm 모두 --root /mnt/sysroot를 지정해야 합니다.",
      "DB 디렉터리 백업은 cd /mnt/sysroot/var/lib 후 tar로 rpm 디렉터리를 묶으면 복원 경로가 명확합니다.",
      "재구축 성공만 보지 말고 rpmdb --verifydb와 실제 패키지 조회를 모두 통과시켜야 합니다.",
    ],
    explanation:
      "정답 예시:\ncat /var/log/rpmdb-incident.log\npgrep -af '[r]pm|[d]nf' || true\ncd /mnt/sysroot/var/lib && tar -czf /root/work/rpmdb-before.tgz rpm\nrpmdb --root /mnt/sysroot --rebuilddb\nrpmdb --root /mnt/sysroot --verifydb\nrpm --root /mnt/sysroot -q cbt-agent | tee /root/work/rpmdb-recovery.txt\n\n" +
      "복구 전에 원본 DB와 실행 중인 패키지 작업을 확인해야 합니다. --root를 빼면 구조 VM 자신의 DB를 잘못 조작합니다. " +
      "재구축은 읽을 수 있는 설치 헤더에서 인덱스를 다시 만들므로, 완료 후 저수준 DB 검사와 실제 패키지 조회를 함께 검증합니다.",
    verify: {
      answer: [
        "cd /mnt/sysroot/var/lib && tar -czf /root/work/rpmdb-before.tgz rpm",
        "rpmdb --root /mnt/sysroot --rebuilddb",
        "rpmdb --root /mnt/sysroot --verifydb",
        "rpm --root /mnt/sysroot -q cbt-agent | tee /root/work/rpmdb-recovery.txt",
      ],
    },
    setupTimeoutMs: 30000,
  },
] satisfies Problem[];
