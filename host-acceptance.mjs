#!/usr/bin/env node
import {windowsPath} from './windows-inventory.mjs';
// Host-local preparation only: no model calls, trust editing, process stops or credential changes.
import {existsSync,realpathSync,statSync,lstatSync,mkdirSync,mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {homedir} from 'node:os';
import {rootAllowed,loadHostCredential,under} from './host-mode.mjs';import {ProjectRegistry} from './project-registry.mjs';
const MARKER='.agent-house-acceptance.json';
const canonicalCandidate=path=>{const tail=[];let current=resolve(path);while(!existsSync(current)){tail.unshift(current.slice(dirname(current).length+1));current=dirname(current);}return join(realpathSync(current),...tail);};
export function prepareAcceptance({parent,allowedRoots,register,run=execFileSync}){
 const base=realpathSync(parent);if(!statSync(base).isDirectory()||!rootAllowed(allowedRoots,base))throw Error('Test üst klasörü host izin listesinde değil.');
 // A test fixture must not become an untracked change in an actively edited repository.
 const candidate=canonicalCandidate(join(base,'node_modules','.cache','agent-house-acceptance'));
 if(!allowedRoots.some(root=>under(realpathSync(root),candidate)))throw Error('Test klasörü izin verilen alanın dışına çözülüyor.');
 try{run('git',['-C',base,'check-ignore','--quiet','--no-index',candidate+'/'],{stdio:'ignore',timeout:5000});}catch{throw Error('Git tarafından zaten yok sayılan bir test alanı bulunamadı; proje ayarları değiştirilmedi.');}
 mkdirSync(dirname(candidate),{recursive:true,mode:0o700});if(!rootAllowed(allowedRoots,dirname(candidate)))throw Error('Test üst klasörü değişti.');const root=mkdtempSync(candidate+'-'),nonce=randomUUID();
 const inputs=[];for(let i=1;i<=6;i++){const name=`input-${i}.txt`;writeFileSync(join(root,name),`AGENT_HOUSE_INPUT_${i}:${nonce}\n`,{mode:0o600});inputs.push(name);}
 mkdirSync(join(root,'.claude','agents'),{recursive:true,mode:0o700});
 writeFileSync(join(root,'.claude','agents','acceptance-reader.md'),`---\nname: acceptance-reader\ndescription: Read-only Agent House acceptance worker.\ntools: Read\nmodel: sonnet\n---\nOnly read the six input files in this disposable test workspace, one file per tool call. Do not run shell commands, edit files, read other directories or delegate. Return exactly CHILD_OK:${nonce} after checking every file contains the expected nonce.\n`,{mode:0o600});
 writeFileSync(join(root,'CLAUDE.md'),`# Disposable Agent House acceptance workspace\nOnly this directory is in scope. No external systems, credentials, network commands, package installs, git operations, shell commands or changes to parent projects. The owner may request writing only proof.txt and starting acceptance-reader. All other project files are outside this test.\n`,{mode:0o600});
 run('git',['-C',root,'init','--quiet'],{stdio:'ignore',timeout:5000});
 const manifest={version:1,purpose:'agent-house-disposable-acceptance',root,nonce,inputs,createdAt:new Date().toISOString()};writeFileSync(join(root,MARKER),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
 const workspace=register({name:'Agent House · Güvenli kabul testi',path:root});
 return {...manifest,windowsRoot:windowsPath(root),workspaceId:workspace.id,instruction:`Yalnızca bu test klasöründe çalış. Write aracıyla proof.txt dosyasına tam olarak PANEL_WRITE_OK:${nonce} yaz. Bash kullanma. Sonra acceptance-reader alt ajanını başlat; input-1.txt ile input-6.txt dosyalarını tek tek okuyup CHILD_OK:${nonce} döndürmesini iste. Son yanıtın PANEL_TOOLS_OK olsun. Başka dosyaya veya projeye dokunma.`,nativeIdleInstruction:'Aynı test klasöründe Windows-native Claude ile ayrı bir deneme konuşması aç, yalnızca NATIVE_IDLE_OK yanıtını iste ve boşta bırak. Gerçek proje oturumlarını devralma testinde kullanma.'};
}
export function verifyAcceptance(root){
 const actual=realpathSync(root),marker=join(actual,MARKER),stat=lstatSync(marker);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)throw Error('Test alanı kimliği doğrulanamadı.');const manifest=JSON.parse(readFileSync(marker,'utf8'));
 if(manifest.purpose!=='agent-house-disposable-acceptance'||manifest.version!==1||manifest.root!==actual||typeof manifest.nonce!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(manifest.nonce))throw Error('Test alanı kimliği doğrulanamadı.');
 const proof=join(actual,'proof.txt');let exact=false;if(existsSync(proof)){const real=realpathSync(proof),rel=relative(actual,real);if(!rel||rel.startsWith('..')||isAbsolute(rel)||statSync(real).size>1024)throw Error('Test çıktısı güvenli kapsamda değil.');exact=readFileSync(real,'utf8').trim()===`PANEL_WRITE_OK:${manifest.nonce}`;}
 return {root:actual,nonce:manifest.nonce,writeProof:exact};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv[2]==='prepare'){
   const credential=loadHostCredential(process.env.AGENT_HOUSE_HOST_CREDENTIAL??join(homedir(),'.pixel-agents','host-credential.json'));const registry=new ProjectRegistry();
   console.log(JSON.stringify(prepareAcceptance({parent:process.argv[3],allowedRoots:credential.allowedRoots,register:input=>registry.register(input)}),null,2));
  }else if(process.argv[2]==='verify')console.log(JSON.stringify(verifyAcceptance(process.argv[3]),null,2));
  else throw Error('Kullanım: node host-acceptance.mjs prepare <izinli-proje> | verify <test-klasörü>');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
