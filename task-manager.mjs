import {runCli} from './cli-command.mjs';
import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const STORE_DIR = join(homedir(), '.pixel-agents');
const STORE_PATH = join(STORE_DIR, 'bibilen-tasks.json');
const TERMINAL_STATES = new Set(['completed', 'failed', 'stopped']);
const PRIORITIES = new Set(['normal', 'high', 'urgent']);
const MAX_TASKS = 250;
const MAX_PENDING = 250;

export function cleanAnsi(value = '') {
  return String(value)
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1B[@-_]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r/g, '')
    .trim();
}

export function claudeFailure(output = '') {
  const text = cleanAnsi(output);
  if (/oauth_not_allowed_for_organization|Your organization has disabled Claude subscription access for Claude Code/i.test(text)) {
    return 'Claude hesabı bağlı, ancak organizasyon Claude Code abonelik erişimini kapatmış. Organizasyon yöneticisinin erişimi açması veya Anthropic API erişiminin yapılandırılması gerekiyor.';
  }
  for (const line of text.split('\n').reverse()) {
    try {
      const result = JSON.parse(line);
      if (result.type === 'result' && result.is_error === true) return String(result.result || 'Claude görevi bir hatayla sonlandı.').slice(-1500);
    } catch { /* Human-readable log lines are not JSON results. */ }
  }
  return null;
}

export function validateTaskInput(input, allowedRoles) {
  const title = String(input?.title ?? '').trim().slice(0, 100);
  const prompt = String(input?.prompt ?? '').trim().slice(0, 20_000);
  const role = String(input?.role ?? 'chief');
  const priority = PRIORITIES.has(input?.priority) ? input.priority : 'normal';
  if (title.length < 3) throw new Error('Görev adı en az 3 karakter olmalı.');
  if (prompt.length < 5) throw new Error('Görev açıklaması en az 5 karakter olmalı.');
  if (!allowedRoles.has(role)) throw new Error('Bilinmeyen uzman rolü.');
  return { title, prompt, role, priority };
}

export function stateFromAgent(agent) {
  if (!agent) return null;
  const states = { working:'running', running:'running', blocked:'waiting', done:'completed', completed:'completed', failed:'failed', stopped:'stopped' };
  if (states[agent.state]) return states[agent.state];
  if (agent.status === 'failed') return 'failed';
  if (agent.status === 'busy') return 'running';
  if (agent.status === 'idle') return 'waiting';
  return null;
}

export function inferStage(logs = '') {
  const value = cleanAnsi(logs).toLocaleLowerCase('tr');
  if (!value) return 'working';
  if (/\b(vitest|jest|pytest|playwright|test|tests|testing|lint|typecheck|build)\b|test ediyor|doğruluyor|kontrol ediyor/.test(value)) return 'testing';
  if (/\b(edit|write|patch|implement|refactor|create|update|compile)\b|kodluyor|düzenliyor|uyguluyor/.test(value)) return 'coding';
  if (/\b(read|search|grep|glob|find|inspect|research|explore|analy[sz]e)\b|araştırıyor|inceliyor|okuyor/.test(value)) return 'researching';
  return 'working';
}


function initialData() {
  return { version: 1, settings: { maxConcurrent: 3 }, tasks: [], events: [] };
}

export class TaskManager {
  constructor({ cwd, claudePath, allowedRoles, onNotice = () => {}, runCommand = runCli, context, admission, storePath = context?.taskStorePath ?? STORE_PATH, launchGuard=()=>[],checkNewWork=()=>{},nativeRoles }) {
    this.nativeRoles=nativeRoles;this.launchGuard=launchGuard;this.checkNewWork=checkNewWork;
    this.context = context;
    this.admission = admission;
    this.cwd = context?.cwd ?? cwd;
    this.storePath = storePath;
    this.env = Object.freeze({...process.env});
    this.claudePath = claudePath;
    this.allowedRoles = allowedRoles;
    this.onNotice = onNotice;
    this.runCommand = runCommand;
    this.data = this.load();
    if (context) {
      let changed=false;
      for (const task of this.data.tasks) {
        if (!task.projectId && !task.workspaceId) { Object.assign(task,{projectId:context.projectId,workspaceId:context.workspaceId,hostId:context.hostId}); changed=true; }
      }
      if (changed) this.save();
    }
    this.launching = new Set();
    this.stopping = new Set();
    this.timer = null;
    admission?.add(this);
  }

