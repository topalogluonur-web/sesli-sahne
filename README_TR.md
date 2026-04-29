# Sesli Sahne - MVP Starter

Bu paket, çocuk ve yetişkin sesli içerik platformu için çalışan ilk iskeleti içerir.

## İçerik

```text
sesli-sahne/
├─ backend/        Express + SQLite API
├─ admin/          React + Vite admin panel
├─ mobile/         Expo React Native mobil uygulama
└─ README_TR.md
```

## Şu an çalışan özellikler

### Backend + Admin

- Kategori listesi ve kategori ekleme
- PDF yükleme
- PDF içinden metin çıkarma
- Metni otomatik bölümlere ayırma
- İçerik ve bölüm kaydı
- Bölüm metnini düzenleme
- İçeriği yayına alma / taslağa çekme
- OpenAI TTS API key girilirse bölümden MP3 üretme
- Üretilen sesi admin panelde oynatma

### Mobil uygulama

- Çocuk / yetişkin / aile modu seçimi
- Yayınlanmış içerik listeleme
- Kategoriye göre filtreleme
- İçerik detay ekranı
- Bölüm listesi
- Ses dosyası varsa mobilde oynatma
- Basit mini player ve ilerleme göstergesi

## Kurulum

### 1. Backend

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
copy .env.example .env
npm install
npm run seed
npm run seed:demo
npm run dev
```

Backend adresi:

```text
http://localhost:5055/api/health
```

`npm run seed:demo` komutu çocuk, yetişkin ve aile modu için örnek yayınlanmış içerikler ekler. Ses dosyaları otomatik oluşmaz; admin panelden bölüm bazında “Ses oluştur” işlemini çalıştırabilirsin.

### 2. Admin panel

Ayrı bir terminal aç:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\admin
npm install
npm run dev
```

Admin panel:

```text
http://localhost:5175
```

### 3. Mobil uygulama

Ayrı bir terminal aç:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
copy .env.example .env
npm install
npm run start
```

Expo açılınca:

- Bilgisayarda test için `w` tuşuyla web preview açabilirsin.
- Telefonda test için Expo Go uygulamasıyla QR kod okutabilirsin.
- Telefonda test ederken `mobile/.env` içindeki `EXPO_PUBLIC_API_BASE_URL` değerinde `localhost` kullanma. Bilgisayarının yerel IP adresini yaz.

Örnek:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:5055/api
```

IP adresini Windows’ta şu komutla görebilirsin:

```powershell
ipconfig
```

Genellikle `IPv4 Address` satırındaki değer kullanılır.

## TTS / Ses oluşturma

Ses oluştur butonunun çalışması için `backend/.env` içine OpenAI API key ekle:

```env
OPENAI_API_KEY=buraya_api_key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

Sonra backend'i yeniden başlat.

> Not: Uzun bölümler otomatik parçalara ayrılır ve tek MP3 dosyası olarak birleştirilmeye çalışılır. Bu ilk MVP yaklaşımıdır; profesyonel sürümde kuyruk sistemi, ilerleme durumu ve hata tekrar denemesi eklenmelidir.

## PDF notları

- Normal metin PDF'leri çalışır.
- Taranmış/görsel PDF'ler için OCR gerekir. Bu starter içinde OCR yoktur.
- Telifli kitapları izinsiz şekilde uygulamaya almak hukuki risk oluşturur. Kendi içeriklerin, lisanslı içerikler veya kamu malı eserler kullanılmalıdır.

## Önerilen sonraki adımlar

1. Admin login ekleme
2. Çocuk modu için ebeveyn kilidi
3. Kapak görseli yükleme
4. Favoriler ve dinleme geçmişi
5. Abonelik/freemium alanları
6. İçerik onay akışı
7. OCR desteği
8. Daha gelişmiş seslendirme senaryosu üretimi


## Localde sadece açık renk / boş ekran gelirse

Admin veya mobil web ekranında sadece açık renk zemin görüyorsan normalde üstte başlık ve kartlar da görünmelidir. Aşağıdaki sırayla kontrol et:

1. Backend çalışıyor mu?

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

Tarayıcıda şunu açınca JSON cevap gelmeli:

```text
http://localhost:5055/api/health
```

2. Admin paneli ayrı terminalde çalıştır:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\admin
npm install
npm run dev
```

Admin adresi:

```text
http://localhost:5175
```

3. Mobil web için ayrı terminalde çalıştır:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
npm install
npm run web:clear
```

4. Telefonda test ederken `.env` içindeki `localhost` yerine bilgisayarın IPv4 adresini yazman gerekir.

```env
EXPO_PUBLIC_API_BASE_URL=http://BILGISAYAR_IP_ADRESIN:5055/api
```

---

## v5 - Kapak, favoriler ve dinleme geçmişi

Bu pakette eklenenler:

- Admin panelden içerik için kapak görseli yükleme
- Mobil uygulamada kapak görsellerini gösterme
- Mobilde favorilere ekleme / favoriden çıkarma
- Mobil oynatıcıda dinleme ilerlemesini backend'e kaydetme
- Mobil ana ekranda “Kaldığın yerden devam et” alanı
- Mini player içindeki hatalı kapanan Pressable etiketi düzeltildi

### Güncelleme sonrası önerilen başlatma

Backend:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm install
npm run dev
```

