# Sesli Sahne v19 - Yayıncı Paneli + Arama

Bu sürüm v18 üzerine gelir.

## Eklenenler

- Mobilde Kütüphane / Favoriler / Geçmiş ekranlarına arama kutusu eklendi.
- Mobilde sıralama seçenekleri eklendi:
  - Yeni
  - A-Z
  - Çok bölümlü
- Geçmiş araması kitap adı, bölüm adı ve kategori üzerinden çalışır.
- Admin panelde içerik listesine arama kutusu eklendi.
- Admin içerik listesinde bölüm sayısı yanında ses dosyası sayısı da görünür.
- Admin içerik detayına yayın kontrol listesi eklendi:
  - Başlık
  - Açıklama
  - Kategori
  - Kapak
  - Bölüm
  - Ses
- Header metni v19 yayıncı paneli mantığına göre güncellendi.

## Ürün Mantığı

- Admin/yayıncı içerik oluşturur ve kütüphaneye alır.
- Kütüphaneye alınan içerikler tüm profillerde görünür.
- Favoriler ve dinleme geçmişi profil bazlıdır.
- Yayın kontrol listesi store/public yayın öncesi kalite kontrol için kullanılır.

## Çalıştırma

Backend:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

Admin:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\START_ADMIN.bat
```

Mobil:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://172.16.200.58:5055/api"
npx expo start --lan --clear
```
