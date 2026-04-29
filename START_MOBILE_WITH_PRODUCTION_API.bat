@echo off
cd /d "%~dp0mobile"
if not exist .env.production (
  echo mobile\.env.production bulunamadi.
  echo Once ana klasorde SET_PRODUCTION_API_URL.bat calistirin.
  pause
  exit /b 1
)
for /f "tokens=1,* delims==" %%A in (.env.production) do (
  if "%%A"=="EXPO_PUBLIC_API_BASE_URL" set EXPO_PUBLIC_API_BASE_URL=%%B
)
echo Mobil production API ile baslatiliyor: %EXPO_PUBLIC_API_BASE_URL%
npx expo start --lan --clear
pause