Admin:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\admin
npm install
npm run dev
```

Mobil web:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
npm install
npm run web:clear
```

### Kapak görseli ekleme

1. Admin panelde bir içerik seç.
2. “Kapak görseli” alanından JPG/PNG/WebP dosyası seç.
3. “Kapak yükle” butonuna bas.
4. Mobil uygulamada içerik kartında ve detay ekranında kapak görseli görünür.

### Favori ve dinleme geçmişi

Bu MVP'de henüz gerçek kullanıcı girişi olmadığı için mobil uygulama varsayılan olarak `profile_id = 1` kullanır. Kullanıcı/profil sistemi geldiğinde bu değer aktif kullanıcı profiline bağlanacak.

## Telefon QR ile local test

Bu sürümde telefon testi için hazır dosyalar eklendi:

- `START_BACKEND.bat`
- `START_ADMIN.bat`
- `START_QR_TELEFON.bat`
- `START_QR_TELEFON_TUNNEL.bat`
- `TELEFON_QR_KURULUM.md`

Sıra:

1. `START_BACKEND.bat` çalıştır.
2. `START_QR_TELEFON.bat` çalıştır.
3. Telefona Expo Go kur.
4. QR kodu okut.

Telefon ve bilgisayar aynı Wi-Fi ağında olmalıdır. Bağlantı olmazsa `START_QR_TELEFON_TUNNEL.bat` ile tunnel modunu deneyebilirsiniz.

## v8 - Profil ve ebeveyn kilidi notları

Bu sürümde mobil uygulamaya profil seçimi eklendi.

Hazır gelen profiller:

- Minik Dinleyici: çocuk profili, PIN istemez
- Yetişkin: yetişkin profili, varsayılan PIN `0000`
- Aile: aile profili, varsayılan PIN `0000`

Mobil uygulama artık seçilen profile göre favorileri ve dinleme geçmişini ayrı tutar. Yetişkin ve aile profillerine geçerken PIN sorulur. Bu PIN sistemi local MVP için basit tutulmuştur; yayına çıkmadan önce hash'li saklama, kullanıcı hesabı ve gerçek ebeveyn doğrulama akışı eklenmelidir.

Telefon testinde Expo Go SDK uyarısı almamak için mobil proje SDK 54 paketlerine güncellenmiştir. Gerekirse mobil klasörde şu komutu çalıştırın:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
npx expo install --fix
```

Telefon için önerilen çalıştırma:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://BILGISAYAR_IP_ADRESI:5055/api"
npx expo start --tunnel --clear
```

## v16 Notu - Admin Kütüphane Yönetimi

v16 ile admin panelde kategori ekle/sil/düzenle, içerik silme, bölüm silme, içerik bilgilerini düzenleme ve “Kütüphaneye al” akışı eklendi. PDF yüklenen içerikler önce taslak olarak kalır; kontrol ve ses üretiminden sonra kütüphaneye alınır.

## v18 Notu - Global Kütüphane ve Profil Bazlı Kullanım

v18 ile kütüphane global hale getirildi. Admin panelden kütüphaneye alınan tüm yayınlanmış içerikler bütün profillerde görünür. Favoriler ve dinleme geçmişi ise her profile özeldir. Mobilde Kütüphane, Favoriler ve Geçmiş sekmeleri aktif çalışır. Profil silme, geçmiş istatistikleri, 10 saniye ileri/geri ve sonraki bölüm kontrolleri eklendi.

## v19 Notu

v19 ile mobilde arama/sıralama, admin panelde içerik arama ve yayın kontrol listesi eklendi. Kütüphane global, favoriler ve geçmiş profil bazlı çalışmaya devam eder.

## v21 - Mobil Player İyileştirme

Mobil uygulamada oynatma hızı, otomatik sonraki bölüm ve daha okunur mini player eklendi. İçerik detayında “Oynatma seçenekleri” alanından otomatik geçiş açılıp kapatılabilir.

---

## v29 - Store Hazırlık Paketi

Bu sürümde uygulamaya store hazırlığı için şu dosyalar eklendi:

- Uygulama ikonu ve splash görseli
- Expo store kimlik ayarları
- EAS build ayarları
- Google Play metadata taslağı
- App Store metadata taslağı
- Gizlilik politikası taslağı
- KVKK aydınlatma metni taslağı
- Çocuk güvenliği politikası
- Google Play Data Safety çalışma notu
- Store yayın kontrol listesi
- Android APK/AAB build komutları

Store build almadan önce production API URL'i ve gerçek gizlilik politikası URL'i girilmelidir.

## v30 - Ağ ve Production API Mantığı

Local testte mobil uygulama bilgisayarının yerel IP adresine bağlanır. Örneğin:

```text
http://172.16.200.58:5055/api
```

Bu sadece aynı Wi-Fi / aynı yerel ağ için uygundur. Uygulama store'a çıktığında veya dış kullanıcılar kullanacağında backend internette HTTPS adresinde olmalıdır:

```text
https://api.seslisahne.com/api
```

Production API URL ayarı için:

```powershell
.\SET_PRODUCTION_API_URL.bat
```

Ayrıntılar için `deploy/` klasörüne bak.
