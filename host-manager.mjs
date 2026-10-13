import {remoteControlUrl} from './remote-control-links.mjs';
// Central-gateway registry of remote execution hosts and the proxy that forwards workspace-scoped API calls
// and terminal websockets to them. Remote workspaces are addressed as `h~<hostId>~<hostWorkspaceId>` so the
// same project name or workspace id on two computers can never collide.
import {readFileSync, writeFileSync, renameSync, mkdirSync, chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {WebSocket, WebSocketServer} from 'ws';
import {HostLink, HostError, assertTailnetUrl} from './host-link.mjs';
import {sign, newSecret} from './host-protocol.mjs';

const HOST_ID = /^[a-z0-9]{8,32}$/;
const REMOTE = /^h~([a-z0-9]{8,32})~([A-Za-z0-9._-]{1,100})$/;
const MAX_BODY = 1_000_000;
const closeCode = c => ([1000, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014].includes(c) || (c >= 3000 && c <= 4999)) ? c : 1011;
export const remoteWorkspaceId = (hostId, workspaceId) => `h~${hostId}~${workspaceId}`;
export function parseRemote(id) {const m = typeof id === 'string' ? REMOTE.exec(id) : null; return m ? {hostId: m[1], workspaceId: m[2]} : null;}

function writeSecret(path, data) {
  mkdirSync(dirname(path), {recursive: true, mode: 0o700});
  const tmp = path + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 1), {mode: 0o600}); chmodSync(tmp, 0o600); renameSync(tmp, path);
}
const readJson = (path, fallback) => {try {return JSON.parse(readFileSync(path, 'utf8'));} catch {return fallback;}};

export class HostManager {
  constructor({hostsPath, secretsPath, linkOptions = {}, allowLoopback = false} = {}) {
    this.hostsPath = hostsPath; this.secretsPath = secretsPath; this.linkOptions = {...linkOptions, allowLoopback}; this.allowLoopback = allowLoopback;
    this.controlLinksPath=join(dirname(hostsPath),'remote-control-links.json');this.controlLinks=readJson(this.controlLinksPath,{});
    this.links = new Map();
    this.wss = new WebSocketServer({noServer: true, maxPayload: 65536, handleProtocols: () => 'bibilen-control'});
    this.sockets = new Set();
    const hosts = readJson(hostsPath, {hosts: []}).hosts ?? [], secrets = readJson(secretsPath, {});
    for (const h of hosts) if (secrets[h.id]) this.#open(h, secrets[h.id]);
  }
  #open(host, secret) {
    const link = new HostLink({...this.linkOptions, id: host.id, name: host.name, baseUrl: host.baseUrl, secret, onChange: (l, prev) => this.#changed(l, prev)});
    this.links.set(host.id, link); return link;
  }
  #changed(link, prev) {
    // A host that stops being usable drops its live terminal bridges; keystrokes are never queued for later.
    if (link.status !== 'online') for (const s of this.sockets) if (s.hostId === link.id) s.client.close(1012, 'host_' + link.status);
  }
  start() {for (const l of this.links.values()) l.start();}
  stop() {for (const l of this.links.values()) l.stop(); for (const s of this.sockets) s.client.terminate();}

