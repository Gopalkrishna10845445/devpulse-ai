@echo off
title DevPulse AI Launcher
color 0A
echo =======================================================================
echo   DevPulse AI: Full-Stack AI Resume & Deep GitHub Portfolio Evaluator
echo =======================================================================
echo.
echo Starting DevPulse AI Server on http://localhost:3005...
echo.

cd /d "%~dp0"

timeout /t 2 /nobreak >nul
start http://localhost:3005

npm start
pause
