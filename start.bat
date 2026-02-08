@echo off
REM ──────────────────────────────────────
REM PageForge Launcher (Windows)
REM Doppelklick zum Starten
REM ──────────────────────────────────────

cd /d "%~dp0"

echo.
echo   ⚒️  PageForge - HTML Page Designer
echo   ──────────────────────────────────
echo   http://localhost:8420
echo.

REM venv aktivieren falls vorhanden
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo   venv: aktiviert
)

REM Browser öffnen (mit Verzögerung)
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8420"

REM Server starten
python server.py
