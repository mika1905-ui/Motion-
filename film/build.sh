#!/usr/bin/env bash
# Baut das Gesamtvideo: Spot (0–10,4 s) + Fold-Film (20 s) + Soundtrack → out/iphone-film-tiktok.mp4
# Voraussetzungen: node + playwright, ffmpeg, python3 + numpy
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
SPOT=../apple-spot/out/iphone-spot-tiktok.mp4
[ -f "$SPOT" ]              || (cd ../apple-spot && node render.js out/iphone-spot-tiktok.mp4 --vertical)
[ -f out/fold-part.mp4 ]    || node render-fold.js out/fold-part.mp4 30
python3 sound.py 30.4
ffmpeg -y -loglevel error \
  -i "$SPOT" -i out/fold-part.mp4 -i out/soundtrack.wav \
  -filter_complex "[0:v]trim=0:10.4,setpts=PTS-STARTPTS,fps=30,format=yuv420p[a];[1:v]fps=30,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart \
  out/iphone-film-tiktok.mp4
echo "fertig: film/out/iphone-film-tiktok.mp4"
