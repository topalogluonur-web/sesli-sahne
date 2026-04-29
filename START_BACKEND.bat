@echo off
cd /d "%~dp0backend"
if not exist .env copy .env.example .env
if not exist node_modules npm install
npm run seed
npm run seed:demo
npm run dev
pause
