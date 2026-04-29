# Local Ağ ve Cloud Kullanım Farkı

## Local geliştirme

Local geliştirmede backend şu bilgisayarda çalışır:

```text
C:\Users\Onurt\Desktop\sesli-sahne\backend
```

Bu yüzden mobil uygulamanın API adresi şuna benzer olur:

```text
http://172.16.200.58:5055/api
```

Bu adres sadece aynı ağdaki cihazlar için anlamlıdır. Ev/ofis Wi-Fi değişirse IP değişebilir. Telefon mobil veriye geçerse bu adres çalışmaz.

## Production / Cloud kullanım

Cloud'a çıkınca backend şu mantıkta gerçek bir internet adresine sahip olur:

```text
https://api.seslisahne.com/api
```

veya başlangıçta:

```text
https://sesli-sahne-backend.onrender.com/api
```

Mobil uygulama bu adresle build edilirse kullanıcı:

- Ev Wi-Fi,
- ofis Wi-Fi,
- mobil veri,
- başka ülke/ağ

fark etmeksizin uygulamayı kullanabilir.

## Kısa cevap

Store'a çıkacak uygulama için cevap: Evet, kullanıcı hangi ağa bağlıysa çalışır; çünkü backend internet üzerinde olur.

Local test için cevap: Hayır, local IP ile çalışırken telefon genelde aynı Wi-Fi'da olmalı.
