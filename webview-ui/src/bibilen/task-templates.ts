export const TASK_TEMPLATES=[
 {id:'bug',name:'Hatayı araştır',title:'Hatanın nedenini araştır',prompt:'Sorunu yeniden üret, nedenini kanıtlarla açıkla ve çözüm seçeneklerini sun. Önce mevcut proje kurallarını oku. Değişiklik yapmadan önce bulguları bildir.'},
 {id:'review',name:'Kodu incele',title:'Kod incelemesi',prompt:'Mevcut değişiklikleri doğruluk, güvenlik ve eksik testler açısından incele. Bulguları önem sırasıyla dosya konumlarıyla raporla. Kod değiştirme.'},
 {id:'implement',name:'Özelliği geliştir',title:'Yeni özellik geliştirme',prompt:'İstenen özellik: [buraya yaz]. Proje kurallarına uygun uygula. İlgili testleri çalıştır; değişen dosyaları, test sonuçlarını ve kalan sorunları raporla. Yayınlama veya silme için ayrıca onay iste.'},
 {id:'content',name:'İçerik hazırla',title:'İçerik hazırlama',prompt:'Konu: [buraya yaz]. Hedef kitle: [buraya yaz]. Önce içerik taslağı hazırla, dayanağı olmayan iddiaları belirt. Onay olmadan yayınlama.'},
] as const;
