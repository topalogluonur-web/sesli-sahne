# v11 TTS Fix Notları

Bu sürümde ses üretim hattı güncellendi.

## Düzeltilenler

- OpenAI TTS isteğinde `format` yerine `response_format: "mp3"` kullanılır.
- `gpt-4o-mini-tts` için `instructions` alanı eklendi.
- Uzun PDF bölümleri daha küçük parçalara ayrılır.
- Test endpoint eklendi: `POST /api/tts/test`
- Kök klasöre `TEST_TTS.bat` eklendi.

## Kontrol

Backend açıkken kök klasörde:

```powershell
.\TEST_TTS.bat
```

Başarılı olursa JSON içinde `audio.audioUrl` döner. Örnek:

```json
{
  "ok": true,
  "audio": {
    "audioUrl": "/uploads/audio/episode-test-....mp3"
  }
}
```

Sonra tarayıcıda:

```text
http://127.0.0.1:5055/uploads/audio/DOSYA_ADI.mp3
```

## .env gerekli alanlar

`backend/.env` içinde en az şu olmalı:

```env
OPENAI_API_KEY=sk-...
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=female_soft
```
