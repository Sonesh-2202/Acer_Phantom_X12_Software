@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found. Install Node.js 22.12 or later and try again.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found. Reinstall Node.js with npm included and try again.
    pause
    exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
    echo Installing project dependencies...
    call npm ci
    if errorlevel 1 exit /b 1
)
echo ========================================================
echo   PHANTOM DEVICE STUDIO // WEBHID
echo   Starting Vite development server...
echo   Open http://localhost:5173/ in Chrome or Edge
echo ========================================================
call npm run dev
endlocal
