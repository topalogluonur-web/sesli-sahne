@echo off
cd /d %~dp0
set /p API_URL=Production API URL girin (ornek: https://api.seslisahne.com/api): 
if "%API_URL%"=="" (
  echo API URL bos olamaz.
  pause
  exit /b 1
)
(
  echo EXPO_PUBLIC_API_BASE_URL=%API_URL%
) > mobile\.env.production
(
  echo VITE_API_BASE=%API_URL%
) > admin\.env.production

echo.
echo Production API ayarlari yazildi:
echo mobile\.env.production
echo admin\.env.production
echo.
echo Not: Local test icin mobile\.env veya PowerShell env kullanmaya devam edebilirsin.
pause
