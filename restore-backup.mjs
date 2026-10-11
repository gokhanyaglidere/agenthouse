import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {restoreArchive} from './state-backup.mjs';
const [source,destination]=process.argv.slice(2);
if(!source||!destination){console.error('Kullanım: node restore-backup.mjs YEDEK.json YENİ_KLASÖR');process.exitCode=1;}
else try{
 if(statSync(source).size>90*1024*1024)throw new Error('Yedek dosyası çok büyük.');
 const result=restoreArchive(JSON.parse(readFileSync(source,'utf8')),resolve(destination));
 console.log(`${result.files} kayıt ayrı klasörde doğrulandı. Canlı sisteme uygulanmadı.`);
}catch(error){console.error(error.message);process.exitCode=1;}
