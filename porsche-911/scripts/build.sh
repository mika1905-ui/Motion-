#!/usr/bin/env bash
# Renders the 911 motion piece to out/911-motion-16x9.mp4 and out/911-motion-9x16.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
node scripts/render.js "$TMP/frames" 30
python3 scripts/sound.py "$TMP/sound.wav"
mkdir -p out
ffmpeg -y -v error -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/sound.wav" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart \
  out/911-motion-16x9.mp4
# vertical (TikTok / Reels): screen centred on a dark backdrop with caption
ffmpeg -y -v error -i out/911-motion-16x9.mp4 -filter_complex "\
  [0:v]scale=1080:-2,setsar=1[fg];\
  color=c=0x05060a:s=1080x1920:r=30[bg];\
  [bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,\
  drawtext=font=Inter:fontsize=58:fontcolor=white:text='Claude Code + my skills':x=(w-tw)/2:y=560" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart out/911-motion-9x16.mp4
rm -rf "$TMP"
echo "done: out/911-motion-16x9.mp4 out/911-motion-9x16.mp4"
