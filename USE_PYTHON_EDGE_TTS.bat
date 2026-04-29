@echo off
cd /d "%~dp0backend"
(
echo PORT=5055
echo HOST=0.0.0.0
echo DATABASE_PATH=./data/sesli-sahne.sqlite
echo UPLOAD_ROOT=./uploads
echo.
echo TTS_PROVIDER=edge_python
echo EDGE_TTS_VOICE_NAME=
echo EDGE_TTS_RATE=-16%%
echo EDGE_TTS_PAUSE_LEVEL=normal
echo EDGE_TTS_MAX_CHARS=2300
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
echo Keysiz Python Edge Turkce neural TTS aktif edildi. Varsayilan okuma hizi: -16%%, duraklama: normal.
echo Once INSTALL_EDGE_TTS_PYTHON.bat calismis olmali.
echo Backend'i yeniden baslatin: cd backend ^&^& npm run dev
pause
