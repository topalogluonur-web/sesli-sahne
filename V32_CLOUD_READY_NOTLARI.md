# v32 - Cloud Ready / Her Ağda Çalışma Hazırlığı

Bu sürüm, Sesli Sahne'yi local Wi-Fi bağımlılığından çıkarıp cloud'a taşımaya hazırlar.

## Eklenenler

- Backend Dockerfile
- Docker Compose local cloud testi
- Render Blueprint taslağı
- Railway deploy notları
- VPS/Docker deploy notları
- Domain + SSL notları
- Production API URL ayarlama scripti
- Admin ve mobil production preview scriptleri
- Cloud environment örnekleri

## Önemli ayrım

Local kullanım:

```text
Telefon -> Bilgisayar IP'si -> Backend
Aynı ağ gerekir.
```

Cloud kullanım:

```text
Telefon -> İnternet -> Cloud backend
Her ağda çalışır.
```

## İlk gerçek cloud hedefi

Demo için en pratik yol:

1. Backend'i Render/Railway/VPS üzerinde yayınla.
2. Production API URL al.
3. `SET_CLOUD_API_URL.bat` çalıştır.
4. Mobil uygulamayı cloud API ile test et.
5. Sonra Android build al.

## Uyarı

SQLite + uploads ile demo yapılabilir. Gerçek store/çok kullanıcı için daha sonra PostgreSQL + cloud storage önerilir.
