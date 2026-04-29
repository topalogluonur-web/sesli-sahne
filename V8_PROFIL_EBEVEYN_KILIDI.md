# Sesli Sahne v8 - Profil ve Ebeveyn Kilidi

Bu sürümün amacı çocuk/yetişkin/aile ayrımını daha gerçekçi hale getirmektir.

## Eklenenler

- Profil seçimi ekranı
- Çocuk, yetişkin ve aile profili
- PIN korumalı yetişkin/aile alanı
- Yeni profil oluşturma modalı
- Favorilerin profile göre ayrılması
- Dinleme geçmişinin profile göre ayrılması
- Uyku zamanlayıcı: kapalı / 5 / 10 / 15 / 30 dk
- Expo SDK 54 paket güncellemesi

## Varsayılan PIN

Yetişkin ve Aile profili için varsayılan PIN:

```text
0000
```

## Test sırası

1. Backend'i başlatın:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\START_BACKEND.bat
```

2. Telefonda backend kontrolü:

```text
http://BILGISAYAR_IP_ADRESI:5055/api/health
```

3. Mobil uygulamayı başlatın:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://BILGISAYAR_IP_ADRESI:5055/api"
npx expo start --tunnel --clear
```

4. Expo Go ile QR okutun.

## Yayına çıkmadan önce yapılacaklar

- PIN'leri düz metin yerine hash ile saklamak
- Kullanıcı hesabı ve abonelik modelini eklemek
- Çocuk profili için dış link ve satın alma akışlarını tamamen kapatmak
- Profil yönetimini ayrı ebeveyn paneline taşımak
- KVKK / gizlilik metinlerini hazırlamak
