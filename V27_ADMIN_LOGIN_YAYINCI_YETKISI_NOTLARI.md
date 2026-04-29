# Sesli Sahne v27 - Admin Login + Yayıncı Yetkisi

Bu sürümde admin/yayıncı paneli giriş korumalı hale getirildi.

## Varsayılan local giriş

- Kullanıcı adı: `admin`
- Şifre: `0000`

Girişten sonra sağ üstteki alandan şifre değiştirilebilir.

## Korumalı işlemler

Mobil uygulama tarafındaki kütüphane, profil, favoriler ve geçmiş açık kalır.
Aşağıdaki yayıncı işlemleri admin token ister:

- PDF yükleme
- İçerik oluşturma/düzenleme/silme
- Kategori ekleme/düzenleme/silme
- Bölüm düzenleme/silme/bölme/birleştirme
- Kapak ve ses dosyası yükleme
- TTS / ses üretimi
- İçeriği kütüphaneye alma

## Şifre sıfırlama

Localde admin şifresi karışırsa ana klasörde:

```powershell
.\RESET_ADMIN_PASSWORD.bat
```

Bu işlem `.env` içindeki `ADMIN_USERNAME` ve `ADMIN_PASSWORD` değerlerine göre admin hesabını sıfırlar.

## .env ayarları

```env
ADMIN_AUTH_ENABLED=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=0000
ADMIN_JWT_SECRET=local-dev-secret-change-me
ADMIN_TOKEN_TTL_HOURS=12
```

Dışa açmadan önce `ADMIN_PASSWORD` ve `ADMIN_JWT_SECRET` mutlaka değiştirilmeli.
