@echo off
set /p API_URL=Production API adresini girin (ornek: https://api.seslisahne.com/api): 
if "%API_URL%"=="" (
  echo API adresi bos olamaz.
  pause
  exit /b 1
)

echo VITE_API_BASE=%API_URL%> admin\.env.production
echo EXPO_PUBLIC_API_BASE_URL=%API_URL%> mobile\.env.production
echo EXPO_PUBLIC_API_BASE_URL=%API_URL%> mobile\.env

echo.
echo Production API adresi yazildi:
echo %API_URL%
echo.
echo Admin production preview icin: START_ADMIN_CLOUD_PREVIEW.bat
echo Mobil production preview icin: START_MOBILE_CLOUD_PREVIEW.bat
pause
