import {randomUUID, createHash} from 'node:crypto';
import {existsSync, realpathSync, statSync, mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync, readdirSync, openSync, closeSync, unlinkSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';

function identity(path) {
  const root = realpathSync(path);
  const stat = statSync(root);
  if (!stat.isDirectory()) throw new Error('Çalışma ortamı bir klasör olmalı.');
  let gitCommonDir = null;
  try { gitCommonDir = realpathSync(execFileSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim()); } catch {}
  return {root, device:stat.dev, inode:stat.ino, gitCommonDir};
}

// Registration is durable metadata; it does not start a worker or alter a repository.
export class ProjectRegistry {
  constructor({path=join(homedir(), '.pixel-agents', 'projects.json'), storageRoot=join(homedir(), '.pixel-agents')}={}) {
    this.path = path;
    this.storageRoot = storageRoot;
    if (existsSync(path)) {
      this.data = JSON.parse(readFileSync(path, 'utf8'));
      if (this.data.version !== 1 || !Array.isArray(this.data.projects) || !Array.isArray(this.data.workspaces)) throw new Error('Proje kayıt dosyası geçersiz; otomatik olarak sıfırlanmadı.');
    } else this.data = {version:1, hostId:randomUUID(), defaultWorkspaceId:null, projects:[], workspaces:[]};
  }
  save() {
    mkdirSync(dirname(this.path), {recursive:true, mode:0o700});
    const temp = `${this.path}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(this.data, null, 2)+'\n', {mode:0o600});
    renameSync(temp, this.path); chmodSync(this.path, 0o600);
  }
  reload(){if(existsSync(this.path)){const data=JSON.parse(readFileSync(this.path,'utf8'));if(data.version!==1||!Array.isArray(data.projects)||!Array.isArray(data.workspaces))throw new Error('Proje kaydı geçersiz.');this.data=data;}}
  register(input) {
    mkdirSync(dirname(this.path),{recursive:true,mode:0o700});
    let lock;try{lock=openSync(this.path+'.lock','wx',0o600);}catch(error){if(error.code==='EEXIST')throw new Error('Proje kaydı başka bir işlemde güncelleniyor. Tekrar dene.');throw error;}
    try{this.reload();return this.registerUnlocked(input);}finally{closeSync(lock);unlinkSync(this.path+'.lock');}
  }
  registerUnlocked({name, path, legacy=false}) {
    const label = String(name??'').trim();
    if (!label || label.length>100) throw new Error('Proje adı gerekli.');
    const verified = identity(path);
    const existing = this.data.workspaces.find(w=>w.root===verified.root);
    if (existing) { this.context(existing.id); return existing; }
    // Worktrees share a project but always have distinct workspace identity.
    let project = verified.gitCommonDir && this.data.projects.find(p=>p.gitCommonDir===verified.gitCommonDir);
    if (!project) { project={id:randomUUID(), name:label, gitCommonDir:verified.gitCommonDir}; this.data.projects.push(project); }
    const workspace={id:randomUUID(), projectId:project.id, hostId:this.data.hostId, ...verified, legacy, createdAt:Date.now()};
    this.data.workspaces.push(workspace);
    if (!this.data.defaultWorkspaceId) this.data.defaultWorkspaceId=workspace.id;
    this.save(); return workspace;
  }
  context(workspaceId) {
    this.reload();
    const workspace = this.data.workspaces.find(w=>w.id===workspaceId);
    if (!workspace) throw new Error('Bilinmeyen çalışma ortamı.');
    const verified=identity(workspace.root);
    if (verified.root!==workspace.root || verified.device!==workspace.device || verified.inode!==workspace.inode || verified.gitCommonDir!==workspace.gitCommonDir) throw new Error('Çalışma klasörünün kimliği değişmiş; tekrar doğrulanmalı.');
    const project=this.data.projects.find(p=>p.id===workspace.projectId);
    const namespace=createHash('sha256').update(workspace.id).digest('hex').slice(0,12);
    const store=workspace.legacy?this.storageRoot:join(this.storageRoot,'workspaces',namespace);
    const agentDir=join(workspace.root,'.claude','agents');
    const roles=Object.freeze([...new Set(['chief', ...(existsSync(agentDir)?readdirSync(agentDir).filter(n=>n.endsWith('.md')).map(n=>n.slice(0,-3)):[])])]);
    return Object.freeze({projectId:project.id, projectName:project.name, workspaceId:workspace.id, hostId:workspace.hostId, cwd:workspace.root, roles,
      storageDir:store, legacy:workspace.legacy,
      taskStorePath:join(store,workspace.legacy?'bibilen-tasks.json':'tasks.json'),
      sessionStorePath:join(store,workspace.legacy?'bibilen-sessions.json':'sessions.json'),
      terminalRoot:workspace.legacy?join(store,'terminals'):join(this.storageRoot,'pty',namespace),
      assertValid:()=>this.context(workspaceId),
    });
  }
  publicState({paths=false}={}) {
    this.reload();
    return {hostId:this.data.hostId, defaultWorkspaceId:this.data.defaultWorkspaceId,
      projects:this.data.projects.map(p=>({id:p.id,name:p.name})),
      workspaces:this.data.workspaces.map(w=>({id:w.id,projectId:w.projectId,hostId:w.hostId,...(paths?{root:w.root}:{}),runtime:w.id===this.data.defaultWorkspaceId?'active':'registered'}))};
  }
}
