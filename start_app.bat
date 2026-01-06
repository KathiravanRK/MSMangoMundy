@echo off
echo Starting Client and Server...

:: Start Server
start "Server" cmd /k "cd server && npm run dev"

:: Start Client
start "Client" cmd /k "cd client && npm run dev:lan"

echo Both services have been triggered to start in separate windows.
