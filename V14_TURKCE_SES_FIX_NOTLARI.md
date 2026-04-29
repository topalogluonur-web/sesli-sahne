# v14 - Türkçe Windows Ses Seçimi

Bu sürümde keysiz local TTS için Türkçe ses önceliği eklendi.

## Yenilikler

- Windows'ta kurulu sesleri admin panelden listeleme.
- Türkçe (`tr-TR`) ses varsa otomatik seçme.
- Türkçe ses yoksa admin panelde uyarı gösterme.
- Seçilen Windows sesini backend loglarında gösterme.
- `LOCAL_TTS_CULTURE=tr-TR` ayarı eklendi.
- `LOCAL_TTS_VOICE_NAME` ile belirli bir Windows sesi sabitlenebilir.
- `LIST_WINDOWS_VOICES.bat` eklendi.

## Türkçe ses yoksa

Windows Ayarlar > Zaman ve Dil > Dil ve bölge bölümünden Türkçe dil/konuşma bileşenlerini ekleyin. Türkçe ses kurulduktan sonra backend ve admin paneli yeniden başlatın.
