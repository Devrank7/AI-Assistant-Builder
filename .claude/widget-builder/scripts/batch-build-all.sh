#!/bin/bash
# Batch generate + build + deploy widgets sequentially
# Usage: bash batch-build-all.sh clientId1 clientId2 ...

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SUCCESS=0
FAIL=0
FAILED_LIST=""

for CLIENT_ID in "$@"; do
  echo "--- Processing: $CLIENT_ID ---"

  # Generate source files
  node "$SCRIPT_DIR/generate-single-theme.js" "$CLIENT_ID" 2>&1
  if [ $? -ne 0 ]; then
    echo "❌ $CLIENT_ID: generate failed"
    FAIL=$((FAIL + 1))
    FAILED_LIST="$FAILED_LIST $CLIENT_ID"
    continue
  fi

  # Build
  node "$SCRIPT_DIR/build.js" "$CLIENT_ID" 2>&1
  if [ $? -ne 0 ]; then
    echo "❌ $CLIENT_ID: build failed"
    FAIL=$((FAIL + 1))
    FAILED_LIST="$FAILED_LIST $CLIENT_ID"
    continue
  fi

  # Deploy
  mkdir -p "$ROOT_DIR/quickwidgets/$CLIENT_ID"
  cp "$ROOT_DIR/.agent/widget-builder/dist/script.js" "$ROOT_DIR/quickwidgets/$CLIENT_ID/script.js"

  if [ -f "$ROOT_DIR/quickwidgets/$CLIENT_ID/script.js" ]; then
    SIZE=$(ls -la "$ROOT_DIR/quickwidgets/$CLIENT_ID/script.js" | awk '{print $5}')
    echo "✅ $CLIENT_ID: deployed (${SIZE} bytes)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌ $CLIENT_ID: deploy failed"
    FAIL=$((FAIL + 1))
    FAILED_LIST="$FAILED_LIST $CLIENT_ID"
  fi
done

echo ""
echo "=== BATCH BUILD COMPLETE ==="
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAIL"
if [ -n "$FAILED_LIST" ]; then
  echo "Failed:$FAILED_LIST"
fi
