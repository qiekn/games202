#!/bin/bash

PORT=8080
HW_NUM="${1:-0}"
HW_DIR="hw${HW_NUM}"

if [ ! -f "${HW_DIR}/index.html" ]; then
    echo "Error: ${HW_DIR}/index.html not found"
    exit 1
fi

URL="http://localhost:${PORT}/${HW_DIR}/index.html"
echo "Serving at http://localhost:${PORT}"
echo "Opening ${HW_DIR}/index.html ..."

# Start HTTP server in background
python -m http.server ${PORT} &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 20); do
    curl -s -o /dev/null "http://localhost:${PORT}/" && break
    sleep 0.2
done

# Open browser
start "${URL}" 2>/dev/null ||
xdg-open "${URL}" 2>/dev/null ||
open "${URL}" 2>/dev/null &

# Wait for server process
wait $SERVER_PID
