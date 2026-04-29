# v13 - Keysiz Local TTS

Bu sürümde OpenAI API key gerekmeden, Windows'un yerel ses motoru ile WAV ses dosyası üretimi eklendi.

## Kullanım

1. Ana klasörde çalıştır:

```powershell
.\USE_KEYSIZ_TTS.bat
```

2. Backend'i yeniden başlat:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

3. Admin paneli aç:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\START_ADMIN.bat
```

4. Admin panelde TTS yöntemi olarak **Keysiz Windows yerel ses** seçili kalsın.

## Notlar

- Ses dosyaları MP3 değil WAV olarak üretilir.
- Kalite OpenAI / ElevenLabs kadar doğal değildir ama tamamen localdir.
- Erkek/kadın seçimi Windows'ta kurulu seslere göre çalışır. Bilgisayarda Türkçe kadın/erkek ses yoksa Windows varsayılan sesini kullanabilir.
- Daha sonra API key alırsan TTS yöntemini OpenAI olarak değiştirebilirsin.
