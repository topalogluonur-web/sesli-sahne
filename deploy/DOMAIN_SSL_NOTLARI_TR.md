# Domain ve SSL planı

Production için hedef yapı:

```text
https://api.seslisahne.com/api      Backend API
https://admin.seslisahne.com        Admin panel
```

Mobil uygulama sadece API adresini kullanır:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.seslisahne.com/api
```

## DNS

- `api.seslisahne.com` → backend servis IP/host
- `admin.seslisahne.com` → admin web host

## SSL

Render/Railway gibi platformlarda SSL otomatik verilir.
VPS'te Caddy veya Nginx + Let's Encrypt kullanılabilir.
