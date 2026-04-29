@echo off
cd /d "%~dp0admin"
if not exist node_modules npm install
npm run dev -- --mode production
pause