  load() {
    try {
      const parsed = JSON.parse(readFileSync(this.storePath, 'utf8'));
      if(!parsed||parsed.version!==undefined&&parsed.version!==1||!Array.isArray(parsed.tasks)||parsed.events!==undefined&&!Array.isArray(parsed.events))throw Error('Invalid task store');
      return { ...initialData(), ...parsed, settings: { ...initialData().settings, ...parsed.settings } };
    } catch(error) {
      if(error.code==='ENOENT')return initialData();
      throw Error('Görev kaydı doğrulanamadı; mevcut kayıtlar sıfırlanmadı.');
    }
  }

  save() {
    mkdirSync(dirname(this.storePath), { recursive: true, mode:0o700 });
    const tmp = `${this.storePath}.tmp`;
    const limited = {
      ...this.data,
      tasks: [...this.data.tasks.filter(t=>!TERMINAL_STATES.has(t.status)),...this.data.tasks.filter(t=>TERMINAL_STATES.has(t.status)).slice(0,MAX_TASKS)].sort((a,b)=>b.createdAt-a.createdAt),
      events: this.data.events.slice(0, 1000),
    };
    this.data.tasks=limited.tasks;
    writeFileSync(tmp, `${JSON.stringify(limited, null, 2)}\n`, { mode: 0o600 });
    renameSync(tmp, this.storePath);
    chmodSync(this.storePath, 0o600);
  }

  event(taskId, type, message) {
    this.data.events.unshift({ id: randomUUID(), taskId, type, message, at: Date.now() });
    this.data.events = this.data.events.slice(0, 1000);
  }

  start() {
    if (this.timer) return;
    const poll = () => void this.tick().catch(error => console.error('Task polling failed:', error.message));
    poll();
    this.timer = setInterval(poll, 3000);
  }

  stopPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  create(input) {
    this.checkNewWork?.();
    this.context?.assertValid();
    if(this.data.tasks.filter(t=>!TERMINAL_STATES.has(t.status)).length>=MAX_PENDING)throw new Error('Bu projede bekleyen iş sınırı dolu (250). Mevcut işleri tamamla veya iptal et.');
    const values = validateTaskInput(input, this.allowedRoles);
    const taskId = randomUUID();
    const task = {
      id: taskId,
      ...values,
      ...(this.context ? {projectId:this.context.projectId, workspaceId:this.context.workspaceId, hostId:this.context.hostId} : {}),
      status: 'queued',
      stage: 'queued',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      sessionId: null,
      sessionName: `bb-${Date.now().toString(36)}-${taskId.slice(0,8)}-${values.role}`.slice(0, 58),
      summary: '',
      error: '',
    };
    this.data.tasks.unshift(task);
    this.event(task.id, 'created', `${values.role} için görev sıraya alındı.`);
    this.save();
    void this.schedule();
    return task;
  }

  get(id) {
    return this.data.tasks.find((task) => task.id === id) ?? null;
  }

  publicState(isOperator) {
    const tasks = this.data.tasks.map((task) => isOperator ? task : {
      id: task.id,
      role: task.role,
      priority: task.priority,
      status: task.status,
      stage: task.stage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      title: 'Özel görev',
    });
    return {
      operator: isOperator,
      settings: {...this.data.settings,writeConcurrency:1},
      tasks,
      events: isOperator ? this.data.events.slice(0, 100) : [],
      serverTime: Date.now(),
    };
  }

  updateSettings(input) {
    const maxConcurrent = Math.max(1, Math.min(5, Math.round(Number(input?.maxConcurrent)) || 3));
    this.data.settings.maxConcurrent = maxConcurrent;
    this.event(null, 'settings', `Eşzamanlı görev sınırı ${maxConcurrent} oldu.`);
    this.save();
    void this.schedule();
    return this.data.settings;
  }

  async schedule() {
    const active = new Set([...this.data.tasks.filter(task => ['starting', 'running', 'waiting'].includes(task.status)).map(task => task.id), ...this.launching]).size;
    const free = active?0:Math.min(1,Math.max(0,this.data.settings.maxConcurrent));
    if(!free||this.admission?.workspaceBusy(this.cwd))return;
    if(this.context&&this.admission&&this.data.tasks.some(t=>t.status==='queued')){const agents=await this.listAgents();const external=agents?.some(a=>a.cwd===this.cwd&&['working','running','blocked','waiting','busy'].includes(a.state??a.status));if(!agents||external){for(const task of this.data.tasks.filter(t=>t.status==='queued'))task.queueReason=!agents?'Canlı CLI durumu doğrulanamadı; güvenli başlangıç bekleniyor.':'Bu klasörde CLI işi var; bitmesi bekleniyor.';this.save();return;}}
    const next = this.data.tasks
      .filter((task) => task.status === 'queued')
      .sort((a, b) => {
        const rank = { urgent: 0, high: 1, normal: 2 };
        return rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt;
      })
      .slice(0, free);
    await Promise.all(next.map((task) => this.launch(task)));
  }

