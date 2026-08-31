@echo off
title DevPulse AI - Server Launcher
color 0A
echo =======================================================================
echo   DevPulse AI: Full-Stack AI Resume & Deep GitHub Portfolio Evaluator
echo =======================================================================
echo.
echo Launching DevPulse AI Application Server on http://localhost:3005...
echo Opening your default browser...
echo.

cd /d "C:\Users\gopal\.gemini\antigravity-ide\scratch\devpulse-ai"

:: Launch default web browser to localhost:3005 after 2 seconds
timeout /t 2 /nobreak >nul
start http://localhost:3005

:: Run the production application server
npm start
pause
