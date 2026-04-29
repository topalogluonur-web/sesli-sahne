# Sesli Sahne v9 - İçerik Stüdyosu

Bu sürüm PDF → inceleme → seslendirme metni → MP3 akışını güçlendirir.

## Yeni özellikler

- PDF yüklendikten sonra otomatik içerik inceleme raporu
- Bölüm bazlı kelime, paragraf, tahmini süre ve uyarı metrikleri
- Çocuk içeriklerinde hassas kelime uyarısı
- Erkek / kadın ses profili seçimi
- Akış tarzı seçimi: doğal anlatım, uyku modu, sesli tiyatro, eğitici anlatım
- Bölüm bazlı “Sese hazırla” butonu
- Tüm bölümleri tek seferde “Sese hazırla” butonu
- Bölüm bazlı “Seçili sesle oluştur” butonu
- Tüm bölümleri tek seferde sese çevirme butonu
- TTS öncesi prodüksiyon notlarını temizleme katmanı

## Ses profilleri

Admin paneldeki ses profilleri şunlardır:

- Kadın sesi - sıcak ve akıcı
- Kadın sesi - sakin ve yumuşak
- Erkek sesi - tok ve güvenli
- Erkek sesi - doğal ve akıcı
- Nötr anlatıcı - hikâye tonu
- Karakterli anlatım

Not: Ses profilleri OpenAI TTS voice değerlerine map edilir. Nihai kaliteyi test için kısa bölümlerde denemek önerilir.

## Önerilen akış

1. Admin panelden PDF yükle.
2. Oluşan inceleme raporunu kontrol et.
3. Bölüm metinlerinde bozuk karakter veya eksik metin varsa “Metni düzenle” ile düzelt.
4. Ses profili seç.
5. Akış tarzı seç.
6. “Tümünü seslendirmeye hazırla” butonuna bas.
7. Önce tek bir bölümde “Seçili sesle oluştur” test et.
8. Ses iyi ise “Tümünü sese çevir” ile devam et.
9. Audio player’dan oluşan MP3’leri dinle.
10. İçeriği yayına al.

## Önemli

- Taranmış/görsel PDF’lerde metin çıkmayabilir. Bu durumda OCR modülü gerekir.
- Telifli kitapları yalnızca izin/lisans varsa seslendirin.
- Uzun PDF’lerde “Tümünü sese çevir” API maliyeti oluşturabilir; önce bir bölümle deneme yapılması önerilir.
