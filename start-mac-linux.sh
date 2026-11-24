#!/bin/sh
# Serves this folder at http://localhost:8000 (and to devices on the same Wi-Fi).
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then
  echo "Python 3 is required: https://www.python.org/downloads/"
  exit 1
fi
IP=$("$PY" -c 'import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(("192.0.2.1", 9))
    print(s.getsockname()[0])
except OSError:
    pass' 2>/dev/null)
echo "On this computer:        http://localhost:$PORT"
[ -n "$IP" ] && echo "Friends on the same Wi-Fi: http://$IP:$PORT"
echo "Press Ctrl+C to stop."
exec "$PY" -m http.server "$PORT"
