@echo off
REM ──────────────────────────────────────────────
REM PageForge – Automatisches Setup (Windows)
REM Doppelklick oder: setup.bat
REM ──────────────────────────────────────────────

echo.
echo   ⚒️  PageForge – Setup
echo   ──────────────────────────────────────
echo.

cd /d "%~dp0"

REM 1. Python prüfen
echo   [1/4] Python pruefen...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo          ❌ Python 3 nicht gefunden!
        echo          Bitte installiere Python 3: https://www.python.org/downloads/
        echo          Wichtig: Bei der Installation "Add Python to PATH" aktivieren!
        pause
        exit /b 1
    )
    set PY=python3
) else (
    set PY=python
)
echo          ✅ Python gefunden

REM 2. Virtual Environment erstellen
echo   [2/4] Virtual Environment erstellen...
if exist "venv" (
    echo          ✅ venv existiert bereits
) else (
    %PY% -m venv venv
    echo          ✅ venv erstellt
)

REM 3. venv aktivieren
echo   [3/4] Virtual Environment aktivieren...
call venv\Scripts\activate.bat
echo          ✅ Aktiviert

REM 4. Fertig
echo   [4/4] Setup abgeschlossen
echo.
echo   ──────────────────────────────────────
echo   ✅ Setup abgeschlossen!
echo.
echo   Starten mit:
echo     venv\Scripts\activate
echo     python server.py
echo.
echo   ──────────────────────────────────────
echo.

set /p REPLY="  Jetzt starten? (j/n) "
if /i "%REPLY%"=="j" (
    python server.py
)
