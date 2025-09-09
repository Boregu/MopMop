Write-Host "Starting MopMop Game (Server + Client)..." -ForegroundColor Green
Write-Host ""

# Kill any existing node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait for processes to close
Write-Host "Waiting for processes to close..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Start server in new window
Write-Host "Starting server..." -ForegroundColor Cyan
Set-Location server
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Normal
Set-Location ..

# Wait for server to start
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start client in new window
Write-Host "Starting client..." -ForegroundColor Cyan
Set-Location client
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "Both server and client should be starting!" -ForegroundColor Green
Write-Host "- Server: http://localhost:3001" -ForegroundColor White
Write-Host "- Client: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
