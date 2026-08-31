@echo off
title DevPulse AI - Dev Launcher
color 0B
echo =======================================================================
echo   DevPulse AI: Development Server (Hot Reloading Mode)
echo =======================================================================
echo.
echo Launching Dev Server on http://localhost:3005...
echo.

cd /d "C:\Users\gopal\.gemini\antigravity-ide\scratch\devpulse-ai"

timeout /t 2 /nobreak >nul
start http://localhost:3005

npm run dev
pause
