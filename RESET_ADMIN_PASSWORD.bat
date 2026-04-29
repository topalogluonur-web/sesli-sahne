@echo off
cd /d %~dp0backend
node src\resetAdminPassword.js
pause
