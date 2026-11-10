#!/usr/bin/env bash
# Baut das Gesamtvideo: Spot (0–10,4 s) + Fold-Film (20 s) + Soundtrack → out/iphone-film-tiktok.mp4
# Voraussetzungen: node + playwright, ffmpeg, python3 + numpy
#        ./build.sh        → 9:16  (out/iphone-film-tiktok.mp4)
#        ./build.sh land   → 16:9  (out/iphone-film-16x9.mp4)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
if [ "${1:-}" = "land" ]; then
  export LAND=1; SUF=land; OUT=out/iphone-film-16x9.mp4
  SPOT=../apple-spot/out/iphone-spot.mp4
  [ -f "$SPOT" ] || (cd ../apple-spot && node render.js out/iphone-spot.mp4)
else
  SUF=tiktok; OUT=out/iphone-film-tiktok.mp4
  SPOT=../apple-spot/out/iphone-spot-tiktok.mp4
  [ -f "$SPOT" ] || (cd ../apple-spot && node render.js out/iphone-spot-tiktok.mp4 --vertical)
fi
FOLD=out/fold-part-$SUF.mp4
if [ ! -f $FOLD ]; then
  # 4 Abschnitte parallel rendern (jeweils 5 s), dann verbinden
  for c in "0 5" "5 10" "10 15" "15 20"; do set -- $c; node render-fold.js out/chunk_${SUF}_$1.mp4 30 $1 $2 & done; wait
  printf "file 'chunk_${SUF}_%s.mp4'\n" 0 5 10 15 > out/chunks.txt
  ffmpeg -y -loglevel error -f concat -safe 0 -i out/chunks.txt -c copy $FOLD
fi
python3 sound.py 30.4
ffmpeg -y -loglevel error \
  -i "$SPOT" -i $FOLD -i out/soundtrack.wav \
  -filter_complex "[0:v]trim=0:10.4,setpts=PTS-STARTPTS,fps=30,format=yuv420p[a];[1:v]fps=30,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart \
  $OUT
echo "fertig: film/$OUT"
