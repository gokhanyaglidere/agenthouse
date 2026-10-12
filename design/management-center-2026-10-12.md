# Yönetim merkezi — 12 Ekim 2026

Menü → Yönetim merkezi: bekleyen yanıtlar, sistem sağlığı, proje izinleri, kurtarma.

- Bekleyen yanıtlar yalnızca canlı waiting sinyallerinden ve waiting görevlerden gelir. Son araç/dosya kaydı gösterilir; bu kayıt izin sorusunun tam metni sayılmaz. Yanıt ilgili Claude terminalinde verilir. Harici CLI oturumlarının kontrol sınırı korunur.
- Sağlık ekranı mevcut bağlantı, envanter, bildirim teslimatları ve son Claude kontrol zamanını gösterir. Açarken ücretli model çağrısı veya bildirim göndermez.
- Proje izni, yeni görev ve konuşma oluşturmayı sunucuda engeller. İzin proje başına 0600 dosyada saklanır; bozuk kayıt kapalı kabul edilir. Mevcut işler, bekleyen kuyruklar, terminal yanıtları ve dış CLI süreçleri devam eder. Bu bir dosya sistemi sandbox'ı değildir.
- Kurtarma başarısız/durdurulmuş işin son durumuna ve aynı konuşmaya götürür. Otomatik yeni görev veya retry oluşturmaz; mevcut SessionManager tek terminal sahipliği/kurtarma mekanizması kullanılır.
- Yeni görev ekranında hata araştırma, inceleme, geliştirme ve içerik şablonları vardır. Uygulama taslağı değiştirir, işi göndermez. Mevcut taslağın değişeceği açıkça belirtilir.
- Sonuçlanan görevlerin ayrıntısında sonuç paketi: son çıktı, düzenleme aracı kaydı olan dosyalar, test komutlarının kaydedilmiş çıkışları, açık iş kayıtları, kapsam ve indirilebilir metin raporu. Eksik test/dosya kaydı başarı veya sıfır değişiklik kanıtı değildir.

Doğrulama: 133 backend testi, 44 UI testi ve derleme geçti. İki proje içeren HTTP fixture, bir projeyi kapatınca yeni görev ve konuşmanın reddedildiğini, diğer projenin açık kaldığını ve izleyicinin izin değiştiremediğini doğruladı. Canlı panelde şablon taslağa uygulandı ve test taslağı temizlendi; görev gönderilmedi. Mevcut geçmiş görevde sonuç paketi ve rapor indirme düğmesi görüldü. Mobil yönetim penceresinin başlığını örten katman hatası düzeltildi.

## İlk sürümün güvenlik sınırları (sonraki geçişle güncellendi)

- Dosya/araç başına proje izinleri ve yayınlama/silme için ayrı, sunucuda zorunlu onay kapıları henüz uygulanmadı. Claude varsayılan izin modu ve proje kuralları geçerli. Bu kurallar için terminal içindeki serbest komutlar, alt ajanlar ve dış CLI süreçlerini kapsayan bir tehdit modeli ve uygulama gereklidir; yalnızca prompt eklemek güvenlik uygulaması sayılmaz.
- İzin sorusunun yapılandırılmış tam metnini ve etkilenecek dosyaları alıp doğrudan güvenli onay verme henüz yok; canlı terminale yönlendirme vardır.
- Gerçek cihaz push/dikte/klavye testleri kullanıcı tarafından sonraya bırakıldı. Slack/finans entegrasyonları beklemede.

Güncel araç izinleri, tek kullanımlık onay ve sandbox uygulaması: [12 Ekim güvenlik geçişi](security-and-polish-2026-10-12.md). Yukarıdaki ilk sürüm sınırları tarihsel kayıttır; yeni korumalı oturumlarda bu geçiş uygulanır.