  // The credential is generated here and shown once; it is never written to Git or echoed afterwards.
  add({name, baseUrl, hostId = randomBytes(8).toString('hex'), secret = newSecret()}) {
    if (!HOST_ID.test(hostId)) throw new HostError('bad_host_id');
    if (typeof name !== 'string' || !name.trim() || name.length > 60) throw new HostError('bad_host_name');
    if (this.links.has(hostId)) throw new HostError('host_exists');
    const origin = assertTailnetUrl(baseUrl, {allowLoopback: this.allowLoopback});
    const host = {id: hostId, name: name.trim(), baseUrl: origin, createdAt: new Date().toISOString()};
    const hosts = readJson(this.hostsPath, {hosts: []}).hosts ?? [];
    const secrets = readJson(this.secretsPath, {});
    writeSecret(this.secretsPath, {...secrets, [hostId]: secret});
    writeSecret(this.hostsPath, {hosts: [...hosts, host]});
    const link = this.#open(host, secret); link.start();
    return {host, secret};
  }
  remove(hostId) {
    const link = this.links.get(hostId); if (!link) return false;
    link.stop(); this.links.delete(hostId);
    for (const s of this.sockets) if (s.hostId === hostId) s.client.close(1001, 'host_removed');
    writeSecret(this.hostsPath, {hosts: (readJson(this.hostsPath, {hosts: []}).hosts ?? []).filter(h => h.id !== hostId)});
    const secrets = readJson(this.secretsPath, {}); delete secrets[hostId]; writeSecret(this.secretsPath, secrets);
    return true;
  }
  isRemote(id) {return parseRemote(id) !== null;}
  state() {return {hosts: [...this.links.values()].map(l => l.snapshot())};}

  // Remote projects/workspaces for the project switcher. Offline hosts keep their last known list, labeled by status.
  publicProjects() {
    const projects = [], workspaces = [];
    for (const l of this.links.values()) {
      const snap = l.snapshot();
      for (const w of snap.workspaces) {
        const pid = remoteWorkspaceId(l.id, w.projectId ?? w.id);
        if (!projects.some(p => p.id === pid)) projects.push({id: pid, name: w.name, hostId: l.id, hostName: l.name, remote: true});
        workspaces.push({id: remoteWorkspaceId(l.id, w.id), projectId: pid, hostId: l.id, hostName: l.name, root: w.root, revision: w.revision, remote: true, runtime: snap.status === 'online' ? 'active' : 'unavailable', hostStatus: snap.status});
      }
    }
    return {projects, workspaces};
  }
  link(id) {const l = this.links.get(id); if (!l) throw new HostError('unknown_host'); return l;}
  revision(remoteId) {
    const p = parseRemote(remoteId); if (!p) return null;
    return this.links.get(p.hostId)?.info?.workspaces?.find(w => w.id === p.workspaceId)?.revision ?? null;
  }

  async catalog() {
    const sessions=[];let inventoryAvailable=true;
    for(const l of this.links.values())for(const w of l.info?.workspaces??[]){
      try{const r=await l.request({method:'GET',path:'/bibilen/api/sessions?workspaceId='+encodeURIComponent(w.id),workspaceId:w.id});if(r.status!==200)throw Error();const data=JSON.parse(r.body);inventoryAvailable&&=!!data.inventoryAvailable;const wid=remoteWorkspaceId(l.id,w.id);for(const session of data.sessions??[])sessions.push({...session,remoteControlUrl:this.controlLinks[wid+':'+session.id]??session.remoteControlUrl??null,workspaceId:wid,catalogKey:wid+':'+session.id,projectName:w.name,remote:true,hostName:l.name});}catch{inventoryAvailable=false;}
    }
    return {sessions,inventoryAvailable};
  }
  async catalogTranscript(key,before) {
    const split=key.lastIndexOf(':');const p=parseRemote(key.slice(0,split));if(!p)throw new HostError('bad_remote_session');
    const id=key.slice(split+1);if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new HostError('bad_remote_session');
    const link=this.link(p.hostId);if(!link.info?.workspaces?.some(w=>w.id===p.workspaceId))throw new HostError('unknown_remote_workspace');
    const query=new URLSearchParams({workspaceId:p.workspaceId});if(before!==null)query.set('before',before);
    const r=await link.request({method:'GET',path:`/bibilen/api/sessions/${id}/transcript?${query}`,workspaceId:p.workspaceId});if(r.status!==200)throw new HostError('remote_transcript_unavailable');return JSON.parse(r.body);
  }

