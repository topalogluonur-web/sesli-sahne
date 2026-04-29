# v28 - Kullanıcı Hesabı + Profil Senkron Mantığı

Bu sürüm mobil tarafı dışa açılabilir yapıya yaklaştırır.

## Eklenenler

- Mobil uygulama açılışında kullanıcı girişi / yeni hesap ekranı.
- Demo kullanıcı:
  - E-posta: `demo@seslisahne.local`
  - Şifre: `0000`
- Backend tarafında `user_accounts` ve `user_sessions` tabloları.
- Yeni kullanıcı oluşturunca otomatik üç profil oluşur:
  - Çocuk Profili
  - Yetişkin
  - Aile
- Profil listesi artık giriş yapan kullanıcıya göre filtrelenir.
- Her kullanıcının profilleri, favorileri ve geçmişi ayrı kalır.
- Kütüphane global kalır: adminin kütüphaneye aldığı içerikleri tüm kullanıcılar görür.

## Önemli

Bu sürüm local/demo oturum mantığıdır. Store'a çıkmadan önce kalıcı token saklama, şifre sıfırlama, e-posta doğrulama ve KVKK/onay ekranları eklenmelidir.
