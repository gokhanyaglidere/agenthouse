# BiBilen panel arayüz kontrolü

## Sorun ve düzeltme

Native Pixel Agents'ın evrensel piksel font kuralı panel çocuklarına da uygulanıyordu. Panel köküne normal font atamak yeterli olmuyordu. Panel kapsamındaki font kuralları ayrıldı; oyun dünyasının piksel görünümü korundu.

Panel metinleri çoğunlukla 14–16 px, ekip başlıkları 17 px, form alanları 16 px. Butonlar en az 44 px yüksekliğinde; mobil gezinme butonları 56 px. Simgeler SVG ile tutarlı hale getirildi. Kontrast, kenarlıklar, odak ve devre dışı durumları ortak kurallara bağlandı.

Mobilde ortadaki taşan görev düğmesi kaldırıldı; yeni görev üst başlıkta. Ofis kontrolleri dar ekranda iki satır. Ofis tuvali ölçülen görünüm çerçevesine göre yerleşiyor. 480 px ve daha kısa ekranlarda özet ve ekip şeridi gizlenerek tuvale alan ayrılıyor.

Ekip açıklamaları kısa Türkçe iş tanımlarına dönüştürüldü. Arama yetenek anahtarlarını da kapsıyor; sonuç yoksa açıklama gösteriliyor. Pencereler Escape ile kapanıyor ve uzun ayarlarda başlık erişilebilir kalıyor.

Testlerde ortaya çıkan başlangıç oturma çakışması düzeltildi: bağlı oturumların rol/masa eşleşmesi, boşta duran karakterlerin oluşturulmasından önce tamamlanıyor. Test, yanlış başlangıç masasını açıkça kullanarak bu durumu doğruluyor.

## Canlı kontrol

- 320×640: form alanı 16 px; yatay taşma yok, kontroller en az 44 px.
- 390×844: ekip kartları, dört öğeli alt menü, tam ofis ve iki satır ofis kontrolleri.
- 768×1024: hibrit tuval 744×507 px.
- 844×390: kısa ekran düzeltmesiyle tuval 820×132 px.
- 1440×900: üç sütun ekip kartları, yan gezinme ve hibrit tuval 1288×428 px.
- Yetenek araması `remotion` içerik üreticisini buldu; olmayan sorgu boş sonuç açıklamasını gösterdi.
- Ayarlar Escape ile kapandı. Bu kontrol sırasında görev gönderilmedi ve Claude bağlantı probu çalıştırılmadı.

Ekran kayıtları: `panel-team-mobile-final.jpg`, `panel-team-desktop-final.jpg`, `panel-office-mobile-final.jpg`, `panel-office-desktop-final.jpg`, `panel-office-landscape-final.jpg`.

## Doğrulama sonucu

Üretim TypeScript/Vite derlemesi başarılı. UI testleri 9/9, görev yürütme ve erişim testleri 23/23 geçti. Ajan sistemi denetimi 35 uzman tanımını, şef/uzman listesini, modelleri, tur sınırlarını, araç izinlerini, yönlendirmeleri ve hook dosyalarını doğruladı. Canlı servis yeniden başlatıldı ve güncel arayüz özel Tailscale adresinde kontrol edildi.

Bu çalışma panel okunabilirliği ve yerleşimine odaklanır; tüm erişilebilirlik standartları için eksiksiz uygunluk iddiası değildir.
