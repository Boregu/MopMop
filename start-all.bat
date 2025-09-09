@echo off
echo Starting MopMop Game (Server + Client)...
echo.

REM Kill any existing node processes
echo Stopping existing servers...
taskkill /f /im node.exe >nul 2>&1

REM Wait for processes to close
echo Waiting for processes to close...
timeout /t 2 /nobreak >nul

REM Start server in new window
echo Starting server...
cd server
start "MopMop Server" node server.js
cd ..

REM Wait a moment for server to start
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

REM Start client in new window
echo Starting client...
cd client
start "MopMop Client" npm run dev
cd ..

echo.
echo Both server and client should be starting!
echo - Server: http://localhost:3001
echo - Client: http://localhost:5173
echo.
echo Press any key to exit this window.
pause >nul
