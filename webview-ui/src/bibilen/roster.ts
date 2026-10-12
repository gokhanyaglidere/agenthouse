const BASE_ROSTER = [
  {
    "key": "chief",
    "name": "Gökhan",
    "group": "Yönetim",
    "description": "Ana Claude Code oturumu · görevleri planlar ve uzmanlara dağıtır.",
    "skills": [
      "CLAUDE.md"
    ]
  },
  {
    "key": "bibilen-senior-architect",
    "name": "Yazılım mimarı",
    "group": "Ürün ve mühendislik",
    "description": "Yazılım yapısını planlar, teknik kararları ve ekipler arası bağımlılıkları inceler.",
    "skills": [
      ".cursor/skills/bibilen/senior-architect/SKILL.md"
    ]
  },
  {
    "key": "database-designer",
    "name": "Veritabanı tasarımcısı",
    "group": "Ürün ve mühendislik",
    "description": "Veritabanı şemasını, ilişkileri ve veri erişimini tasarlar.",
    "skills": [
      ".cursor/skills/bibilen/supabase-migration/SKILL.md",
      ".cursor/skills/vendor/database-designer/SKILL.md"
    ]
  },
  {
    "key": "flutter-mobile",
    "name": "Mobil geliştirici",
    "group": "Ürün ve mühendislik",
    "description": "Mobil ekranlar ve uygulama akışları üzerinde çalışır.",
    "skills": [
      ".cursor/skills/bibilen/flutter-mobile/SKILL.md"
    ]
  },
  {
    "key": "gap-reviewer",
    "name": "Kod incelemecisi",
    "group": "Ürün ve mühendislik",
    "description": "Değişiklikleri bağımsız gözle inceler, eksikleri ve hataları raporlar.",
    "skills": []
  },
  {
    "key": "release-manager",
    "name": "Sürüm yöneticisi",
    "group": "Ürün ve mühendislik",
    "description": "Sürüm hazırlığını, yayın kontrollerini ve değişiklik kayıtlarını inceler.",
    "skills": [
      ".cursor/skills/bibilen/release-manager/SKILL.md"
    ]
  },
  {
    "key": "security-pen-testing",
    "name": "Güvenlik uzmanı",
    "group": "Ürün ve mühendislik",
    "description": "Erişim, veri güvenliği ve uygulama açıklarını inceler.",
    "skills": [
      ".cursor/skills/bibilen/security-pen-testing/SKILL.md"
    ]
  },
  {
    "key": "senior-backend",
    "name": "Sunucu geliştiricisi",
    "group": "Ürün ve mühendislik",
    "description": "Sunucu işlemleri, API akışları ve iş kuralları üzerinde çalışır.",
    "skills": [
      ".cursor/skills/bibilen/edge-functions/SKILL.md",
      ".cursor/skills/bibilen/senior-backend/SKILL.md"
    ]
  },
  {
    "key": "senior-fullstack",
    "name": "Yazılım geliştiricisi",
    "group": "Ürün ve mühendislik",
    "description": "Arayüz ve sunucu arasındaki akışları birlikte ele alır.",
    "skills": [
      ".cursor/skills/bibilen/senior-architect/SKILL.md"
    ]
  },
  {
    "key": "senior-qa",
    "name": "Kalite uzmanı",
    "group": "Ürün ve mühendislik",
    "description": "Değişiklikleri test eder, hataları ve doğrulama sonuçlarını raporlar.",
    "skills": [
      ".cursor/skills/bibilen/senior-qa/SKILL.md"
    ]
  },
  {
    "key": "seo-backlinks",
    "name": "Bağlantı uzmanı",
    "group": "SEO",
    "description": "Dış bağlantıları ve sitenin bağlantı profilini inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-backlinks/SKILL.md"
    ]
  },
  {
    "key": "seo-cluster",
    "name": "Konu planlayıcısı",
    "group": "SEO",
    "description": "İçerik konularını gruplar, konu ve yayın planları hazırlar.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-cluster/SKILL.md"
    ]
  },
  {
    "key": "seo-content",
    "name": "SEO içerik yazarı",
    "group": "SEO",
    "description": "İçerikleri arama niyeti, kalite ve sayfa yapısı açısından inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-content/SKILL.md"
    ]
  },
  {
    "key": "seo-dataforseo",
    "name": "SEO veri analisti",
    "group": "SEO",
    "description": "Bağlı veri hizmetiyle arama, kelime ve rakip verilerini analiz eder.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-dataforseo/SKILL.md"
    ]
  },
  {
    "key": "seo-drift",
    "name": "SEO takip uzmanı",
    "group": "SEO",
    "description": "Sayfaları önceki kayıtlarıyla karşılaştırır, SEO değişikliklerini raporlar.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-drift/SKILL.md"
    ]
  },
  {
    "key": "seo-ecommerce",
    "name": "E-ticaret SEO uzmanı",
    "group": "SEO",
    "description": "Ürün ve kategori sayfalarının arama görünürlüğünü inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-ecommerce/SKILL.md"
    ]
  },
  {
    "key": "seo-flow",
    "name": "SEO süreç yöneticisi",
    "group": "SEO",
    "description": "Arama çalışmalarının aşamalarını ve önceliklerini planlar.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-flow/SKILL.md"
    ]
  },
  {
    "key": "seo-geo",
    "name": "Yapay zekâ arama uzmanı",
    "group": "SEO",
    "description": "İçeriklerin yapay zekâ aramalarındaki görünürlüğünü değerlendirir.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-geo/SKILL.md",
      ".claude/skills/seo-dataforseo/SKILL.md"
    ]
  },
  {
    "key": "seo-google",
    "name": "Google arama uzmanı",
    "group": "SEO",
    "description": "Bağlı Google hizmetlerinden arama ve performans verilerini inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-google/SKILL.md"
    ]
  },
  {
    "key": "seo-image-gen",
    "name": "Görsel planlayıcısı",
    "group": "SEO",
    "description": "SEO görsellerini inceler ve üretim planı hazırlar.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-image-gen/SKILL.md"
    ]
  },
  {
    "key": "seo-local",
    "name": "Yerel SEO uzmanı",
    "group": "SEO",
    "description": "İşletmenin yerel arama görünürlüğünü ve sayfa bilgilerini inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-local/SKILL.md",
      ".claude/skills/seo-dataforseo/SKILL.md"
    ]
  },
  {
    "key": "seo-maps",
    "name": "Harita uzmanı",
    "group": "SEO",
    "description": "Harita görünürlüğü, işletme profilleri ve konum verilerini inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-maps/SKILL.md",
      ".claude/skills/seo-dataforseo/SKILL.md"
    ]
  },
  {
    "key": "seo-performance",
    "name": "Performans uzmanı",
    "group": "SEO",
    "description": "Sayfa hızını ve yüklenme sorunlarını analiz eder.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-technical/SKILL.md"
    ]
  },
  {
    "key": "seo-schema",
    "name": "Yapısal veri uzmanı",
    "group": "SEO",
    "description": "Yapısal verileri kontrol eder, uygun şema önerileri hazırlar.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-schema/SKILL.md"
    ]
  },
  {
    "key": "seo-sitemap",
    "name": "Site haritası uzmanı",
    "group": "SEO",
    "description": "Site haritalarını, URL kapsamını ve tarama sorunlarını kontrol eder.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-sitemap/SKILL.md"
    ]
  },
  {
    "key": "seo-sxo",
    "name": "Arama deneyimi uzmanı",
    "group": "SEO",
    "description": "Aramadan gelen ziyaretçilerin sayfa deneyimini değerlendirir.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-sxo/SKILL.md"
    ]
  },
  {
    "key": "seo-technical",
    "name": "Teknik SEO uzmanı",
    "group": "SEO",
    "description": "Tarama, indeksleme ve teknik SEO sorunlarını inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-technical/SKILL.md"
    ]
  },
  {
    "key": "seo-visual",
    "name": "Görsel SEO uzmanı",
    "group": "SEO",
    "description": "Sayfa görüntülerini, mobil yerleşimi ve görsel sorunları inceler.",
    "skills": [
      ".claude/skills/seo/SKILL.md",
      ".claude/skills/seo-audit/SKILL.md"
    ]
  },
  {
    "key": "ui-design-system",
    "name": "Tasarım sistemi uzmanı",
    "group": "Ürün ve mühendislik",
    "description": "Bileşenleri, tipografiyi ve ekranların görsel tutarlılığını düzenler.",
    "skills": [
      ".cursor/skills/bibilen/ui-design-system/SKILL.md"
    ]
  },
  {
    "key": "web-frontend",
    "name": "Web geliştirici",
    "group": "Ürün ve mühendislik",
    "description": "Web ekranları, etkileşimler ve mobil uyum üzerinde çalışır.",
    "skills": [
      ".cursor/skills/bibilen/web-frontend/SKILL.md"
    ]
  },
  {
    "key": "remotion-producer",
    "name": "İçerik üreticisi",
    "group": "Video ve görsel",
    "description": "Video içerikleri ve animasyonlar hazırlar, render sonuçlarını kontrol eder.",
    "skills": [
      ".claude/skills/remotion-best-practices/SKILL.md",
      ".cursor/skills/bibilen/tr-content-voice/SKILL.md"
    ]
  },
  {
    "key": "visual-content-producer",
    "name": "Görsel içerik üreticisi",
    "group": "Video ve görsel",
    "description": "Görsel içerik fikirleri ve marka uyumlu tasarım çıktıları hazırlar.",
    "skills": [
      ".cursor/skills/bibilen/ad-creative-design/SKILL.md",
      ".cursor/skills/bibilen/tr-content-voice/SKILL.md"
    ]
  },
  {
    "key": "marketing-lead",
    "name": "Pazarlama yöneticisi",
    "group": "Pazarlama",
    "description": "Pazarlama çalışmalarını mevcut strateji ve kanal planlarına göre düzenler.",
    "skills": [
      ".cursor/skills-vendor/product-marketing/SKILL.md",
      ".cursor/skills/bibilen/tr-content-voice/SKILL.md"
    ]
  },
  {
    "key": "sales-lead",
    "name": "Satış uzmanı",
    "group": "İşletme",
    "description": "Müşteri ihtiyaçları, teklif taslakları ve satış takibi üzerinde çalışır.",
    "skills": [
      ".cursor/skills-vendor/customer-research/SKILL.md"
    ]
  },
  {
    "key": "finance-analyst",
    "name": "Finans uzmanı",
    "group": "İşletme",
    "description": "Bütçe, gider, gelir ve fiyatlandırma analizleri hazırlar.",
    "skills": [
      ".cursor/skills-vendor/competitive-pricing-intel/SKILL.md"
    ]
  },
  {
    "key": "accounting-analyst",
    "name": "Muhasebe uzmanı",
    "group": "İşletme",
    "description": "Belge, gider kaydı ve hesap mutabakatı taslakları hazırlar.",
    "skills": []
  },
  {
    "key": "operations-reporter",
    "name": "Operasyon sorumlusu",
    "group": "İşletme",
    "description": "Slack alarmlarını ve günlük durumu raporlar, takip işlerini Gökhan’a önerir.",
    "skills": []
  }
] as const;
export const residentId = (index: number) => -10000-index;
export const isResident = (id: number) => id <= -10000;

