@echo off
REM Set the code page to UTF-8 to handle Unicode filenames
chcp 65001 > nul
echo ===================================
echo BRAIN Expression Template Decoder
echo ===================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH!
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo Starting the application...
echo The app will automatically install any missing dependencies.
echo.

REM Run the Flask application
python "运行打开我.py"

REM Keep window open if there was an error
if errorlevel 1 (
    echo.
    echo Application exited with an error.
    pause
) 