REM Double-click on Windows: checks everything, backs up, then publishes to GitHub. Type what you changed when asked.
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
set /p MSG=What did you change (one short line)? 
if "%MSG%"=="" set "MSG=Update"
%PY% scripts\github_publish.py --message "%MSG%"
echo.
pause