export interface ResidentRole {key:string;name:string;group:string;description:string;skills:readonly string[];}
export const ROSTER:ResidentRole[]=[...BASE_ROSTER];
export interface ProjectAgent {key:string;name:string;description:string;group?:string;skills:string[];skillLinks?:Array<{name:string;available:boolean}>;}
export function configureRoster(keys:string[],legacy:boolean,agents?:ProjectAgent[]){
 const roles=keys.map(key=>{
  const local=agents?.find(a=>a.key===key);
  if(local)return {key,name:local.name,description:local.description,group:local.group??'Proje ajanları',skills:local.skillLinks?.map(s=>s.name+(s.available?'':' · bulunamadı'))??local.skills};
  if(agents)return {key,name:key==='chief'?'Gökhan':key,description:key==='chief'?'Ana Claude oturumu · projenin kendi kurallarıyla çalışır.':'Tanım bulunamadı.',group:'Ana oturum',skills:[]};
  const known=BASE_ROSTER.find(r=>r.key===key);
  if(known)return {...known,skills:legacy?known.skills:[],description:legacy?known.description:key==='chief'?'Bu projenin görevlerini planlar ve yerel uzmanlara dağıtır.':'Bu projenin yerel Claude ajanı.'};
  const portableNames:Record<string,string>={'project-engineer':'Yazılım geliştiricisi','project-reviewer':'Kod incelemecisi','operations-reporter':'Operasyon sorumlusu'};
  return {key,name:portableNames[key]??key.replace(/[-_]/g,' '),group:'Proje uzmanları',description:'Bu projenin .claude/agents klasöründeki ajan.',skills:[]};
 });ROSTER.splice(0,ROSTER.length,...roles);
}
