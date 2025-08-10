@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Starting ROX Guild Manager...

:: Define ports
set CLIENT_PORT=3000
set SERVER_PORT=3001

:: Check if ports are occupied and close processes
echo 🔍 Checking port status...

:: Check and close client port
netstat -an | findstr ":%CLIENT_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port %CLIENT_PORT% is occupied, closing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%CLIENT_PORT% " ^| findstr "LISTENING"') do (
        echo Closing process PID: %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: Check and close server port
netstat -an | findstr ":%SERVER_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port %SERVER_PORT% is occupied, closing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%SERVER_PORT% " ^| findstr "LISTENING"') do (
        echo Closing process PID: %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: Wait for port release
echo ⏳ Waiting for port release...
timeout /t 3 /nobreak >nul

:: Check port status again
echo 🔍 Final port check...
netstat -an | findstr ":%CLIENT_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ❌ Port %CLIENT_PORT% is still occupied
) else (
    echo ✅ Port %CLIENT_PORT% has been released
)

netstat -an | findstr ":%SERVER_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ❌ Port %SERVER_PORT% is still occupied
) else (
    echo ✅ Port %SERVER_PORT% has been released
)

echo.
echo 📦 Installing client dependencies...
cd client && call npm install

echo.
echo 📦 Installing server dependencies...
cd ..\server && call npm install

echo.
echo 🎯 Starting server...
start "ROX Server" cmd /k "npm run dev"

echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo 🎯 Starting client...
cd ..\client
start "ROX Client" cmd /k "npm run dev"

echo.
echo ✅ Startup complete!
echo 📍 Client: http://localhost:%CLIENT_PORT%
echo 📍 Server: http://localhost:%SERVER_PORT%
echo.