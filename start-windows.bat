@echo off
rem Serves this folder at http://localhost:8000 (and to devices on the same Wi-Fi).
cd /d "%~dp0"
set PORT=8000
set PY=
where py >nul 2>nul && set PY=py
if not defined PY where python >nul 2>nul && set PY=python
if not defined PY (
  echo Python 3 is required: https://www.python.org/downloads/
  pause
  exit /b 1
)
echo On this computer:  http://localhost:%PORT%
echo Friends on the same Wi-Fi: use this computer's IPv4 address from "ipconfig", e.g. http://192.168.1.20:%PORT%
echo Close this window to stop.
start "" http://localhost:%PORT%
%PY% -m http.server %PORT%
pause
