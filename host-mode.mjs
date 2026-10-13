// Host-side admission for a remote execution host (e.g. WSL2). The host runs the normal gateway bound to
// 127.0.0.1; in host mode EVERY request must carry a valid signed envelope from the central gateway.
// The guard re-validates scope and permission locally, de-duplicates commands and rejects work while
// the sandbox prerequisites are missing. It never trusts Tailscale identity headers.
import {readFileSync, writeFileSync, renameSync, mkdirSync, chmodSync, realpathSync, existsSync} from 'node:fs';
import {dirname, sep, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {HEADERS, NonceCache, verify, sha256, helloProof} from './host-protocol.mjs';

const MAX_BODY = 1_000_000;
const WORK_START = /^\/bibilen\/api\/(sessions|tasks|operations\/tasks)$/;
// Account-level routes that would enumerate other workspaces are not served by a host.
const UNSCOPED_ALLOWED = new Set(['POST /bibilen/api/projects', 'GET /bibilen/api/usage']);

export function loadHostCredential(path) {
  const c = JSON.parse(readFileSync(path, 'utf8'));
  if (!c.hostId || !c.secret || c.secret.length < 32 || !Array.isArray(c.allowedRoots)) throw new Error('Host credential file is incomplete.');
  return {hostId: c.hostId, secret: c.secret, allowedRoots: c.allowedRoots.map(r => realpathSync(r)), accountLabel: c.accountLabel ?? ''};
}

export const under = (root, candidate) => candidate === root || candidate.startsWith(root.endsWith(sep) ? root : root + sep);
export function rootAllowed(allowedRoots, path) {
  let real; try {real = realpathSync(resolve(path));} catch {return false;}
  return allowedRoots.some(r => under(r, real));
}

// Persistent command ledger: a command id executes at most once, even across host restarts.
// A command left 'inflight' by a crash stays ambiguous and is never replayed.
export class CommandLedger {
  constructor({path, now = Date.now, ttlMs = 24 * 3600_000, max = 5000} = {}) {
    this.path = path; this.now = now; this.ttlMs = ttlMs; this.max = max; this.entries = new Map();
    try {for (const [id, e] of Object.entries(JSON.parse(readFileSync(path, 'utf8')).entries ?? {})) this.entries.set(id, e);} catch {}
    for (const e of this.entries.values()) if (e.state === 'inflight') e.state = 'ambiguous';
  }
  get(id) {return this.entries.get(id) ?? null;}
  begin(id, fingerprint) {
    const prior = this.entries.get(id);
    if (prior) return {fresh: false, reused: prior.fingerprint !== fingerprint, entry: prior};
    this.prune();
    const entry = {state: 'inflight', fingerprint, at: this.now(), status: null};
    this.entries.set(id, entry); this.save();
    return {fresh: true, entry};
  }
  finish(id, status) {const e = this.entries.get(id); if (!e) return; e.state = 'done'; e.status = status; e.doneAt = this.now(); this.save();}
  prune() {
    const cutoff = this.now() - this.ttlMs;
    for (const [id, e] of this.entries) if (e.at < cutoff || this.entries.size > this.max) this.entries.delete(id);
  }
  save() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), {recursive: true, mode: 0o700});
    const tmp = this.path + '.' + process.pid + '.tmp';
    writeFileSync(tmp, JSON.stringify({entries: Object.fromEntries(this.entries)}), {mode: 0o600});
    renameSync(tmp, this.path);
  }
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = []; let size = 0;
    req.on('data', c => {size += c.length; if (size > MAX_BODY) {fail(Object.assign(new Error('too_large'), {code: 'too_large'})); req.destroy(); return;} chunks.push(c);});
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}
function deny(res, status, code, extra = {}) {
  if (res.headersSent) return;
  const body = JSON.stringify({error: code, ...extra});
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body)});
  res.end(body);
}
const STATUS = {missing_envelope: 401, bad_envelope: 401, bad_signature: 401, body_mismatch: 401, expired: 401, replayed: 401, wrong_host: 403, role_not_allowed: 403, bad_command_id: 400, bad_workspace: 400, bad_actor: 400};

