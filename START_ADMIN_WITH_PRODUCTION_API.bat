@echo off
cd /d "%~dp0admin"
if not exist .env.production (
  echo admin\.env.production bulunamadi.
  echo Once ana klasorde SET_PRODUCTION_API_URL.bat calistirin.
  pause
  exit /b 1
)
for /f "tokens=1,* delims==" %%A in (.env.production) do (
  if "%%A"=="VITE_API_BASE" set VITE_API_BASE=%%B
)
echo Admin production API ile baslatiliyor: %VITE_API_BASE%
npm run dev
pause
