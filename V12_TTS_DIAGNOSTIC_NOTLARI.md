# v12 TTS Diagnostic Fix

Bu sürüm, “hata vermiyor ama sese çevirmiyor” durumunu görünür hale getirmek için hazırlandı.

Eklenenler:
- Admin panelde “Kısa TTS test” butonu
- Admin panelde “MP3 dosyalarını listele” butonu
- Backend terminalinde TTS logları
- `/api/tts/files` endpoint'i
- Vite proxy: `/api` ve `/uploads` backend'e yönlenir
- Audio player cache busting: MP3 oluştuysa admin ekranda hemen görünür
- TTS çıktısı 500 byte altındaysa hata verir; sessiz başarısızlık engellenir

Kontrol:
1. Backend'i aç: `START_BACKEND.bat`
2. Admin'i aç: `START_ADMIN.bat`
3. Admin > İçerik Stüdyosu > Kısa TTS test
4. “Son MP3 dosyaları” listesinde ses görünüp oynatılmalı.
5. Olmazsa backend terminalinde `[TTS]` loglarını kontrol et.
