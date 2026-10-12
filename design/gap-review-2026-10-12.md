# Agent House — tüm sistem gap review

İncelenen sürüm: `736cff2` (2026-10-12). Bu çalışma bir incelemedir; üretim
uygulaması değiştirilmedi, servis yeniden başlatılmadı ve canlı işler durdurulmadı.

**Sonuç: 4 yüksek öncelikli bulgu, 3 orta öncelikli hata ve 1 koşullu tasarım
riski.** Mevcut 224 test başarılı; aşağıdaki senaryoların başarılı test sayısından
anlaşılamayan sınırları var. Düzeltmeler henüz yapılmadı.

## G-01 · P1 · Güvenlik ve oturum başlatma kodu yazma koruması eksik

Konum: `tool-guard.mjs:18` ve `ToolGuard.settings` içindeki aynı dosya listesi;
`terminal-broker.mjs:13` / `terminal-worker.mjs:5` başlatma zinciri.

Koruma yalnızca tool-guard.mjs, tool-guard-client.mjs, project-policy.mjs ve
server.mjs dosyalarını engelliyor. Agent House klasöründe çalışan korumalı bir
ajana access-policy.mjs, observer-sharing.mjs veya terminal-worker.mjs yazma
isteği verildiğinde sınıflandırıcı **normal** döndürüyor. Native deny/sandbox
listesinde de bu yeni güvenlik dosyaları yok.

Geçici tanılama, server.mjs için deny ve diğer üç dosya için normal döndüğünü
kanıtladı. Gerçek modelden dosya yazması istenmedi ve hiçbir güvenlik dosyası
bozulmadı. Yeni terminal başlatılırken çalışan worker dosyasının değiştirilmesi
sonraki başlatmanın güvenlik davranışını etkileyebilir; uygulama kendi kaynak
klasöründe de görev yürüttüğü için bu erişilebilir bir koruma eksikliğidir.
Bu, izleyicinin bugün terminal erişimi olduğu anlamına gelmez.

Çözüm: kritik kimlik/yetki/başlatma bağımlılıklarını ortak bir korunan kaynak
listesine al; hook ve native sandbox aynı listeyi kullansın. Hassas bileşenlerin
meşru geliştirmesi ayrı, insan tarafından gözden geçirilen bir akışta yapılmalı.
Kabul: korumalı ajanın tüm güvenlik bootstrap dosyalarına Edit/Write/Bash ile
müdahalesi reddedilir; normal ürün dosyaları için çalışma devam eder.

## G-02 · P1 · Proje oturum klasörü çakışınca yanlış geçmiş okunabiliyor

Konum: `session-manager.mjs:30`, `session-manager.mjs:68` ve `known/transcript`.

Klasör adı tüm alfanümerik olmayan karakterleri `-` yaparak türetiliyor. Aynı
üst dizindeki project-a ve project_a aynı kayıt dizinine eşleniyor. fileInfo
kaydın cwd bilgisini okuyor, fakat list() bunun seçili proje ile aynı olduğunu
kontrol etmiyor. known() bu listeye güvendiği için başka projenin transcript'i
okunabiliyor. Oturumu devam ettirme isteği de yanlış proje bağlamından
başlatılabilir; native CLI'nin bu durumda nasıl davrandığı bu incelemede test edilmedi.

Geçici JSONL fixture: iki adın normalleştirilmiş yolu eşit; B projesinin cwd
bilgisini taşıyan mesaj A'nın listesinde göründü ve A üzerinden transcript
okunabildi. Gerçek kullanıcı geçmişi bu denemede okunmadı.

Çözüm: native kayıt biçimiyle uyumlu kalırken kanonik cwd/proje kimliğini ve
kaynağın kapsamını doğrula; klasör adı tek başına yetki/kapsam kanıtı olmasın.
Kabul: çakışan isimler, worktree'ler ve yanlış cwd taşıyan kayıtlar için liste,
transcript, resume, arama ve paylaşım kaynak doğrulaması birbirine karışmaz.

## G-03 · P1 · Saklama sınırı çalışan görevi kalıcı kayıttan düşürebiliyor

Konum: `task-manager.mjs:122`, `task-manager.mjs:166`.

Görevler başa ekleniyor ve save() yalnızca ilk 250 görevi diske yazıyor; aktif
ve tamamlanan kayıtları ayırmıyor. Bir çalışan görevin önüne 250 görev eklendiğinde
aktif görev bellekte kalıyor fakat kaydedilmiyor. Yeniden başlatma bu görevin
izlenmesini, ilişkilendirilmesini ve çalışma sınırı hesabını kaybedebilir.

Geçici fixture: bellekte 251 görev, diskte 250 görev; çalışan görev diskte yok.
Hiçbir gerçek Claude çağrısı yapılmadı.

