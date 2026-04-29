# Database ve Dosya Saklama Planı

## Şu anki yapı

- Database: SQLite
- Kapak/ses/PDF dosyaları: backend/uploads klasörü

Bu local geliştirme için yeterlidir.

## Küçük beta için

- SQLite devam edebilir.
- Ama database ve uploads klasörü mutlaka persistent disk üzerinde olmalı.

Örnek:

```text
DATABASE_PATH=/data/sesli-sahne.sqlite
UPLOAD_ROOT=/data/uploads
```

## Production için önerilen yapı

- Database: PostgreSQL
- Dosyalar: S3 uyumlu cloud storage
- Ses dosyaları: CDN arkasında servis edilmeli

## Neden?

Ses dosyaları büyüyeceği için tek sunucuda local disk uzun vadede risklidir. Uygulama büyüdükçe dosyaları cloud storage'a taşımak gerekir.
