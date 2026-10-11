# BiBilen ajan denetimi — 2026-10-10

## Kapsam ve sonuç

35 gerçek uzman tanımı + Gökhan = 36 kalıcı ofis karakteri. Kayıt, rol/model,
tur sınırı, açık skill yolları, araç izinleri, görev takibi ve karakter eşleştirmesi
incelendi. Bağımsız salt okunur inceleme yapıldı; doğrulanmış bulgular düzeltildi.
Cursor native ajanları bağlanmadı; ofis yalnızca Claude Code ile çalışır.

## Düzeltilen bulgular

- 18 SEO ajanı ana ve kendi rol skill'ini açıkça okur. 13 ajan grubundaki PATH'te
  bulunamayan `claude-seo` komutları proje launcher yolu ile değiştirildi.
- Yedi SEO ajanının yanlış kök `skills/` referansları `.claude/skills/` olarak düzeltildi.
- SEO drift önce tarihsel baseline ile karşılaştırır. Yenileme yalnızca açık talimatla
  yapılır; karşılaştırma öncesi baseline sıfırlanmaz.
- Maps/local/GEO için gereken MCP izinleri ve maliyet talimatları eklendi;
  DataForSEO ajanının zorunlu maliyet kontrolü için Bash yeteneği tamamlandı.
  Bash kullanımı maliyet launcher komutlarıyla sınırlandıran talimat içerir;
  bu talimat işletim sistemi düzeyinde bir sandbox değildir.
- Visual SEO global pip kurmaz; izole ortam tanısı ve açık setup sürecini uygular.
- Gap reviewer untracked dosyaları da inceler ve Bash ile değişiklik yapmama
  talimatı taşır. Salt okunurluk Bash seviyesinde sert bir güvenlik sınırı değildir.
- Kontrol aracı sabit 14 rol yerine bütün ajanları keşfeder; 35 tanım, 36 kişilik
  roster, model/tur sınırı, yollar, ilgili MCP/maliyet izinleri ve hook'ları doğrular.
- Claude `working/blocked/done/failed/stopped` durumları doğru çevrilir.
  `idle` tek başına başarı sayılmaz. Hatalı JSON sonuçlar başarıya dönüşmez.
- Başlangıç/durdurma yarışı ve çifte kapasite sayımı düzeltildi. İptal edilen,
  henüz başlaması tamamlanmamış görev durdurma doğrulanana kadar kapasite tutar.
- Aynı anda sorgular birleştirilir; geciken sorgu durdurulmuş görevi diriltmez.
  Başlatma anında servis yeniden açılırsa benzersiz adla oturum geri bulunur.
  Durdurma bayrağı kalıcı görev verisine yazılmaz.
- Push bildirimi görev kuyruğunu bekletmez; taşıma zaman aşımı 10 saniyedir.
- Doğrudan uzman oturumu görev rolü ve Claude session ID ile kendi karakterine
  bağlanır. Native `Subtask: [rol]` etiketi tanınır; görünen isim değişince rol kaybolmaz.
  Yeni ve restore edilen native mesajlarda session ID taşınır; native patch sürüm
  uyuşmazlığında durur ve iki kez uygulandığında değişmez.
- SEO yetenekleri ekip kartlarına işlendi. Görsel planlayıcısı rolü üretim
  yapmayan SEO analiz ajanını doğru adlandırır.

## Kanıtlar

- Backend: `npm test --prefix tools/pixel-office` — 23 test.
- UI: `npm test --prefix tools/pixel-office/webview-ui` — 9 test / 2 dosya.
- `python3 tools/check_agent_system.py` — 35 tanım geçti.
- TypeScript + Vite production build başarılı.
- Native prepare iki kez çalıştı; CLI syntax kontrolü geçti.
- Son bağımsız inceleme: 18 görev yöneticisi testi ve 35 ajan kontrolü tekrar geçti; yeni doğrulanmış bulgu yok.
- `graphify update .` tamamlandı (93.231 düğüm). SQL parser eksikliği ve üç başka yüzeydeki parse uyarısı raporlandı; bunlar ofis doğrulamasının yerine kullanılmadı.
- Canlı Tailscale sayfasında ekip, görev durumu ve mobil görünüm doğrulandı.
- Hata senaryoları gerçek ücretli iş yerine kontrollü CLI yanıtlarıyla test edildi.

## Açık çalışma sınırları

- Önceki gerçek, araçsız Claude denemesi organizasyonun abonelik erişimi yasağıyla
  reddedildi: `oauth_not_allowed_for_organization` / HTTP 403. Mevcut hazırlık
  durumu blocked. Her uzman için canlı uçtan uca başarı iddiası yoktur.
- SEO doctor: `ready:false`, `browser_ready:false`; managed environment eksik,
  runtime schema/requirements/Python değişmiş. SEO paket kurulumu yapılmadı.
- Ana SEO skill kurulum kuralı: “Run setup only when the user explicitly invokes
  `/seo setup` or explicitly asks to repair dependencies.” Dosya:
  `.claude/skills/seo/SKILL.md`, Runtime Setup bölümü. Genel denetim bu açık
  bağımlılık kurma talimatını yerine koymaz; kurulum ayrı aşamadır.
- DataForSEO proje MCP kaydında yok; global erişim doğrulanmadı. Gerçek ücretli
  çağrı yapılmadı. Kullanılamayan yetenekler hazırmış gibi raporlanmaz.
- Büyük JS bundle uyarısı devam ediyor; build başarısını engellemiyor.
- Geçici olarak bulunamayan Claude session envanteri tamamlanma kanıtı sayılmaz;
  kayıp oturumlar bu denetimde otomatik başarısız ilan edilmedi.

## Kaynak

Claude resmi durum şeması ve interactive idle/completed ayrımı:
https://code.claude.com/docs/en/agent-view#read-session-state-from-a-script

## Canlı ekran kanıtları

- [Mobil SEO ekip/yetenek görünümü](agent-audit-mobile-2026-10-10.jpg)
- [Claude erişim engelinin panelde gösterimi](agent-audit-access-2026-10-10.jpg)
