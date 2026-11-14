@echo off
setlocal
set "PYTHON=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
    echo Missing .venv. Run the setup commands in README.md first.
    exit /b 1
)
rem Keep Qt DLLs as sidecar files: this avoids QtWidgets import failures during one-file extraction.
"%PYTHON%" -m PyInstaller --noconfirm --clean --onedir --windowed --name AcerPhantomX12Control --hidden-import=hid main.py
if errorlevel 1 exit /b %errorlevel%
echo Built dist\AcerPhantomX12Control.exe
endlocal
