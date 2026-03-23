#!/bin/bash

PORT=8080
HW_NUM="${1:-0}"
HW_DIR="hw${HW_NUM}"

if [ ! -f "${HW_DIR}/index.html" ]; then
    echo "Error: ${HW_DIR}/index.html not found"
    exit 1
fi

echo "Serving at http://localhost:${PORT}"
echo "Opening ${HW_DIR}/index.html ..."

# Open browser
start "http://localhost:${PORT}/${HW_DIR}/index.html" 2>/dev/null ||
xdg-open "http://localhost:${PORT}/${HW_DIR}/index.html" 2>/dev/null ||
open "http://localhost:${PORT}/${HW_DIR}/index.html" 2>/dev/null &

# Start HTTP server
python -m http.server ${PORT}
