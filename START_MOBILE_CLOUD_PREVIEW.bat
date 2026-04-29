@echo off
cd /d "%~dp0mobile"
if not exist node_modules npm install
npx expo start --lan --clear
pause