  async launch(task) {
    if (this.launching.size || this.data.tasks.some(t=>['starting','running','waiting'].includes(t.status)) || task.status !== 'queued') return;
    if (this.admission && !this.admission.canLaunch(this,task)) return;
    this.launching.add(task.id);
    try { await this.launchReserved(task); }
    finally {
      this.launching.delete(task.id);
      void this.schedule().catch(error => console.error('Task scheduling failed:', error.message));
    }
  }

  async launchReserved(task) {
    if (this.context) {
      try {
        this.checkNewWork?.();
        if(!this.allowedRoles.has(task.role))throw Error('Bu ajan artık projede tanımlı değil; görevi uygun ajanla yeniden oluştur.');
        this.context.assertValid();
        if (task.workspaceId !== this.context.workspaceId || task.projectId !== this.context.projectId) throw new Error('Görev başka bir projeye ait.');
      } catch (error) { task.status='failed'; task.error=error.message; task.completedAt=Date.now(); this.save(); return; }
    }
    delete task.queueReason;task.status = 'starting';
    task.stage = 'starting';
    task.startedAt = Date.now();
    this.event(task.id, 'started', `${task.role} oturumu başlatılıyor.`);
    this.save();
    const prompt = task.role === 'chief'&&!this.nativeRoles?.has('chief')
      ? `${this.context?.projectName ?? 'BiBilen'} projesinin orkestrasyon şefi Gökhan olarak bu görevi yürüt. Gerektiğinde .claude/agents içindeki uygun uzmanları kullan.\n\nGörev: ${task.prompt}`
      : task.prompt;
    let guardArgs;try{guardArgs=this.launchGuard?.()??[];}catch{task.status='failed';task.stage='failed';task.error='Araç koruması hazırlanamadı; görev başlatılmadı.';task.completedAt=Date.now();this.save();return;}
    const args = ['--bg', '--name', task.sessionName, '--permission-mode', 'default',...guardArgs];
    if (task.role !== 'chief'||this.nativeRoles?.has('chief')) args.push('--agent', task.role);
    args.push(prompt);
    let result;
    try {
      result = await this.runCommand(this.claudePath, args, {
        cwd: this.cwd, env: { ...this.env, BIBILEN_TASK_ID: task.id },
      });
    } catch (error) {
      result = { code:-1, stdout:'', stderr:error.message };
    }
    const shortId = result.stdout.match(/backgrounded\s+·\s+([0-9a-f]{8})/i)?.[1];
    if((result.timedOut||result.outputLimited)&&!TERMINAL_STATES.has(task.status)){task.sessionId=shortId??null;task.launchUnconfirmed=true;task.error='Başlatma sonucu doğrulanamadı. Aynı iş yeniden başlatılmadı; oturum envanteri kontrol ediliyor.';this.event(task.id,'starting',task.error);this.save();return;}
    if (TERMINAL_STATES.has(task.status)) {
      if (shortId && task.status !== 'stopped') { task.sessionId = shortId; this.save(); }
      if (shortId && task.status === 'stopped') {
        task.sessionId = shortId;
        const stopped = await this.runCommand(this.claudePath, ['stop', shortId], {cwd:this.cwd,env:this.env});
        if (stopped.code !== 0) {
          task.status = 'waiting'; task.stage = 'waiting'; task.completedAt = null;
          task.error = cleanAnsi(stopped.stderr || stopped.stdout || 'Geç başlayan oturum durdurulamadı.');
          this.event(task.id, 'waiting', task.error);
        }
        this.save();
      }
      return;
    }
    if (result.code !== 0 || !shortId) {
      task.status = 'failed';
      task.stage = 'failed';
      task.completedAt = Date.now();
      task.error = cleanAnsi(result.stderr || result.stdout || 'Claude Code görevi başlatılamadı.').slice(-1500);
      this.event(task.id, 'failed', task.error);
      this.save();
      await this.notice(task, 'Görev başlatılamadı');
      void this.schedule();
      return;
    }
    task.sessionId = shortId;
    task.status = 'running';
    task.stage = 'working';
    this.event(task.id, 'running', `Claude oturumu ${shortId} çalışıyor.`);
    this.save();
  }

  async listAgents() {
    this.context?.assertValid();
    const result = await this.runCommand(this.claudePath, ['agents', '--json', '--all'], { cwd: this.cwd, env: this.env });
    if (result.code !== 0) return null;
    try { const agents=JSON.parse(result.stdout); return Array.isArray(agents) ? agents : null; } catch { return null; }
  }

