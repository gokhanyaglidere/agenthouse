// Central-gateway client for one remote execution host. Tracks verified availability and never replays
// an ambiguous mutating command: if a start/write request may or may not have reached the host, the
// caller gets the command id and must reconcile through commandStatus().
import {randomBytes} from 'node:crypto';
import {isIP} from 'node:net';
import {sign, newCommandId, checkHelloProof} from './host-protocol.mjs';

export class HostError extends Error {
  constructor(code, detail = {}) {super(code); this.code = code; Object.assign(this, detail);}
}

// Hosts are reachable only through the private tailnet: MagicDNS (*.ts.net) or a Tailscale address.
export function assertTailnetUrl(value, {allowLoopback = false} = {}) {
  let u; try {u = new URL(value);} catch {throw new HostError('bad_host_url');}
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new HostError('bad_host_url');
  const name = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const ver = isIP(name);
  const tailnetName = ver === 0 && name.endsWith('.ts.net') && name.length > 7;
  const cgnat = ver === 4 && (() => {const [a, b] = name.split('.').map(Number); return a === 100 && b >= 64 && b <= 127;})();
  const tailnetV6 = ver === 6 && name.startsWith('fd7a:115c:a1e0:');
  const loopback = allowLoopback && (name === 'localhost' || name === '127.0.0.1' || name === '::1');
  if (!(tailnetName || cgnat || tailnetV6 || loopback)) throw new HostError('not_tailnet_address');
  // Names are protected by HTTPS; raw tailnet IPs rely on WireGuard encryption.
  if (tailnetName && u.protocol !== 'https:') throw new HostError('https_required');
  return u.origin;
}

export class HostLink {
  constructor({id, name, baseUrl, secret, fetchImpl = globalThis.fetch, now = Date.now, verifiedTtlMs = 20_000, timeoutMs = 8_000, readTimeoutMs=timeoutMs, pollMs = 5_000, offlineAfterMs = 30_000, allowLoopback = false, onChange = () => {}}) {
    this.id = id; this.name = name; this.origin = assertTailnetUrl(baseUrl, {allowLoopback}); this.secret = secret;
    Object.assign(this, {fetchImpl, now, verifiedTtlMs, timeoutMs, readTimeoutMs, pollMs, offlineAfterMs, onChange});
    this.status = 'unverified'; this.info = null; this.verifiedAt = 0; this.lastOkAt = 0; this.lastError = null; this.restarted = false; this.timer = null; this.helloBusy = null;
  }
  setStatus(next, error = null) {
    this.lastError = error;
    if (this.status !== next) {const prev = this.status; this.status = next; this.onChange(this, prev);}
  }
  // Fresh, verified, sandbox-ready: required before any new work is started on the host.
  get usable() {return this.status === 'online' && this.now() - this.verifiedAt <= this.verifiedTtlMs && this.info?.sandbox?.sandboxReady === true;}
  snapshot() {
    return {id: this.id, name: this.name, status: this.effectiveStatus(), verifiedAt: this.verifiedAt || null, bootId: this.info?.bootId ?? null, restarted: this.restarted,
      sandbox: this.info?.sandbox ?? null, accountLabel: this.info?.accountLabel ?? '', workspaces: this.info?.workspaces ?? [], error: this.lastError};
  }
  effectiveStatus() {
    if (this.status === 'online' && this.now() - this.verifiedAt > this.verifiedTtlMs) return 'stale';
    return this.status;
  }

  async raw(method, target, {body, workspaceId, revision, commandId, actor = ''} = {}) {
    const payload = body === undefined ? Buffer.alloc(0) : Buffer.from(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    const headers = sign({secret: this.secret, hostId: this.id, method, target, body: payload, actor, workspaceId, revision, commandId});
    if (payload.length) headers['content-type'] = 'application/json';
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), method==='GET'&&target.startsWith('/bibilen/api/')?this.readTimeoutMs:this.timeoutMs);
    try {
      const res = await this.fetchImpl(this.origin + target, {method, headers, body: payload.length ? payload : undefined, signal: controller.signal, redirect: 'error'});
      return {status: res.status, headers: res.headers, body: Buffer.from(await res.arrayBuffer())};
    } finally {clearTimeout(timer);}
  }

  async hello() {
    if (this.helloBusy) return this.helloBusy;
    this.helloBusy = this.#hello().finally(() => {this.helloBusy = null;});
    return this.helloBusy;
  }
  async #hello() {
    const challenge = randomBytes(18).toString('base64url');
    let res;
    try {res = await this.raw('GET', '/bibilen/host/v1/hello?challenge=' + challenge);}
    catch (e) {return this.#failed(e.name === 'AbortError' ? 'timeout' : 'unreachable');}
    if (res.status === 401 || res.status === 403) {this.info = null; this.setStatus('rejected', 'host_rejected_credential'); return this.snapshot();}
    if (res.status !== 200) return this.#failed('host_error_' + res.status);
    let info; try {info = JSON.parse(res.body.toString('utf8'));} catch {return this.#failed('bad_hello');}
    if (info.hostId !== this.id || !checkHelloProof(this.secret, this.id, challenge, info.bootId, info.proof)) {this.info = null; this.setStatus('rejected', 'host_identity_unverified'); return this.snapshot();}
    this.restarted = !!this.info && this.info.bootId !== info.bootId;
    this.info = info; this.verifiedAt = this.lastOkAt = this.now();
    this.setStatus('online');
    return this.snapshot();
  }
  #failed(reason) {
    // Stay 'stale' for a short grace period, then 'offline'. Never throw: the poller must keep running.
    this.setStatus(this.now() - this.lastOkAt > this.offlineAfterMs ? 'offline' : 'stale', reason);
    return this.snapshot();
  }

  start() {if (!this.timer) {void this.hello(); this.timer = setInterval(() => void this.hello(), this.pollMs); this.timer.unref?.();}}
  stop() {clearInterval(this.timer); this.timer = null;}

  // One attempt, no replay. Reads may run while 'stale'; mutations need a verified, sandbox-ready host.
  async request({method, path, body, workspaceId, revision, commandId, actor}) {
    const mutating = !['GET', 'HEAD'].includes(method);
    if (this.status === 'rejected') throw new HostError('host_rejected', {hostStatus: this.status});
    if (mutating && !this.usable) throw new HostError(this.info?.sandbox?.sandboxReady === false && this.status === 'online' ? 'sandbox_unavailable' : 'host_unverified', {hostStatus: this.effectiveStatus()});
    if (!mutating && this.status === 'offline') throw new HostError('host_offline', {hostStatus: this.status});
    const id = mutating ? (commandId ?? newCommandId()) : undefined;
    try {
      const res = await this.raw(method, path, {body, workspaceId, revision, commandId: id, actor});
      if (res.headers.get('x-ah-boot') && this.info && res.headers.get('x-ah-boot') !== this.info.bootId) {this.verifiedAt = 0; void this.hello();}
      return {...res, commandId: id};
    } catch (e) {
      this.verifiedAt = 0; this.setStatus('stale', e.name === 'AbortError' ? 'timeout' : 'unreachable'); void this.hello();
      if (mutating) throw new HostError('ambiguous_result', {commandId: id, hostStatus: this.effectiveStatus()});
      throw new HostError('host_unreachable', {hostStatus: this.effectiveStatus()});
    }
  }
  async commandStatus(commandId) {
    const res = await this.raw('GET', '/bibilen/host/v1/commands/' + encodeURIComponent(commandId));
    return {status: res.status, ...(JSON.parse(res.body.toString('utf8') || '{}'))};
  }
}
