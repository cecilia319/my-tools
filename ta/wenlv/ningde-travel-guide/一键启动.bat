@echo off
chcp 65001 >nul
title 文旅AI导游 · 一键启动
cd /d "%~dp0"

echo ==============================================
echo   文旅 AI 导游 · 一键启动
echo   端口 127.0.0.1:8765
echo ==============================================
echo.

rem 端口占用自检（服务已在跑则直接打开，不重复启动）
netstat -ano | findstr /C:":8765 " >nul 2>&1
if not errorlevel 1 (
    echo [OK] 服务已在运行，直接打开浏览器...
    start "" http://127.0.0.1:8765/
    exit /b 0
)

rem Python 可用性自检
where python >nul 2>&1
if errorlevel 1 (
    echo [X] 未找到 Python，请先安装 Python 3.8+（勾选 Add to PATH）
    echo     下载：https://www.python.org/downloads/
    pause
    exit /b 1
)

rem 启动服务（最小化窗口）
start "NingdeGuide-Server" /min cmd /c python server\server.py

rem 健康检查：最多等 15 秒，就绪后自动打开浏览器
set /a tries=0
:check
set /a tries+=1
if %tries% gtr 15 goto fail
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8765/' -TimeoutSec 1).StatusCode;exit 0}catch{exit 1}" >nul 2>&1
if errorlevel 1 goto check
echo [OK] 服务已就绪，正在打开浏览器...
start "" http://127.0.0.1:8765/
exit /b 0

:fail
echo [X] 服务启动超时，请手动检查：python server\server.py
echo     若报错，请截图发给维护人员。
pause
exit /b 1