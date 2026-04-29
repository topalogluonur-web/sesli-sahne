@echo off
cd /d %~dp0
echo === Keysiz Python Edge TTS test ===
curl.exe -X POST http://127.0.0.1:5055/api/tts/test ^
  -H "Content-Type: application/json" ^
  -d "{\"provider\":\"edge_python\",\"voice_profile\":\"female_soft\",\"style\":\"natural\",\"tts_rate\":\"-16%%\",\"pause_level\":\"normal\",\"input\":\"Merhaba. Sesli Sahne Turkce neural test ses kaydi basariyla ve yavas okunacak sekilde olusturuluyor.\"}"
echo.
echo === Ses dosyalari ===
curl.exe http://127.0.0.1:5055/api/tts/files
echo.
pause
