@echo off
echo ========================================================
echo   Starting EstateVision AI Real Estate Platform...
echo ========================================================
py -3.13 app.py
if errorlevel 1 (
    python app.py
)
pause