Çözüm: tüm bitmemiş işleri koru, yalnızca sonuçlanmış geçmişi yaş/sayı ile buda;
aşırı büyüyen kuyruğa açık bir kapasite sınırı ve görünür uyarı koy.
Kabul: 250'den fazla kayıt ve yeniden başlatma altında çalışan/bekleyen/sıradaki
hiçbir iş kaybolmaz; kapasite hesapları tutarlı kalır.

## G-04 · P1 · Yarım kalan proje kilidi servisin açılmasını engelleyebiliyor

Konum: `project-registry.mjs:35`, `server.mjs:44`.

register() boş bir .lock dosyası oluşturuyor ve sadece finally ile kaldırıyor.
Ani süreç sonlanması sonrasında kalan dosyada PID/süre bilgisi veya güvenli
stale-lock toparlama yok. Mevcut projeyi yeniden register etmek de bu kilide
takılıyor. Server başlangıcında register() zorunlu olduğu için bir kilit dosyası
bütün panelin yeniden açılmasını engelleyebilir.

Geçici registry fixture'da terk edilmiş kilit bırakıldığında zaten kayıtlı
projenin yeniden kaydı reddedildi. Üretim kilidine veya servise dokunulmadı.

Çözüm: sahip/süre bilgisiyle canlı kilit ile terk edilmiş kilidi ayır; yeniden
başlatma sırasında güvenli toparlanma uygula. Körlemesine canlı kilit silme yok.
Kabul: ani sonlanma sonrası tekrar açılabilir; iki canlı yazıcı güncelleme kaybetmez.

## G-05 · P2 · CLI alt süreçlerinde süre ve çıktı sınırı yok

Konum: `task-manager.mjs:66`, `listAgents`, `logs`, `pollOnce`.

run() stdout/stderr'i sınırsız biriktiriyor ve süreç kapanmadan tamamlanmıyor.
Takılan agents/logs çağrısı pollPromise'ı açık tutuyor; sonraki tick() aynı
promise'ı döndürdüğü için o çalışma alanının durum takibi ve ardından çalışan
schedule() ilerlemeyebilir. Tarayıcı isteğinin 30 saniyede bitmesi alt süreci
sonlandırmıyor. Çok büyük çıktı ayrıca bellek baskısı oluşturabilir.

Mock takılan çağrıda ikinci tick aynı çözümlenmeyen promise'ı döndürdü; source
kodunda bir timeout/max-output/süreç iptali bulunmuyor. Gerçek CLI takılmaya
zorlanmadı.

Çözüm: komut türüne göre süre/çıktı sınırı, iptal ve kontrollü geri çekilme;
izleme komutunun süresini doldurması asıl Claude işini öldürmemeli.
Kabul: takılan izleme çağrısından sonra sonraki polling/scheduling devam eder;
çok büyük çıktı sınırlanır, kesinti kullanıcıya doğrulanamayan durum olarak görünür.

## G-06 · P2 · Paylaşılan görevlerde kısa UUID ekip eşleşmesini bozuyor

Konum: `task-manager.mjs:258`, `server.mjs:212`.

Background başlatma sonucu görevde sekiz karakterli sessionId saklanıyor.
Observer state ise SessionManager'ın tam UUID taşıyan listesinde birebir eşitlik
arıyor. Bu nedenle paylaşılan görevde durum görünebilir, fakat çalışan kişiler
ve trace bulunmayabilir. Diğer görev/oturum yollarında kısa kimlik için özel
bağlama mevcut; izleyici yolu aynı normalizasyonu kullanmıyor.

Tanılama: 12345678 ile 12345678-1234-4234-8234-123456789012 birebir eşleşmiyor.
Bu source-kod uyumsuzluğudur; mevcut canlı bir izleyiciye yanlış veri gönderme
denemesi yapılmadı.

Çözüm: tek ortak, proje-kapsamlı oturum çözümleyicisi; mümkün olduğunda tam UUID
kalıcılaştırılsın. Aynı prefix'e sahip iki kayıt varsa rastgele seçilmesin.
Kabul: kısa kimlikli gerçek background görev, doğru tam oturum ve canlı ekip ile
bağlanır; yanlış proje/prefix çakışması reddedilir.

## G-07 · P2 · Ağ hatasında eski kota yüzdeleri ekranda kalıyor

Konum: `webview-ui/src/bibilen/IntegrationsPanel.tsx:11` ve `:14`.

