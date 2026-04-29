# Sesli Sahne v16 - Admin Kütüphane Yönetimi

Bu sürümde ses motoruna ara verilip yönetim tarafı güçlendirildi.

## Eklenenler

- Admin panelde kategori ekleme / düzenleme / silme.
- Kategori silindiğinde içerikler silinmez; sadece kategorisiz kalır.
- İçerik bilgilerini admin panelden düzenleme:
  - Başlık
  - Açıklama
  - Çocuk / yetişkin / aile hedef kitle seçimi
  - Yaş aralığı
  - Kategori
  - Premium seçimi
  - Durum: Taslak / Kütüphane / Arşiv
- İçerik silme.
- Bölüm silme.
- İçerik filtreleri:
  - Duruma göre: Taslak / Kütüphane / Arşiv
  - Hedef kitleye göre: Çocuk / Yetişkin / Aile
- “Kütüphaneye al” akışı:
  - İçerik `published` durumuna alınır.
  - Ses dosyası olan bölümler `published` olur.
  - Mobil uygulama yalnızca `published` içerikleri listeler.
- PDF yükleme akışı yine taslak olarak başlar. Kontrol + ses üretiminden sonra kütüphaneye alınır.

## Önerilen çalışma akışı

1. PDF yükle.
2. Hedef kitleyi seç: Çocuk / Yetişkin / Aile.
3. Kategoriyi seç veya yeni kategori oluştur.
4. Bölümleri kontrol et, gereksiz bölümleri sil.
5. Gerekirse içerik bilgilerini düzenle.
6. Seslendirme metnini hazırla.
7. Ses oluştur.
8. Son kontrol sonrası “Kütüphaneye al” butonuna bas.

## Not

Bu sürümde Türkçe ses motoru konusu bilinçli olarak ikinci plana bırakıldı. Önce içerik/kütüphane yönetimi sağlamlaştırıldı.
