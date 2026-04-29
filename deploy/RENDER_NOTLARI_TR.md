# Render ile yayınlama notları

Render için `deploy/RENDER_BLUEPRINT.yaml` ve `backend/Dockerfile` hazırlandı.

## En hızlı yol

1. Projeyi GitHub'a yükle.
2. Render > New > Blueprint seç.
3. Repo'yu seç.
4. Blueprint dosyası olarak `deploy/RENDER_BLUEPRINT.yaml` kullan.
5. `ADMIN_PASSWORD` değerini güçlü bir şifre yap.
6. Deploy tamamlanınca backend URL'ni al:
   - örnek: `https://sesli-sahne-api.onrender.com/api`
7. Bu URL'yi admin ve mobile tarafına production API olarak yaz.

## Kalıcı dosyalar

Blueprint içinde `/app/data` için disk var. Ancak uploads için ayrıca disk/volume planı gerekir. Üretim için önerilen yapı:

- SQLite kısa demo için: `/app/data`
- Kapak/ses/PDF dosyaları için: `/app/uploads` persistent disk veya S3/R2 storage

Gerçek kullanıcıya açmadan önce uploads dosyalarını cloud storage'a taşımak daha sağlıklı olur.
