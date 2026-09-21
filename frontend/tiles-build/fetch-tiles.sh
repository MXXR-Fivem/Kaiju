#!/bin/sh
# Downloads the Tokyork AOI basemap tiles (z11-16) listed in tile-list.txt
# so the frontend can serve them locally, with no runtime dependency on
# server.arcgisonline.com.
set -eu

OUT_DIR="$1"
LIST="$2"
CONCURRENCY="${3:-32}"

mkdir -p "$OUT_DIR"

fetch_batch() {
  batch_list="$1"
  concurrency="$2"
  fail_log="$3"
  : > "$fail_log"
  xargs -n3 -P "$concurrency" sh -c '
    z="$1"; x="$2"; y="$3"
    dir="'"$OUT_DIR"'/$z/$x"
    mkdir -p "$dir"
    out="$dir/$y.jpg"
    if [ ! -s "$out" ]; then
      if ! curl -sf --retry 3 --retry-delay 1 -o "$out" \
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/$z/$y/$x"; then
        echo "$z $x $y" >> "'"$fail_log"'"
      fi
    fi
  ' _ < "$batch_list"
}

fetch_batch "$LIST" "$CONCURRENCY" "$OUT_DIR/failed.log"

# a handful of tiles routinely fail under high concurrency (transient
# rate-limiting, not missing tiles) — a slow, low-concurrency retry pass
# clears them without having to patch a running container by hand.
attempt=0
while [ -s "$OUT_DIR/failed.log" ] && [ "$attempt" -lt 3 ]; do
  attempt=$((attempt + 1))
  echo "retry pass $attempt: $(wc -l < "$OUT_DIR/failed.log") tile(s)"
  mv "$OUT_DIR/failed.log" "$OUT_DIR/retry.$attempt.log"
  fetch_batch "$OUT_DIR/retry.$attempt.log" 4 "$OUT_DIR/failed.log"
  rm -f "$OUT_DIR/retry.$attempt.log"
done

echo "done. failed count: $(wc -l < "$OUT_DIR/failed.log")"
