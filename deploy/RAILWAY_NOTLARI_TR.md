# Railway ile yayınlama notları

Railway kullanacaksan backend için Dockerfile hazırdır.

1. Yeni bir Railway project oluştur.
2. GitHub repo bağla veya dosyaları repo olarak yükle.
3. Servis root olarak proje ana klasörünü seç.
4. Dockerfile path: `backend/Dockerfile`.
5. Environment variables kısmına `deploy/BACKEND_ENV_CLOUD.example` içeriğini kendi şifrelerinle gir.
6. Persistent storage/disk için Railway volume ekle:
   - `/app/data`
   - `/app/uploads`
7. Deploy sonrası verilen URL şöyle olur:
   - `https://...up.railway.app/api`
8. Bu URL'yi mobil/admin production API olarak gir.

Önemli: SQLite ve uploads klasörü kalıcı disk/volume olmadan silinebilir. Mutlaka volume bağla.
