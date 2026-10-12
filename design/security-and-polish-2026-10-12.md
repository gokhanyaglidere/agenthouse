# Agent House — koruma, onay ve görsel tutarlılık

12 Ekim 2026. Kurulu Claude Code: 2.1.296. Asgari destek: onFailure:block için 2.1.295. Kaynaklar:
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/sandboxing

## Uygulanan koruma

Yeni panel görevleri, broker ile başlatılan/yeni süreçte devam ettirilen konuşmalar ve panel konsolu --restricted ve özel --settings ile başlar. Dış MCP yapılandırması otomatik yüklenmez; izin bypass moduyla eski native launchAgent yolu kapatılır. Eski süreçlere attach işlemi mevcut sürece hook eklemez; dış CLI süreçleri bu katmanın kapsamı dışındadır.

Proje bazında korumalı geliştirme ve salt okunur seçenekleri, kapalı klasör/araç listeleri ve ağ alan adları bulunur. Native Read/Edit deny kuralları ve çalışma klasörü sınırlaması, hook yol denetimi, symlink gerçek yol çözümü, gizli dosya/ayar engelleri birlikte uygulanır. Bash için sandbox etkin, autoAllowBashIfSandboxed=false, failIfUnavailable=true, allowUnsandboxedCommands=false, boş excludedCommands; kapalı ve kimlik bilgisi yolları sandbox listelerinde; kimlik bilgisi ortam değişkenleri sandbox alt süreçlerinden kaldırılır. Korumayı değiştirebilecek uygulama dosyaları sandbox içinde yazılamaz.

Tüm Bash çağrıları ve izin gerektiren diğer araçlar tek kullanımlık onay bekler. Yayınlama/silme regex ile tahmin edilip serbest bırakılmaz; tam komut onaylanır. Onay 120 saniyede dolar, bir kez tüketilir, proje anahtarı ile hook endpoint'i doğrulanır, karar endpoint'inde yönetici ve origin kontrolleri gerekir. Araç girdisi ve bilinen dosya yolları Yönetim → Bekleyen yanıtlar'da gösterilir. Arbitrary kabuk komutunun bütün dosya etkilerini garanti olarak çıkarmak mümkün değildir; UI bunu açıkça belirtir.

Araç politikasının revizyonu her yeni hook yapılandırmasına bağlanır. Yalnızca yeni iş başlatma anahtarını kapatmak mevcut araç politikasını değiştirmez. Politika değişince eski korumalı hook istemcileri yeni araç çağrılarını çalıştırmaz; eski onaylar kullanılamaz. Aynı geçmiş yeni korumalı süreçte açılmalıdır. Zaten başlamış araç çalışmasını bu mekanizma geri alamaz. Hook/client/config erişimi başarısızsa deny veya onFailure:block kullanılır. Bekleyen istek sayısı proje başına en çok 64, karar geçmişi 100 kayıttır. Anahtar ve hook ayarları private state altında 0600 izinlerle tutulur, Git'e eklenmez.

## Doğrulama

- 138 backend, 46 UI testi ve üretim derlemesi başarılı.
- Traversal, symlink, gizli dosya, kapalı yol/araç, salt okunur yazma/komut, bozuk veya eksik koruma, token ayrımı, süre dolması, tekrar kullanım, revizyon değişmesi testleri.
- İki proje HTTP fixture: başka proje anahtarı ve izleyici onay veremez; tam istek görüntülenir; onay bir kez tüketilir. Model veya gerçek komut çalıştırılmaz.
- Gerçek hook client HTTP fixture'da PreToolUse/PermissionRequest JSON üretir; servis kapalıysa deny döner.
- Kurulu gerçek Claude --init-only ile oluşturulan restricted/settings yapılandırmasını kabul etti (exit 0); model çağrısı yapılmadı. İlk kontrolde boş MCP JSON biçimi hatası yakalanıp mcpServers:{} olarak düzeltildi ve regresyon kontrolü eklendi.
- 100 oturum/10.000 üyelik sentetik metadata senaryosu: 20 tekrar, son ölçüm p95 yaklaşık 0.51ms, maksimum yaklaşık 1.27ms. Bu gerçek 100 CLI sürecinin, ağın veya canvas FPS'sinin testi değildir.

## Ofis

Cam bölme ve kapı world-pixel ölçüleri tek modülde ortaklaştırıldı. Ön kapı ve yan kapı çerçeveleri, toplantı odasının kayan cam yaprakları ve köşe profilleri aynı malzeme/ölçü diline getirildi. CEO kapısı kilitli kalır; diğer ajanların erişim kuralı değişmedi. Kullanıcının mobilya konumları değiştirilmeyen mevcut yerleşim ve çarpışma testleri korundu.

## Sınırlar

Bu, aynı işletim sistemi hesabına tam yetkili kişiye karşı bağımsız güvenlik sınırı değildir. Yeni korumalı oturumları yönetir; dış ve zaten açık CLI süreçlerini ele geçirip dönüştürmez. Gerçek ücretli Claude araç çağrısından panel onayına uçtan uca canlı kabul testi yapılmadı; init-only ayar kabulü ve gerçek hook istemcisi/HTTP akışı test edildi. macOS sandbox'ın gerçek araç çalıştırırken işletim sistemi reddi bu geçişte ayrı bir adversarial testle ölçülmedi. Fiziksel cihaz testleri kullanıcı tarafından ertelendi; Slack/finans kapsam dışı bırakılmıştır.
