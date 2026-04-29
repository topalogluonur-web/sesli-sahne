@echo off
cd /d "%~dp0backend"
(
echo PORT=5055
echo HOST=0.0.0.0
echo.
echo TTS_PROVIDER=edge_online
echo EDGE_TTS_VOICE_NAME=
echo.
echo LOCAL_TTS_CULTURE=tr-TR
echo LOCAL_TTS_VOICE_NAME=
echo LOCAL_TTS_RATE=0
echo.
echo OPENAI_API_KEY=
echo OPENAI_TTS_MODEL=gpt-4o-mini-tts
echo OPENAI_TTS_VOICE=nova
echo.
echo NODE_ENV=development
) > .env
echo Keysiz Edge online Turkce neural TTS aktif edildi.
echo Backend'i yeniden baslatin: cd backend ^&^& npm run dev
pause
