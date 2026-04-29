# Sesli Sahne - Store Hazırlık Özeti

Bu paket, uygulamayı Google Play ve App Store sürecine hazırlamak için oluşturuldu.

## Hızlı başlangıç

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

Mobil local:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://172.16.200.58:5055/api"
npx expo start --lan --clear
```

## Store dosyaları

- `mobile/app.json`: uygulama adı, ikon, splash, Android/iOS bundle bilgileri
- `eas.json`: EAS build ayarları
- `store/`: store metinleri, gizlilik, KVKK, çocuk güvenliği, build rehberi
- `BUILD_ANDROID_PREVIEW_APK.bat`: test APK
- `BUILD_ANDROID_AAB.bat`: Google Play AAB build

## Önemli production notu

Store'a çıkmadan önce local IP yerine production API kullanılmalıdır. Local ağ adresi (`172.16...`) mağaza sürümünde çalışmaz.

Production için yapılacaklar:

1. Backend'i internete açık bir sunucuya taşı.
2. Production API URL'ini mobil uygulamaya yaz.
3. Ses ve kapak dosyaları için kalıcı storage kullan.
4. Gizlilik politikası URL'ini yayınla.
5. Google Play ve App Store formlarını gerçek veri davranışına göre doldur.
