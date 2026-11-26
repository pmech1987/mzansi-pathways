REM Double-click on Windows: makes a checksummed backup of the project and of the whole git history, then proves they can be read back.
@echo off
setlocal
cd /d "%~dp0"
REM Find Python: the "python" command, or the Windows "py" launcher when python is not on PATH
set "PY=python"
python --version >nul 2>&1 || set "PY=py -3"
%PY% --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Install it from https://www.python.org/downloads/ and TICK "Add python.exe to PATH", then run this again.
  pause
  exit /b 1
)
%PY% scripts\maintain.py --zip
%PY% scripts\github_publish.py --bundle
%PY% scripts\maintain.py --verify-backups
echo.
echo If you set MZ_OFFSITE_DIR, a copy also went to that folder.
pause
