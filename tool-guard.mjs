import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,chmodSync,realpathSync,existsSync} from 'node:fs';
import {dirname,resolve,relative,join,isAbsolute} from 'node:path';
const fileTools=new Set(['Read','Glob','Grep','Edit','Write','NotebookEdit']);
const writeTools=new Set(['Edit','Write','NotebookEdit']);
const internal=new Set(['TaskCreate','TaskGet','TaskList','TaskUpdate','TodoWrite','AskUserQuestion','ExitPlanMode']);
export function canonical(path){let tail=[];let p=resolve(path);while(!existsSync(p)){const parent=dirname(p);if(parent===p)throw Error('Yol doğrulanamadı');tail.unshift(p.slice(parent.length+1));p=parent;}return resolve(realpathSync(p),...tail);}
export function classifyTool(input,{cwd,policy}){
 const tool=input.tool_name;if(typeof tool!=='string'||!input.tool_input||typeof input.tool_input!=='object')return {decision:'deny',reason:'Araç isteği geçersiz.'};
 if(policy.deniedTools?.includes(tool))return {decision:'deny',reason:'Bu araç proje izninde kapalı.'};
 if(fileTools.has(tool)){
  const raw=input.tool_input.file_path??input.tool_input.notebook_path??input.tool_input.path??cwd;
  if(typeof raw!=='string')return {decision:'deny',reason:'Dosya yolu okunamadı.'};
  let path;try{path=canonical(resolve(typeof input.cwd==='string'?input.cwd:cwd,raw));}catch{return {decision:'deny',reason:'Dosya yolu doğrulanamadı.'};}
  const rel=relative(canonical(cwd),path);if(rel==='..'||rel.startsWith('..'+ '/')||isAbsolute(rel))return {decision:'deny',reason:'Çalışma klasörü dışındaki dosyalara erişim kapalı.',files:[path]};
  const parts=rel.split('/');if((writeTools.has(tool)&&['tool-guard.mjs','tool-guard-client.mjs','project-policy.mjs','server.mjs'].some(name=>path===join(dirname(fileURLToPath(import.meta.url)),name)))||parts.some(p=>p==='.claude'||p.startsWith('.env')||p==='credentials.json')||policy.deniedPaths?.some(p=>rel===p||rel.startsWith(p+'/')))return {decision:'deny',reason:'Bu dosya veya klasör koruma altında.',files:[path]};
  if(writeTools.has(tool)&&policy.toolMode==='readonly')return {decision:'deny',reason:'Proje yalnızca inceleme modunda.',files:[path]};
  return {decision:'normal',reason:'Proje içindeki dosya aracı.',files:[path]};
 }
 if(policy.toolMode==='readonly'&&!internal.has(tool))return {decision:'deny',reason:'İnceleme modunda bu araç çalıştırılamaz.'};
 if(internal.has(tool))return {decision:'normal',reason:'Claude etkileşim aracı.'};
 if(tool==='Agent')return {decision:'normal',reason:'Alt ajan aynı oturum korumasını kullanır.'};
 return {decision:'ask',reason:tool==='Bash'?'Kabuk komutu çalışmadan önce tek seferlik onay gerekli. Silme ve yayınlama dahil komutun tamamını incele.':'Bu araç dış sistem veya kod çalıştırabilir; tek seferlik onay gerekli.'};
}
export class ToolGuard{
 constructor({cwd,path,policy,notify=()=>{}}){this.cwd=cwd;this.path=path;this.policy=policy;this.notify=notify;this.pending=new Map();this.history=[];this.checkedAt=null;this.seen=new Set();try{const s=JSON.parse(readFileSync(path,'utf8'));this.token=s.token;this.history=Array.isArray(s.history)?s.history.slice(-100):[];}catch{}if(typeof this.token!=='string'||this.token.length!==64)this.token=randomBytes(32).toString('hex');this.save();}
 save(){mkdirSync(dirname(this.path),{recursive:true,mode:0o700});writeFileSync(this.path,JSON.stringify({token:this.token,history:this.history.slice(-100)}),{mode:0o600});chmodSync(this.path,0o600);}
 authenticates(value){return typeof value==='string'&&value.length===this.token.length&&timingSafeEqual(Buffer.from(value),Buffer.from(this.token));}
 state(){return {checkedAt:this.checkedAt,checkedSessions:[...this.seen],pending:[...this.pending.values()].map(p=>p.record),history:this.history.slice(-30).reverse()};}
 async check(input,{timeout=120000}={}){
  if(typeof input.session_id!=='string'||input.session_id.length>100||JSON.stringify(input).length>100000)return {decision:'deny',reason:'Araç kaydı geçersiz veya çok büyük.'};
  if(input.guard_policy_revision!==(this.policy.state().toolRevision??null))return {decision:'deny',reason:'Proje izinleri değişmiş veya koruma sürümü eksik. Aynı geçmişi yeni korumalı oturumda aç.'};
  this.checkedAt=Date.now();this.seen.add(input.session_id);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
  const rule=classifyTool(input,{cwd:this.cwd,policy:this.policy.state()});if(input.hook_event_name==='PermissionRequest'&&rule.decision==='normal'){rule.decision='ask';rule.reason='Claude bu işlem için izin istiyor.';}
  if(rule.decision!=='ask')return rule;
  if(this.pending.size>=64)return {decision:'deny',reason:'Onay merkezi dolu; işlem çalıştırılmadı.'};
  const record={id:randomUUID(),sessionId:input.session_id,tool:input.tool_name,input:structuredClone(input.tool_input),files:rule.files??[],reason:rule.reason,createdAt:Date.now(),expiresAt:Date.now()+timeout,status:'pending',policyRevision:this.policy.state().toolRevision??null};
  return new Promise(resolve=>{const finish=(decision,reason)=>{const p=this.pending.get(record.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(record.id);this.history.push({...record,status:decision,decidedAt:Date.now()});this.history=this.history.slice(-100);try{this.save();}catch{decision='deny';reason='Onay kaydı saklanamadı; işlem çalıştırılmadı.';}resolve({decision,reason});};const timer=setTimeout(()=>finish('deny','Onay süresi doldu; işlem çalıştırılmadı.'),timeout);this.pending.set(record.id,{record,timer,finish});try{Promise.resolve(this.notify(record)).catch(()=>{});}catch{}});
 }
 invalidate(){for(const p of [...this.pending.values()])if(p.record.policyRevision!==(this.policy.state().toolRevision??null))p.finish('deny','Proje izinleri değişti; eski işlem çalıştırılmadı.');}
 decide(id,decision){if(!['allow','deny'].includes(decision))throw Error('Karar geçersiz.');const p=this.pending.get(id);if(!p||p.record.expiresAt<=Date.now())throw Error('Bu onay isteği artık geçerli değil.');if(decision==='allow'&&p.record.policyRevision!==(this.policy.state().toolRevision??null))throw Error('İzinler değişti; eski istek onaylanamaz.');if(decision==='allow'&&classifyTool({tool_name:p.record.tool,tool_input:p.record.input},{cwd:this.cwd,policy:this.policy.state()}).decision==='deny')throw Error('Proje izni değişti; bu işlem artık onaylanamaz.');p.finish(decision,decision==='allow'?'Kullanıcı bu araç çağrısını bir kez onayladı.':'Kullanıcı bu araç çağrısını reddetti.');return {ok:true};}
 settings({node,script,port,workspaceId,mode}){const p=this.policy.state(),issue=randomUUID();const config=join(dirname(this.path),'tool-guard-client-'+issue+'.json');writeFileSync(config,JSON.stringify({token:this.token,port,workspaceId,policyRevision:p.toolRevision??null}),{mode:0o600});const settings=join(dirname(this.path),'tool-guard-settings-'+issue+'.json');const sensitive=[join(homedir(),'.pixel-agents'),join(homedir(),'.claude'),join(homedir(),'.ssh'),join(homedir(),'.aws'),join(homedir(),'.config'),...p.deniedPaths.map(path=>resolve(this.cwd,path))];const denies=['Read(.env*)','Edit(.env*)','Read(.claude/**)','Edit(.claude/**)','Edit(.git/hooks/**)','Edit(.git/config)',...sensitive.flatMap(path=>[`Read(/${path}/**)`,`Edit(/${path}/**)`]),...p.deniedTools];writeFileSync(settings,JSON.stringify({permissions:{blockReadsOutsideWorkingDirectories:true,deny:denies},sandbox:{enabled:true,failIfUnavailable:true,allowUnsandboxedCommands:false,autoAllowBashIfSandboxed:false,credentials:{envVars:[...new Set(['ANTHROPIC_API_KEY','OPENAI_API_KEY','GH_TOKEN','GITHUB_TOKEN','NPM_TOKEN','DATABASE_URL',...Object.keys(process.env).filter(name=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(name))])].map(name=>({name,mode:'deny'}))},excludedCommands:[],filesystem:{denyRead:[...sensitive,resolve(this.cwd,'**/.env*')],denyWrite:[...sensitive,resolve(this.cwd,'.git/hooks'),resolve(this.cwd,'.git/config'),resolve(this.cwd,'.claude'),...['tool-guard.mjs','tool-guard-client.mjs','project-policy.mjs','server.mjs'].map(name=>join(dirname(fileURLToPath(import.meta.url)),name))],allowWrite:[this.cwd]},network:{allowedDomains:p.allowedDomains??['github.com','api.github.com','registry.npmjs.org','pypi.org','files.pythonhosted.org'],allowLocalBinding:false,allowAllUnixSockets:false}},hooks:{PreToolUse:[{matcher:'.*',hooks:[{type:'command',command:node,args:[script,config],timeout:150,onFailure:'block'}]}],PermissionRequest:[{matcher:'.*',hooks:[{type:'command',command:node,args:[script,config],timeout:150,onFailure:'block'}]}]}}),{mode:0o600});return ['--restricted','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--tools',mode==='readonly'?'Read,Glob,Grep,TaskCreate,TaskGet,TaskList,TaskUpdate,AskUserQuestion':'Read,Glob,Grep,Edit,Write,NotebookEdit,Bash,Agent,TaskCreate,TaskGet,TaskList,TaskUpdate,AskUserQuestion','--settings',settings];}
}
