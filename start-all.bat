@echo off
echo Starting MopMop Game (Server + Client)...
echo.

REM Kill any existing node processes
echo Stopping existing servers...
taskkill /f /im node.exe >nul 2>&1

REM Kill processes on specific ports (more reliable)
echo Killing processes on ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

REM Close existing command windows with specific titles
echo Closing existing MopMop windows...
taskkill /f /fi "WINDOWTITLE eq MopMop Server*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq MopMop Client*" >nul 2>&1

REM Wait for processes to close
echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

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
