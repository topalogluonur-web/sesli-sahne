@echo off
cd /d "%~dp0mobile"
if not exist node_modules npm install
npm run phone:tunnel
pause
