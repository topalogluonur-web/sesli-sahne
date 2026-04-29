@echo off
cd /d %~dp0
cd mobile
call npm install
call npx expo install --fix
cd ..
call npx eas-cli build -p android --profile production
pause
