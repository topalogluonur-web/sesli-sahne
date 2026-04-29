# v29 - Store Hazırlık Paketi

Bu paket, Sesli Sahne uygulamasını Google Play / App Store sürecine hazırlamak için gerekli temel dosyaları ve ayarları ekler.

## Eklenenler

- Expo `app.json` store kimlik ayarları güncellendi.
- `eas.json` eklendi.
- Uygulama ikonu ve splash görseli eklendi.
- Android production AAB build komutu eklendi.
- Store metinleri, gizlilik/KVKK taslakları ve çocuk güvenliği dosyaları eklendi.
- Google Play Data Safety çalışma notu eklendi.
- App Store / Google Play metadata taslakları eklendi.

## Önemli

Bu paket store'a **hemen yüklenebilir son sürüm** değildir; store başvurusu öncesi gerekli metinleri ve build altyapısını hazırlar.

Store'a çıkmadan önce özellikle şu başlıklar kesinleştirilmeli:

1. Gerçek şirket/geliştirici adı
2. Destek e-postası
3. Gizlilik politikası URL'i
4. KVKK aydınlatma metni URL'i
5. İçerik telif/lisans durumu
6. Çocuklara yönelik veri toplama beyanı
7. Google Play Data Safety formu
8. App Store yaş derecelendirme soruları
9. Android AAB production build
10. Test hesabı bilgileri

## Build komutları

Android test APK:

```powershell
.\BUILD_ANDROID_PREVIEW_APK.bat
```

Android Store AAB:

```powershell
.\BUILD_ANDROID_AAB.bat
```

Not: EAS build için Expo hesabı gerekecektir.
