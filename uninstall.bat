@echo off
setlocal
set "APPDIR=%~dp0dist\AcerPhantomX12Control"
if not exist "%APPDIR%\AcerPhantomX12Control.exe" (
    echo The built application was not found at dist\AcerPhantomX12Control\AcerPhantomX12Control.exe.
    exit /b 0
)
choice /M "Remove the AcerPhantomX12Control app folder? Local profiles, logs, and backups will be kept"
if errorlevel 2 exit /b 0
powershell -NoProfile -Command "Remove-Item -LiteralPath '%APPDIR%' -Recurse -Force"
if errorlevel 1 exit /b %errorlevel%
echo Application folder removed. Local data was kept.
endlocal