  // Portfolio rows for remote workspaces, same shape as the local portfolio. A failing host yields unavailable rows.
  async portfolio() {
    const rows = [];
    for (const l of this.links.values()) for (const w of l.info?.workspaces ?? []) rows.push({l, w});
    return Promise.all(rows.map(async ({l, w}) => {
      const base = {workspaceId: remoteWorkspaceId(l.id, w.id), projectId: remoteWorkspaceId(l.id, w.projectId ?? w.id), name: w.name, remote: true, hostId: l.id, hostName: l.name, hostStatus: l.effectiveStatus()};
      if (l.effectiveStatus() === 'rejected' || l.effectiveStatus() === 'offline') return {...base, available: false, tasks: [], inventoryAvailable: false, connectedSessions: 0, workingMembers: []};
      try {
        const [state, work] = await Promise.all(['state', 'work/overview'].map(async x => {const r = await l.request({method: 'GET', path: `/bibilen/api/${x}?workspaceId=${encodeURIComponent(w.id)}`, workspaceId: w.id}); return r.status === 200 ? JSON.parse(r.body.toString('utf8')) : null;}));
        return {...base, available: !!state, tasks: state?.tasks ?? [], inventoryAvailable: work?.inventoryAvailable ?? false, connectedSessions: work?.totalLiveSessions ?? work?.groups?.length ?? 0,
          workingMembers: work?.groups?.flatMap(g => g.members.filter(m => m.liveState === 'running').map(m => ({sessionId: g.sessionId, id: m.id, label: m.label, role: m.role}))) ?? []};
      } catch {return {...base, available: false, tasks: [], inventoryAvailable: false, connectedSessions: 0, workingMembers: []};}
    }));
  }

