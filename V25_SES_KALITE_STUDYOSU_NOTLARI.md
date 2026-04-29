# v25 - Ses Kalite Stüdyosu

Bu sürüm, metin → Türkçe ses üretimi sırasında metnin daha anlaşılır okunması için kalite katmanı ekler.

## Eklenenler

- Admin panelde **Duraklama** seçimi:
  - Hafif duraklama
  - Normal duraklama
  - Uzun duraklama / uyku modu
- Admin panelde **Ses kalite önizlemesi** butonu.
- Her bölümde **Ses önizleme** butonu.
- Backend tarafında PDF gürültüsü temizleme:
  - sayfa numarası satırları
  - satır sonu tire bölünmeleri
  - gereksiz boşluklar
  - çok uzun satırların parçalanması
- Python Edge TTS artık konuşmaya gönderilen metni daha doğal satır/duraklama yapısıyla hazırlar.
- Uzun bölümlerde parça boyutu biraz düşürüldü; daha güvenli üretim için varsayılan parça sınırı 2300 karaktere çekildi.

## Önerilen ses ayarı

- TTS yöntemi: Keysiz Türkçe neural ses (Python Edge - önerilen)
- Türkçe neural ses: Emel veya Ahmet
- Akış tarzı: Doğal anlatım veya Uyku modu
- Okuma hızı: -16% veya çocuk/uyku için -22%
- Duraklama: Normal, uyku için Uzun

## Not

Daha önce üretilmiş ses dosyaları otomatik değişmez. Yeni kalite ayarlarının uygulanması için “Mevcut sesleri tekrar üret” işaretlenip yeniden ses üretmek gerekir.
