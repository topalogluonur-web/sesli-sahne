# v23 - Türkçe Ses Dönüştürme Düzeltmesi

Bu sürümde metni sese çevirme tarafı yeniden düzenlendi.

## Yeni önerilen yöntem

Varsayılan TTS yöntemi artık:

- `edge_python`
- Türkçe kadın: `tr-TR-EmelNeural`
- Türkçe erkek: `tr-TR-AhmetNeural`
- API key gerekmez
- İnternet gerekir
- İlk kurulumda Python `edge-tts` paketi gerekir

## İlk kurulum

Ana klasörde bir kez çalıştır:

```bat
INSTALL_EDGE_TTS_PYTHON.bat
```

Sonra önerilen modu aktif et:

```bat
USE_PYTHON_EDGE_TTS.bat
```

Backend'i kapatıp yeniden başlat:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

Test:

```bat
CHECK_TTS_STATUS.bat
```

Başarılıysa `/uploads/audio/...mp3` dosyası oluşur.

## Admin panel

TTS yöntemi olarak şunu seç:

- Keysiz Türkçe neural ses (Python Edge - önerilen)

Sonra önce `Kısa ses test`, başarılıysa bölüm üzerinde `Seçili sesle oluştur` kullan.

## Not

Bu yöntem OpenAI key istemez. Windows yerel TTS yerine Microsoft Edge neural Türkçe seslerini kullanır.
