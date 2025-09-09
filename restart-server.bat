@echo off
echo Restarting MopMop Server...
echo.

REM Kill any existing node processes
echo Stopping existing servers...
taskkill /f /im node.exe >nul 2>&1

REM Wait for processes to close
echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

REM Start server
echo Starting fresh server...
cd server
start "MopMop Server" node server.js

echo.
echo Server restarted! Check the new window for server output.
echo Press any key to exit this window.
pause >nul
