# v30 - Cloud / Deploy Hazırlığı

Bu sürüm, local geliştirme ile dış dünyaya açık kullanım arasındaki farkı netleştirmek için hazırlandı.

## En önemli cevap

- Local kullanımda backend senin bilgisayarında çalışır. Telefonun uygulamayı görebilmesi için genelde aynı Wi-Fi / aynı yerel ağ gerekir.
- Cloud/deploy sonrası backend internette HTTPS adresinde çalışır. Mobil uygulama bu production API adresine bağlanırsa kullanıcı hangi ağa bağlı olursa olsun uygulama çalışır.
- Store'a çıkacak mobil uygulamada `localhost` veya `172.16...` gibi ev/ofis IP adresleri kullanılmaz. Bunlar sadece local test içindir.

## v30'da eklenenler

- `deploy/LOCAL_VS_CLOUD_AG_ACIKLAMASI.md`
- `deploy/DEPLOY_PLAN_TR.md`
- `deploy/BACKEND_ENV_PRODUCTION.example`
- `deploy/ADMIN_ENV_PRODUCTION.example`
- `deploy/MOBILE_ENV_PRODUCTION.example`
- `deploy/PRODUCTION_CHECKLIST_TR.md`
- `deploy/STORAGE_AND_DATABASE_PLAN_TR.md`
- `SET_PRODUCTION_API_URL.bat`
- `START_ADMIN_WITH_PRODUCTION_API.bat`
- `START_MOBILE_WITH_PRODUCTION_API.bat`

## Önerilen sonraki teknik adım

v31'de backend'i gerçek deploy yapısına daha yakın hale getirmek:

1. SQLite + local uploads ile küçük beta ortamı
2. Sonra PostgreSQL + cloud storage
3. Sonra production Android build

