# v20 - İçerik Kalite ve Yayın Akışı

Bu sürümde odak ses motorundan önce yayıncı/admin akışını sağlamlaştırmaktır.

## Eklenenler

### Admin / Yayıncı paneli
- İçerik kalite durumu: Eksik / Hazır / Yayında
- İçerik listesinde kalite rozeti
- Yayın kontrol listesi güçlendirildi
- Kütüphaneye alırken başlık, açıklama, kategori, kapak, bölüm ve ses eksikleri kontrol edilir
- Eksiklerle yayına alma için ayrıca onay gerekir
- Bölüm sırasını yukarı/aşağı taşıma
- Bölümü ikiye bölme
- Bölümü sonraki bölümle birleştirme
- Bölme/birleştirme sonrası ses dosyası temizlenir; ilgili bölüm yeniden seslendirilmelidir

### Backend
- `/api/contents/:id/quality` kalite raporu endpoint'i eklendi
- `/api/episodes/:id/move` bölüm taşıma endpoint'i eklendi
- `/api/episodes/:id/split` bölüm bölme endpoint'i eklendi
- `/api/episodes/:id/merge-next` sonraki bölümle birleştirme endpoint'i eklendi
- `/api/history/content/:contentId` profil bazlı kitap ilerleme endpoint'i eklendi

### Mobil uygulama
- İçerik detayında kitap ilerlemesi görünür
- “Kaldığın yerden devam et” butonu eklendi
- “Baştan başla” butonu eklendi
- Bölüm satırlarında dinlenen süre ve mini ilerleme çubuğu görünür
- Kitap ilerleme yüzdesi gösterilir

## Akış

PDF yükle → Bölümleri düzenle/sırala/böl/birleştir → Kapak/kategori/açıklama kontrolü → Ses üret → Kütüphaneye al → Mobilde ilerleme/favori/geçmiş çalışır.
