@echo off
cd /d %~dp0
start "NingdeGuide-Server" /min cmd /c python server\server.py
timeout /t 2 >nul
start "" http://127.0.0.1:8765/
