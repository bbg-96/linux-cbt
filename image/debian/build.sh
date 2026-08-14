#!/usr/bin/env bash
# WSL(Ubuntu-24.04, root)에서 실행: Debian 컨테이너 rootfs → v86용 ext4 디스크 이미지
# 사용: bash ./build.sh [출력경로]
#
# Alpine 쪽(image/alpine/build.sh)과 다른 점:
#  - 9p 가 아니라 통짜 ext4 디스크를 만든다. 배포 환경에서 9p 커널 경로가
#    p9_fcall_init→__kmalloc oops 를 내는 문제를 아예 회피하기 위해서다.
#  - 디스크는 fixed_chunk_size 단위로 쪼개 zstd 로 압축해 서빙한다. v86 의
#    AsyncXHRPartfileBuffer 가 접근한 청크만 내려받으므로 첫 로딩이 가볍다.
set -euo pipefail
cd "$(dirname "$0")"

OUT="${1:-/mnt/c/Users/pangp/linux-cbt/public/vm/debian}"
WORK=/tmp/linux-cbt-debian
CHUNK=$((1024 * 1024))          # 1MiB — v86 fixed_chunk_size 와 반드시 동일
DISK_MB="${DISK_MB:-1600}"      # 여유 포함 (희소 파일이라 실제 사용분만 차지)

CONTAINER_NAME=debian-v86
IMAGE_NAME=i386/debian-v86

command -v mke2fs >/dev/null || { echo "e2fsprogs 필요: apt-get install -y e2fsprogs"; exit 1; }
command -v zstd  >/dev/null || { echo "zstd 필요: apt-get install -y zstd"; exit 1; }

rm -rf "$WORK"
mkdir -p "$WORK/rootfs"

echo "== 1/5 컨테이너 빌드 =="
podman build . --platform linux/386 --rm --tag "$IMAGE_NAME"
podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
podman create --platform linux/386 -t -i --name "$CONTAINER_NAME" "$IMAGE_NAME"
podman export "$CONTAINER_NAME" -o "$WORK/rootfs.tar"
podman rm -f "$CONTAINER_NAME"

echo "== 2/5 rootfs 전개 =="
tar -xf "$WORK/rootfs.tar" -C "$WORK/rootfs" \
  --exclude='.dockerenv' --exclude='dev/*' --numeric-owner
# 컨테이너에는 없는 것들 — 커널이 마운트한다
mkdir -p "$WORK/rootfs"/{dev,proc,sys,run,tmp}

echo "== 3/5 커널·initrd 추출 =="
KERNEL=$(ls "$WORK/rootfs"/boot/vmlinuz-* | head -1)
INITRD=$(ls "$WORK/rootfs"/boot/initrd.img-* | head -1)
cp "$KERNEL" "$WORK/vmlinuz"
cp "$INITRD" "$WORK/initrd.img"
echo "  kernel: $(basename "$KERNEL")"
echo "  initrd: $(basename "$INITRD") ($(du -h "$INITRD" | cut -f1))"

echo "== 4/5 ext4 이미지 생성 (마운트 없이 mke2fs -d) =="
rm -f "$WORK/rootfs.ext4"
# ^has_journal: 저널은 에뮬레이터에서 쓰기 비용만 늘린다 (스냅숏 기반이라 복구 불필요)
mke2fs -q -t ext4 -O ^has_journal -b 4096 -m 0 \
  -d "$WORK/rootfs" "$WORK/rootfs.ext4" "${DISK_MB}M"
resize2fs -M "$WORK/rootfs.ext4" >/dev/null 2>&1 || true   # 실제 사용분까지 축소
DISK_SIZE=$(stat -c %s "$WORK/rootfs.ext4")
# v86 청크 경계에 맞춰 크기를 올림 (부분 청크가 생기지 않도록)
PADDED=$(( (DISK_SIZE + CHUNK - 1) / CHUNK * CHUNK ))
truncate -s "$PADDED" "$WORK/rootfs.ext4"
echo "  disk: $((PADDED / 1024 / 1024)) MiB ($((PADDED / CHUNK)) chunks)"

echo "== 5/5 청크 분할 + zstd 압축 =="
rm -rf "$WORK/parts"
mkdir -p "$WORK/parts"
python3 - "$WORK/rootfs.ext4" "$WORK/parts" "$CHUNK" <<'PY'
import sys, pathlib, subprocess
src, outdir, chunk = sys.argv[1], pathlib.Path(sys.argv[2]), int(sys.argv[3])
with open(src, "rb") as f:
    i = 0
    while True:
        block = f.read(chunk)
        if not block:
            break
        if len(block) < chunk:          # 마지막 청크는 0 으로 채운다
            block += b"\0" * (chunk - len(block))
        # v86 AsyncXHRPartfileBuffer 규약 (libv86 buffer.js):
        #   url ".../rootfs.ext4.zst" → extension ".ext4.zst", basename ".../rootfs-"
        #   part = basename + <start> + "-" + <end> + extension
        # 즉 "rootfs-0-1048576.ext4.zst" 형태여야 한다. 이름이 어긋나면 404 만 난다.
        name = outdir / f"rootfs-{i * chunk}-{(i + 1) * chunk}.ext4.zst"
        p = subprocess.run(["zstd", "-19", "-q", "-o", str(name)], input=block, check=True)
        i += 1
        if i % 50 == 0:
            print(f"  {i} chunks", flush=True)
print(f"  total {i} chunks", flush=True)
PY

MANIFEST="$WORK/manifest.json"
KVER=$(basename "$KERNEL" | sed 's/^vmlinuz-//')
BUILT_AT=$(date -u +%FT%TZ)
# 파트 디렉터리 이름을 빌드마다 바꾼다 — 청크 파일은 URL 쿼리 버전을 달 수 없으므로
# (파일명을 v86이 유도) 디렉터리로 캐시를 가른다. 안 그러면 이미지 교체 배포 후
# 재방문자가 "구 청크(브라우저 캐시) + 신 스냅숏"으로 부팅해 게스트가 깨진다
# (alpine에서 실제 발생했던 캐시 짝 사고와 동일 패턴).
PARTS_DIR="parts-$(date -u +%Y%m%d%H%M%S)"
printf '{ "kernelVersion": "%s", "diskSize": %s, "chunkSize": %s, "builtAt": "%s", "partsDir": "%s", "hasState": false }\n' \
  "$KVER" "$PADDED" "$CHUNK" "$BUILT_AT" "$PARTS_DIR" > "$MANIFEST"

echo "== 프로젝트로 복사 중 =="
rm -rf "$OUT"
mkdir -p "$OUT"
cp -a "$WORK/vmlinuz" "$WORK/initrd.img" "$MANIFEST" "$OUT/"
cp -a "$WORK/parts" "$OUT/$PARTS_DIR"
echo "완료: $OUT"
du -sh "$OUT/$PARTS_DIR" "$OUT/vmlinuz" "$OUT/initrd.img" | sed 's/^/  /'
