# Sesli Sahne Deploy Planı

## Faz 1 - Küçük beta

Amaç: Uygulamayı birkaç test kullanıcısına açmak.

Teknik yapı:

- Backend: Node.js Express
- Database: SQLite, ama persistent disk ile
- Uploads: Aynı backend sunucusunda persistent disk
- Admin: Vite build / static hosting
- Mobile: Expo / Android preview build

Bu faz hızlıdır ama büyük ölçek için ideal değildir.

## Faz 2 - Sağlam production

Teknik yapı:

- Backend: Node.js Express
- Database: PostgreSQL
- Uploads: Cloud storage, örneğin S3 uyumlu storage
- CDN: Ses ve kapak dosyaları için CDN
- Admin: Ayrı static hosting
- Mobile: Production API URL ile AAB/IPA build

## Production API URL mantığı

Local:

```text
http://172.16.200.58:5055/api
```

Production:

```text
https://api.seslisahne.com/api
```

Mobil uygulamanın production build'i production API URL ile hazırlanmalıdır.

## Deploy öncesi minimum kontrol

- Admin şifresi değiştirildi mi?
- JWT secret değiştirildi mi?
- CORS domainleri belirlendi mi?
- Upload klasörü kalıcı mı?
- Database yedek stratejisi var mı?
- Gizlilik/KVKK metni hazır mı?
- Çocuk güvenliği politikası hazır mı?
