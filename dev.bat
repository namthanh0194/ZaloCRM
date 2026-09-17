@echo off
title ZaloCRM Local Dev Launcher

echo ===================================================
echo   Khoi dong moi truong ZaloCRM Dev (Hot Reload)
echo ===================================================
echo.

echo [1/3] Kiem tra Docker Database, Redis, MinIO...
docker compose up -d db redis minio
docker compose stop app >nul 2>&1

echo.
echo [2/3] Dang mo Backend (Port 3000)...
start "ZaloCRM Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo [3/3] Dang mo Frontend Vite (Port 5173)...
start "ZaloCRM Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  Da khoi dong xong!
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://localhost:3000
echo ===================================================
ping -n 3 127.0.0.1 >nul
start http://localhost:5173