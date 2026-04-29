# Sesli Sahne v22 - Ses Yönetim Merkezi

Bu sürümde ses tarafı unutulmadı; TTS motoru sorun çıkarsa bile yayın akışının ilerleyebilmesi için manuel ses dosyası bağlama özelliği eklendi.

## Eklenenler

- Her bölüm kartına manuel ses dosyası yükleme alanı eklendi.
- Desteklenen dosyalar: MP3, WAV, M4A, AAC, OGG, WEBM.
- Yüklenen ses dosyası doğrudan ilgili bölüme bağlanır.
- Bölüm durumu `audio_generated` olur.
- Yayın kontrol listesindeki ses sayacı manuel yüklenen sesleri de sayar.
- Bölümün mevcut ses bağlantısı admin panelden temizlenebilir.
- Ses bağlantısı temizlenirse bölüm tekrar `ready_for_tts` durumuna alınır.
- TTS üretimi hâlâ korunur: Keysiz Edge/Windows ve OpenAI altyapısı yerinde durur.

## Önerilen çalışma akışı

1. PDF yükle.
2. Bölümleri düzenle.
3. Otomatik TTS çalışırsa kullan.
4. TTS düzgün çalışmazsa dışarıda oluşturduğun MP3/WAV dosyasını ilgili bölüme manuel yükle.
5. Tüm bölümlerde ses varsa Kütüphaneye al.

## Neden önemli?

Türkçe TTS motoru stabil hale gelene kadar içerik üretimini durdurmamak için bu özellik eklendi. Böylece profesyonel seslendirme, başka bir TTS aracı veya kayıt programından alınan ses dosyaları da aynı kütüphane akışına bağlanabilir.
