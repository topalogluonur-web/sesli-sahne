# Sesli Sahne - Telefon QR Test Kurulumu

Bu adım Expo Go ile telefondan local uygulamayı görmek içindir.

## 1) Backend açık olmalı

Windows'ta ana klasörde `START_BACKEND.bat` dosyasına çift tıklayabilirsiniz.

Alternatif komut:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

Backend terminalinde şuna benzer bir satır görmeniz gerekir:

```text
Telefon/LAN için: http://192.168.1.25:5055
```

## 2) Telefona Expo Go kurun

- iPhone: App Store > Expo Go
- Android: Google Play > Expo Go

## 3) QR ekranını açın

Ana klasörde `START_QR_TELEFON.bat` dosyasına çift tıklayın.

Alternatif komut:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
npm run phone
```

Bu komut otomatik olarak `mobile/.env` dosyasına bilgisayarınızın yerel IP adresini yazar ve Expo QR kodunu açar.

## 4) QR kodu telefondan okutun

Telefon ve bilgisayar aynı Wi-Fi ağında olmalıdır.

Bağlantı olmazsa:

1. Windows Güvenlik Duvarı Node.js için izin istiyorsa Allow/İzin ver deyin.
2. Telefonun aynı Wi-Fi ağına bağlı olduğundan emin olun.
3. Backend terminalindeki `Telefon/LAN için` adresini telefondaki tarayıcıdan açmayı deneyin: `http://IP:5055/api/health`
4. Aynı ağda hâlâ açılmıyorsa `START_QR_TELEFON_TUNNEL.bat` ile tunnel modunu deneyin.
