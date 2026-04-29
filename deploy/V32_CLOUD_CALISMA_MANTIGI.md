# v32 - Cloud çalışma mantığı

Local testte telefon uygulaması bilgisayarındaki backend'e bağlanır:

```text
http://172.16.200.58:5055/api
```

Bu yüzden aynı Wi-Fi/ağ gerekir.

Cloud deploy sonrası mobil uygulama internetteki backend'e bağlanır:

```text
https://api.seslisahne.com/api
```

Bu durumda kullanıcı hangi ağa bağlı olursa olsun çalışır:

- Ev Wi-Fi
- Ofis Wi-Fi
- Mobil veri
- Farklı ülke/şehir

Şart: Backend sunucusu çalışıyor olmalı ve API URL uygulamaya doğru yazılmış olmalı.
