@echo off
title The Pramod Maharaj Enterprises - ERP System
cd /d "%~dp0"

echo ==========================================================
echo   THE PRAMOD MAHARAJ ENTERPRISES - BUSINESS ERP
echo ==========================================================
echo.
echo Initializing local server and opening your browser...
echo.
echo Keep this terminal window OPEN while using the ERP.
echo To stop the server, press Ctrl + C or close this window.
echo ==========================================================
echo.

:: Launch the browser automatically after 3 seconds in the background
start "" cmd /c "ping 127.0.0.1 -n 4 >nul & start http://localhost:3000"

:: Launch Next.js dev server using npm.cmd
call npm.cmd run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Server stopped unexpectedly.
    pause
)