export function createHostGuard({credential, port, bootId = randomUUID(), ledger, nonces = new NonceCache(), workspaces, inventoryRevision, preflight, version = '1', now = Date.now, log = () => {}}) {
  const internalHost = `127.0.0.1:${port}`;
  const workspaceInfo = () => workspaces().filter(w => rootAllowed(credential.allowedRoots, w.root));
  const allowedWorkspace = id => workspaceInfo().some(w => w.id === id);

  function admitHeaders(req, envelope, hasBody) {
    for (const h of Object.keys(req.headers)) if (h.startsWith('x-forwarded-') || h.startsWith('x-ah-') || h === 'tailscale-user-login' || h === 'forwarded') delete req.headers[h];
    req.headers.host = internalHost;
    if (hasBody || req.headers['upgrade']) req.headers.origin = `http://${internalHost}`; else delete req.headers.origin;
    if (envelope.workspaceId) req.headers['x-workspace-id'] = envelope.workspaceId;
    delete req.headers['sec-fetch-site'];
  }

  function precheck(method, url, envelope) {
    const q = url.searchParams.get('workspaceId');
    if (envelope.workspaceId) {
      if (q !== null && q !== envelope.workspaceId) return ['workspace_mismatch', 403];
      if (!allowedWorkspace(envelope.workspaceId)) return ['workspace_not_allowed', 403];
    } else if (q !== null) {
      return ['workspace_not_signed', 403];
    } else if (url.pathname.startsWith('/bibilen/api/') && !UNSCOPED_ALLOWED.has(method + ' ' + url.pathname)) {
      return ['workspace_required', 403];
    }
    return null;
  }

  async function hello(res, url, envelope) {
    const challenge = url.searchParams.get('challenge') ?? '';
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(challenge)) return deny(res, 400, 'bad_challenge');
    const body = JSON.stringify({
      protocol: 'ah-host-v1', hostId: credential.hostId, bootId, version, time: now(), accountLabel: credential.accountLabel,
      proof: helloProof(credential.secret, credential.hostId, challenge, bootId),
      sandbox: preflight(), workspaces: workspaceInfo().map(w => ({id: w.id, name: w.name, root: w.root, revision: inventoryRevision(w.id)})),
    });
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-AH-Boot': bootId});
    res.end(body);
  }

  return {
    bootId, ledger,
    // Wrap the gateway's request listener.
    wrap(listener) {
      return async (req, res) => {
        const url = new URL(req.url, 'http://host.invalid');
        // Claude hooks call the guard endpoint on loopback with their own bearer token; never accept it via a proxy.
        if (url.pathname === '/bibilen/guard/check' && req.method === 'POST') {
          if (req.headers['x-forwarded-for'] || req.headers['x-forwarded-host'] || req.headers['tailscale-user-login']) return deny(res, 403, 'forbidden');
          return listener(req, res);
        }
        if (!url.pathname.startsWith('/bibilen/api/') && !url.pathname.startsWith('/bibilen/host/v1/')) return deny(res, 404, 'not_found');
        let body = Buffer.alloc(0);
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        if (hasBody) {try {body = await readBody(req);} catch (e) {return deny(res, e.code === 'too_large' ? 413 : 400, e.code ?? 'bad_request');}}
        const target = req.url;
        const v = verify({secret: credential.secret, hostId: credential.hostId, method: req.method, target, body, headers: req.headers, nonces, now: now()});
        res.setHeader('X-AH-Boot', bootId);
        if (!v.ok) {log('reject', v.code, req.method, url.pathname); return deny(res, STATUS[v.code] ?? 401, v.code);}
        const {envelope} = v;

        if (url.pathname === '/bibilen/host/v1/hello' && req.method === 'GET') return hello(res, url, envelope);
        if (url.pathname === '/bibilen/host/v1/workspaces' && req.method === 'GET') {
          res.writeHead(200, {'Content-Type': 'application/json'}); return res.end(JSON.stringify({workspaces: workspaceInfo().map(w => ({id: w.id, name: w.name, root: w.root, revision: inventoryRevision(w.id)}))}));
        }
        const cmdMatch = url.pathname.match(/^\/bibilen\/host\/v1\/commands\/([A-Za-z0-9._~-]{1,100})$/);
        if (cmdMatch && req.method === 'GET') {
          const e = ledger.get(cmdMatch[1]);
          res.writeHead(e ? 200 : 404, {'Content-Type': 'application/json'}); return res.end(JSON.stringify(e ? {id: cmdMatch[1], state: e.state, status: e.status} : {error: 'unknown_command'}));
        }
        if (url.pathname.startsWith('/bibilen/host/v1/')) return deny(res, 404, 'not_found');

        const blocked = precheck(req.method, url, envelope);
        if (blocked) {log('reject', blocked[0], url.pathname); return deny(res, blocked[1], blocked[0]);}
        if (req.method === 'POST' && url.pathname === '/bibilen/api/projects') {
          let path; try {path = JSON.parse(body.toString('utf8')).path;} catch {return deny(res, 400, 'bad_json');}
          if (typeof path !== 'string' || !rootAllowed(credential.allowedRoots, path)) return deny(res, 403, 'root_not_allowed');
        }
        if (hasBody) {
          if (!envelope.commandId) return deny(res, 400, 'command_id_required');
          if (req.method === 'POST' && WORK_START.test(url.pathname)) {
            const sb = preflight(); if (!sb.sandboxReady) return deny(res, 503, 'sandbox_unavailable', {detail: sb.problems});
            if (envelope.revision && envelope.workspaceId && envelope.revision !== inventoryRevision(envelope.workspaceId)) return deny(res, 409, 'stale_inventory');
          }
          const begin = ledger.begin(envelope.commandId, sha256(req.method + ' ' + target + '\n') + sha256(body));
          if (!begin.fresh) return deny(res, 409, begin.reused ? 'command_id_reused' : 'duplicate_command', {state: begin.entry.state, status: begin.entry.status});
          res.on('close', () => {if (ledger.get(envelope.commandId)?.state === 'inflight') ledger.finish(envelope.commandId, res.statusCode);});
        }
        admitHeaders(req, envelope, hasBody);
        log('admit', req.method, url.pathname, envelope.commandId ?? '-');
        const inner = hasBody ? Object.assign(Readable.from([body]), {headers: req.headers, method: req.method, url: req.url, socket: req.socket}) : req;
        return listener(inner, res);
      };
    },
    // Wrap the 'upgrade' listener (terminal / office websockets).
    wrapUpgrade(listener) {
      return (req, socket, head) => {
        const reject = (status, code) => {socket.end(`HTTP/1.1 ${status} ${code}\r\nConnection: close\r\n\r\n`);};
        let url; try {url = new URL(req.url, 'http://host.invalid');} catch {return socket.destroy();}
        const v = verify({secret: credential.secret, hostId: credential.hostId, method: 'GET', target: req.url, headers: req.headers, nonces, now: now()});
        if (!v.ok) {log('reject-upgrade', v.code); return reject(401, v.code);}
        const blocked = precheck('GET', url, v.envelope);
        if (blocked || !v.envelope.workspaceId) return reject(403, blocked?.[0] ?? 'workspace_required');
        admitHeaders(req, v.envelope, true);
        return listener(req, socket, head);
      };
    },
  };
}
