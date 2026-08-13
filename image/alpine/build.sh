#!/usr/bin/env bash
# WSL(Ubuntu-24.04, root)에서 실행: 컨테이너 rootfs → v86 9p 이미지(fs.json + sha256 저장소)
# 사용: WITH_NM=0 ./build.sh [출력경로]
set -euo pipefail
cd "$(dirname "$0")"

WITH_NM="${WITH_NM:-0}"
WORK=/tmp/linux-cbt-image
OUT="${1:-/mnt/c/Users/pangp/linux-cbt/public/vm/alpine}"

CONTAINER_NAME=alpine-v86
IMAGE_NAME=i386/alpine-v86

mkdir -p "$WORK"
podman build . --platform linux/386 --build-arg WITH_NM="$WITH_NM" --rm --tag "$IMAGE_NAME"
podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
podman create --platform linux/386 -t -i --name "$CONTAINER_NAME" "$IMAGE_NAME"
podman export "$CONTAINER_NAME" -o "$WORK/rootfs.tar"
podman rm -f "$CONTAINER_NAME"

tar -f "$WORK/rootfs.tar" --delete ".dockerenv" 2>/dev/null || true

rm -rf "$WORK/rootfs-flat"
mkdir -p "$WORK/rootfs-flat"
python3 ./fs2json.py --zstd --out "$WORK/fs.json" "$WORK/rootfs.tar"
python3 ./copy-to-sha256.py --zstd "$WORK/rootfs.tar" "$WORK/rootfs-flat"

FSHASH=$(sha256sum "$WORK/fs.json" | cut -d' ' -f1)
printf '{ "fsJsonSha256": "%s", "withNM": %s, "hasState": false, "builtAt": "%s" }\n' \
  "$FSHASH" "$WITH_NM" "$(date -u +%FT%TZ)" > "$WORK/manifest.json"

echo "== 프로젝트로 복사 중 (수천 개 파일, 수십 초~수 분) =="
rm -rf "$OUT"
mkdir -p "$OUT"
cp -a "$WORK/fs.json" "$WORK/manifest.json" "$WORK/rootfs-flat" "$OUT/"
echo "완료: $OUT"
du -sh "$OUT/rootfs-flat" "$OUT/fs.json" 2>/dev/null | sed 's/^/  /'
