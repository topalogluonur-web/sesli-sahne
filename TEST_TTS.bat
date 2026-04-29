@echo off
cd /d %~dp0
curl.exe -X POST http://127.0.0.1:5055/api/tts/test ^
  -H "Content-Type: application/json" ^
  -d "{\"voice_profile\":\"female_soft\",\"style\":\"natural\",\"input\":\"Merhaba. Sesli Sahne test ses kaydı başarıyla oluşturuluyor.\"}"
echo.
pause
