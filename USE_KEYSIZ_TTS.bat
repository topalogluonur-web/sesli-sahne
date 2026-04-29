@echo off
cd /d "%~dp0backend"
(
echo PORT=5055
echo HOST=0.0.0.0
echo DATABASE_PATH=./data/sesli-sahne.sqlite
echo UPLOAD_ROOT=./uploads
echo TTS_PROVIDER=local_windows
echo LOCAL_TTS_RATE=0
echo OPENAI_API_KEY=
echo OPENAI_TTS_MODEL=gpt-4o-mini-tts
echo OPENAI_TTS_VOICE=nova
echo NODE_ENV=development
) > .env
echo Keysiz TTS modu aktif edildi. Backend'i yeniden baslatin.
pause
