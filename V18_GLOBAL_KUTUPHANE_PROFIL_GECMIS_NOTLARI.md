# v18 - Global Kütüphane, Profil Bazlı Favoriler ve Geçmiş

Bu sürümde yönetim ve mobil kullanım mantığı netleştirildi.

## Mobil taraf

- Kütüphane artık global çalışır: admin panelden kütüphaneye alınan tüm yayınlanmış içerikler tüm profillerde görünür.
- Favoriler profil bazlıdır: her profil yalnızca kendi favorilerini görür.
- Dinleme geçmişi profil bazlıdır: her profil yalnızca kendi dinleme geçmişini ve istatistiklerini görür.
- Ana ekranda 3 aktif alan vardır:
  - Kütüphane
  - Favoriler
  - Geçmiş
- Üstteki sayaç kartlarına basınca ilgili alan açılır.
- Geçmiş ekranında dinlenen kitap sayısı, bölüm sayısı ve toplam dinleme süresi gösterilir.
- Kütüphane/favoriler/geçmiş için tür filtresi eklendi:
  - Çocuk
  - Yetişkin
  - Aile
- Kategori filtresi tüm alanlarda çalışır.
- Profil seçme ekranında profil silme eklendi. Profil silinirse sadece o profile ait favoriler ve geçmiş silinir; kütüphane içerikleri silinmez.

## Player tarafı

- Mini player genişletildi.
- Süre çubuğu eklendi.
- Geçen süre / toplam süre gösterimi iyileştirildi.
- 10 saniye geri alma eklendi.
- 10 saniye ileri alma eklendi.
- Sonraki sesli bölüme geçme butonu eklendi.

## Backend tarafı

- `/api/history/summary` eklendi.
- Geçmiş kayıtlarına `category_id` eklendi, böylece geçmişte kategori filtresi çalışır.
- Profil silme endpoint'i mobil arayüzden kullanılabilir hale getirildi.

## Ürün mantığı

Bu sürümden itibaren sistem şu mantıkla ilerler:

1. Admin/yayıncı içerik oluşturur.
2. PDF veya sesli kitap taslağı düzenlenir.
3. İçerik Kütüphaneye alınır.
4. Tüm profiller global kütüphanede bu içeriği görür.
5. Her profil kendi favorisini ve kendi dinleme geçmişini ayrı tutar.