Panel gerçekten 15 saniyede bir yenileme yapıyor; otomatik yenileme yok iddiası
bu incelemede elendi. Ancak getUsage veya onunla birlikte beklenen getIntegrations
isteği reddedildiğinde catch yalnızca error'ı güncelliyor. Önceki usage objesi
status=ready/expired=false olarak kalıyor; yüzdeler güncelmiş gibi render ediliyor.
Reset zamanını geçmiş olmak da yerel saatten yeniden hesaplanmıyor. Sunucunun
UsageMonitor hata gizleme davranışı, sunucuya hiç ulaşılamayan bu durumu kapsamıyor.

Bu bulgu kod üzerinden doğrulandı; canlı sağlayıcıya veya ağa kesinti verilmedi.
Çözüm: kullanım başarısı/hatasını diğer bağlantılardan ayır; hata ve eskime/reset
zamanında yüzde görünürlüğünü kapat. Başarılı yenilemede eski hata temizlensin.
Kabul: son başarılı değer sonrası ağ kesintisi ve reset geçişinde eski yüzde
ready olarak görünmez; entegrasyon hatası yeni kota sonucunu yutmaz.

## G-08 · P2 · Aynı projede eşzamanlı yazma işleri izole edilmiyor

Konum: `task-manager.mjs:253`, `schedule` ve `workspace-services.mjs:Admission`.

Eşzamanlı iki görev aynı this.cwd ile başlatılıyor. Hesap slotları ve workspace
kimliği görev başına worktree/dal veya dosya yazma kilidi oluşturmuyor. İki ajan
aynı dosyaları değiştirirse birbirinin sonucunu ezebilir; test ve diff çıktısı
iki işi karıştırabilir. sessionChanges çalışma alanı kapsamını dürüstçe belirtiyor,
fakat bu açıklama çakışmayı engellemiyor.

Fixture iki görevin aynı çalışma diziniyle başlatıldığını doğruladı. Gerçek bir
dosya çakışması üretilmedi: bu koşullu bir tasarım riskidir, yaşanmış veri kaybı
iddiası değildir.

Çözüm: Git projelerinde görev başına izole çalışma alanı ve gözden geçirilen
birleştirme; desteklenmeyen projelerde yazma işlerini sıraya alma. Çalışan gerçek
oturumları sessizce taşıma/durdurma yok.
Kabul: çakışan iki değişiklik izole kalır; birleştirme çatışması görünür ve çözülmeden
başarılı teslim/yayın sayılmaz.

## Kapsam ve olumlu kontroller

- Kimlik/yetki, proje/workspace bağlama, izleyici projeksiyonu ve erişim kaldırma,
  HTTP/WebSocket ayrımı, native başlatma/araç koruması incelendi.
- Oturum saklama/yeniden bağlama/devralma, görev başlatma/polling/kapasite ve
  arama/transcript/diff yolları gözden geçirildi.
- Bildirim kaydı/tekilleştirme/mahremiyet, kota kaynağı ve UI güncelliği,
  metadata yedeği/geri yükleme, arayüz taslakları ve hata akışları incelendi.
- İzleyici özel API ve terminal engelleri, bozuk izleyici kaydında kapatma,
  kendi projesi dışı kaynak reddi ve izin kaldırma mevcut testlerde başarılı.
- Terminal broker yeniden bağlanma ve replay, scoped push ve yedek hash/yol
  denetimleri mevcut regresyon testlerinde başarılı.
- Backend **153/153**, UI **71/71**, TypeScript ve üretim derlemesi başarılı.
- İki depoda `npm audit --omit=dev`: production bağımlılıklarında raporlanan
  açık **0**. Bu tüm uygulamanın güvenlik açığı olmadığı anlamına gelmez.
- Yaklaşık 1.2 MB minified ortak sprite/office chunk uyarısı sürüyor. Performans
  ölçüm sınırı olarak kaydedildi; kullanıcıların FPS'sinin düşük olduğu kanıtlanmadı.

## Doğrulama sınırları ve ertelenenler

Tanılama sadece geçici dosyalar ve mock CLI ile yapıldı; dış mesaj, ücretli model
çağrısı, gerçek izin genişletme, prod dosya yazma veya oturum durdurma yapılmadı.
Bu inceleme formal penetrasyon testi, gerçek saldırı tatbikatı, fiziksel telefon/
tablet kabulü veya tüm uzmanların gerçek üretim görevlerini yerine getirme testi
sayılmaz. Slack/finans bağlantıları, fiziksel cihaz kontrolleri ve kabul edilmiş
karakter/animasyon tasarımı isteğin doğrultusunda ayrı tutuldu.

Önerilen sıra: G-01/G-02 → G-03/G-04 → G-05/G-06/G-07 → G-08.
Kanıt özeti: `gap-review-proof-2026-10-12.json`. Tespitler için regresyon testleri
henüz eklenmedi; düzeltme sırasında doğru davranışı doğrulayan testler eklenmeli.