  // Proxy one workspace-scoped API request. The caller has already established operator permission.
  async proxy(req, res, url, {actor = ''} = {}) {
    const scoped = url.searchParams.get('workspaceId') ?? req.headers['x-workspace-id'];
    const p = parseRemote(scoped);
    const send = (status, body, headers = {}) => {res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers}); res.end(JSON.stringify(body));};
    if (!p) return send(400, {error: 'bad_remote_workspace'});
    let link; try {link = this.link(p.hostId);} catch {return send(404, {error: 'unknown_host'});}
    if (!link.info?.workspaces?.some(w => w.id === p.workspaceId)) return send(404, {error: 'unknown_remote_workspace', hostStatus: link.effectiveStatus()});
    url.searchParams.set('workspaceId', p.workspaceId);
    const body = await new Promise((ok, fail) => {
      if (['GET', 'HEAD'].includes(req.method)) return ok(undefined);
      const chunks = []; let n = 0;
      req.on('data', c => {n += c.length; if (n > MAX_BODY) {fail(new HostError('too_large')); req.destroy(); return;} chunks.push(c);});
      req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', fail);
    }).catch(e => e);
    if (body instanceof Error) return send(413, {error: 'too_large'});
    const commandId = typeof req.headers['x-command-id'] === 'string' && /^[A-Za-z0-9._~-]{1,100}$/.test(req.headers['x-command-id']) ? req.headers['x-command-id'] : undefined;
    const expected = typeof req.headers['x-expected-revision'] === 'string' ? req.headers['x-expected-revision'] : undefined;
    try {
      const controlMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([0-9a-f-]{36})\/remote-control$/i);
      if(req.method==='POST'&&controlMatch){
        const inventory=await link.request({method:'GET',path:'/bibilen/api/sessions?workspaceId='+encodeURIComponent(p.workspaceId),workspaceId:p.workspaceId,actor});
        if(inventory.status!==200)return send(503,{error:'Windows oturumları doğrulanamadı.'});
        const session=JSON.parse(inventory.body).sessions?.find(s=>s.id===controlMatch[1]&&s.origin==='windows');
        if(!session)return send(404,{error:'Bu projede Windows oturumu bulunamadı.'});
        let value;try{value=remoteControlUrl(JSON.parse(String(body)).url);}catch(error){return send(400,{error:error.message});}
        const key=scoped+':'+session.id;const next={...this.controlLinks};if(value)next[key]=value;else delete next[key];writeSecret(this.controlLinksPath,next);this.controlLinks=next;
        return send(200,{session:{...session,remoteControlUrl:value||null}});
      }
      const r = await link.request({method: req.method, path: url.pathname + url.search, body, workspaceId: p.workspaceId, revision: expected, commandId, actor});
      const type = r.headers.get('content-type') ?? 'application/json';
      res.writeHead(r.status, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-AH-Host-Status': link.effectiveStatus(), ...(r.commandId ? {'X-AH-Command': r.commandId} : {})});
      if(type.includes('application/json')){try{const data=JSON.parse(r.body);if(req.method==='GET'&&url.pathname==='/bibilen/api/sessions')for(const session of data.sessions??[])session.remoteControlUrl=this.controlLinks[scoped+':'+session.id]??session.remoteControlUrl??null;const scope=v=>{if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(scope);return;}for(const [key,value]of Object.entries(v)){if(['workspaceId','projectId'].includes(key)&&typeof value==='string'&&!parseRemote(value))v[key]=remoteWorkspaceId(p.hostId,value);else scope(value);}};scope(data);return res.end(JSON.stringify(data));}catch{}}
      return res.end(r.body);
    } catch (e) {
      if (!(e instanceof HostError)) return send(502, {error: 'proxy_failure'});
      const status = e.code === 'ambiguous_result' ? 502 : 503;
      return send(status, {error: e.code, hostStatus: e.hostStatus, ...(e.commandId ? {commandId: e.commandId, hint: 'The host may have run this command. Query /bibilen/api/hosts/<id>/commands/<commandId> before retrying.'} : {})});
    }
  }

  // Bridge a terminal websocket to the host. The bridge dies with the host link; nothing is buffered.
  upgrade(req, socket, head, {actor = ''} = {}) {
    const reject = (status, text) => socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
    let url; try {url = new URL(req.url, 'http://localhost');} catch {return socket.destroy();}
    const p = parseRemote(url.searchParams.get('workspaceId') ?? req.headers['x-workspace-id']);
    const link = p && this.links.get(p.hostId);
    if (!link || !link.info?.workspaces?.some(w => w.id === p.workspaceId)) return reject(404, 'Not Found');
    if (!link.usable) return reject(503, 'Host Unavailable');
    url.searchParams.set('workspaceId', p.workspaceId);
    const target = url.pathname + url.search;
    const headers = sign({secret: link.secret, hostId: link.id, method: 'GET', target, actor, workspaceId: p.workspaceId});
    const upstream = new WebSocket(link.origin.replace(/^http/, 'ws') + target, 'bibilen-control', {headers, handshakeTimeout: 8000, followRedirects: false});
    upstream.once('error', () => reject(502, 'Bad Gateway'));
    upstream.once('open', () => {
      this.wss.handleUpgrade(req, socket, head, client => {
        const entry = {hostId: link.id, client}; this.sockets.add(entry);
        client.on('message', (data, isBinary) => {if (upstream.readyState === WebSocket.OPEN && link.usable) upstream.send(data, {binary: isBinary}); else client.close(1012, 'host_unavailable');});
        upstream.on('message', (data, isBinary) => {if (client.readyState === WebSocket.OPEN) client.send(data, {binary: isBinary});});
        const closeBoth = code => {this.sockets.delete(entry); try {upstream.close();} catch {} try {client.close(closeCode(code));} catch {}};
        client.on('close', () => closeBoth(1000)); upstream.on('close', c => closeBoth(c === 1005 ? 1000 : c)); upstream.on('error', () => closeBoth(1011)); client.on('error', () => closeBoth(1011));
      });
    });
  }
}
