# Android / iOS Build Rehberi

## Android Preview APK

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\BUILD_ANDROID_PREVIEW_APK.bat
```

## Android Store AAB

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\BUILD_ANDROID_AAB.bat
```

## Gerekenler

- Expo hesabı
- EAS CLI
- Android package: `com.seslisahne.app`
- Version code: `1`
- Uygulama adı: `Sesli Sahne`

## Production API Notu

Store build almadan önce mobil uygulamanın API adresi production backend adresine çevrilmelidir. Local IP (`172.16...`) store build için uygun değildir.
