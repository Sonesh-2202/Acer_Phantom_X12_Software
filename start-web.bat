@echo off
setlocal
where py >nul 2>nul
if errorlevel 1 (
    echo Python Launcher was not found. Install Python 3 and try again.
    pause
    exit /b 1
)
py -3 "%~dp0tools\serve_web.py"
endlocal