  async logs(task) {
    if (!task?.sessionId) return '';
    this.context?.assertValid();
    if (this.context && task.workspaceId !== this.context.workspaceId) throw new Error('Görev başka bir projeye ait.');
    const result = await this.runCommand(this.claudePath, ['logs', task.sessionId], { cwd: this.cwd, env: this.env });
    if(result.code!==0)throw Error('Görev çıktısı doğrulanamadı; sonraki kontrolde yeniden denenecek.');
    return cleanAnsi(result.stdout || result.stderr).slice(-20_000);
  }

  notice(task, message) {
    // Persist state before optional notifications, which must not block scheduling.
    this.save();
    const snapshot={...task,noticeId:randomUUID()};
    void Promise.resolve().then(() => this.onNotice(snapshot, message)).catch(() => {});
  }

  tick() {
    if (this.pollPromise) return this.pollPromise;
    this.pollPromise = this.pollOnce().finally(() => { this.pollPromise = null; });
    return this.pollPromise;
  }

  async pollOnce() {
    const watched = this.data.tasks.filter(task => !TERMINAL_STATES.has(task.status) && (task.sessionId || task.status === 'starting'));
    const agents = watched.length ? await this.listAgents() : null;
    if (agents) {
      for (const task of watched) {
        if (TERMINAL_STATES.has(task.status) || this.stopping?.has(task.id)) continue;
        const matches=agents.filter(item=>task.sessionId&&(item.id===task.sessionId||item.sessionId===task.sessionId||(/^[0-9a-f]{8}$/i.test(task.sessionId)&&String(item.sessionId??'').startsWith(task.sessionId+'-'))));
        const named=!matches.length&&task.sessionName?agents.filter(item=>item.name===task.sessionName):matches;
        const agent=named.length===1?named[0]:null;
        if (!task.sessionId && agent && task.status === 'starting') {
          task.sessionId = agent.id || agent.sessionId;
          this.save(); // Recover a launch after a service restart using its unique name.
        }
        let next = stateFromAgent(agent);
        if (!next) continue; // Missing/unknown sessions cannot prove task success or failure.
        let logs;try{logs=await this.logs(task);}catch(error){task.error=error.message;this.save();continue;}
        if(task.launchUnconfirmed){delete task.launchUnconfirmed;task.error='';}
        if (TERMINAL_STATES.has(task.status) || this.stopping?.has(task.id)) continue;
        const failure = claudeFailure(logs);
        if (failure) next = 'failed';
        if (next === 'running') {
          const stage = inferStage(logs);
          if (task.stage !== stage) { task.stage = stage; this.save(); }
        }
        if (next === task.status) continue;
        task.status = next;
        task.stage = next === 'completed' ? 'done' : next === 'running' ? inferStage(logs) : next;
        task.summary = logs.slice(-4000);
        if (TERMINAL_STATES.has(next)) task.completedAt = Date.now();
        if (next === 'failed') task.error = failure || logs.slice(-1500) || 'Claude görevi bir hatayla sonlandı.';
        const messages = {completed:'Görev tamamlandı.', waiting:'Claude kullanıcı müdahalesi bekliyor.', failed:task.error, stopped:'Claude oturumu durduruldu.', running:'Claude çalışıyor.'};
        this.event(task.id, next, messages[next]);
        this.save();
        if (['completed','waiting','failed'].includes(next)) await this.notice(task, messages[next]);
      }
    }
    await this.schedule();
  }

  async stopTask(id) {
    const task = this.get(id);
    if (!task) throw new Error('Görev bulunamadı.');
    if (TERMINAL_STATES.has(task.status)) return task;
    this.stopping ??= new Set();
    this.stopping.add(task.id);
    try {
      if(task.launchUnconfirmed&&!task.sessionId){const agents=await this.listAgents();const found=agents?.filter(a=>a.name===task.sessionName);if(found?.length!==1)throw Error('Başlatılan oturum henüz doğrulanamadı. Envanter doğrulanmadan durduruldu olarak işaretlenmez.');task.sessionId=found[0].id??found[0].sessionId;}
      if (task.sessionId) {
        const result = await this.runCommand(this.claudePath, ['stop', task.sessionId], { cwd: this.cwd, env: this.env });
        if (result.code !== 0) throw new Error(cleanAnsi(result.stderr || result.stdout || 'Claude oturumu durdurulamadı.'));
      }
    } finally { this.stopping.delete(task.id); }
    if (TERMINAL_STATES.has(task.status)) return task;
    task.status = 'stopped';
    task.stage = 'stopped';
    task.completedAt = Date.now();
    this.event(task.id, 'stopped', 'Görev yönetici tarafından durduruldu.');
    this.save();
    void this.schedule();
    return task;
  }
}

export const taskStorePath = STORE_PATH;
