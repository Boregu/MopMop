@echo off
echo Starting MopMop Server...
echo.

REM Kill any existing node processes
taskkill /f /im node.exe >nul 2>&1

REM Wait a moment for processes to close
timeout /t 2 /nobreak >nul

REM Navigate to server directory and start server
cd server
echo Starting server on port 3001...
node server.js

REM If server crashes, wait and restart
echo.
echo Server stopped. Press any key to restart or close this window to exit.
pause >nul
goto :eof
