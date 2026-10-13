// Signed command envelope between the central (Mac) gateway and a remote execution host.
// Transport confidentiality comes from the private tailnet (WireGuard) plus HTTPS; this layer adds
// per-host authentication, replay protection, command identity and body integrity.
import {createHmac, createHash, randomBytes, timingSafeEqual, randomUUID} from 'node:crypto';

export const PROTOCOL_VERSION = 'ah-host-v1';
export const MAX_SKEW_MS = 60_000;
export const HEADERS = Object.freeze({
  host: 'x-ah-host', ts: 'x-ah-ts', nonce: 'x-ah-nonce', cmd: 'x-ah-cmd', role: 'x-ah-role',
  actor: 'x-ah-actor', ws: 'x-ah-ws', rev: 'x-ah-rev', body: 'x-ah-body', sig: 'x-ah-sig',
});
const ID = /^[A-Za-z0-9._~-]{1,100}$/;
const ACTOR = /^[\w.@+-]{0,200}$/;

export const sha256 = data => createHash('sha256').update(data).digest('hex');
export const newCommandId = () => randomUUID();
export const newSecret = () => randomBytes(32).toString('base64url');

function canonical(f) {
  return [PROTOCOL_VERSION, f.method, f.target, f.host, f.ts, f.nonce, f.cmd ?? '', f.role, f.actor ?? '', f.ws ?? '', f.rev ?? '', f.body].join('\n');
}
const mac = (secret, text) => createHmac('sha256', secret).update(text).digest();

// Build the headers the central gateway sends. `target` is the exact request path + query.
export function sign({secret, hostId, method, target, body = Buffer.alloc(0), role = 'operator', actor = '', workspaceId = '', revision = '', commandId, now = Date.now(), nonce = randomBytes(16).toString('hex')}) {
  const fields = {method: method.toUpperCase(), target, host: hostId, ts: String(now), nonce, cmd: commandId, role, actor, ws: workspaceId, rev: revision, body: sha256(body)};
  const out = {
    [HEADERS.host]: hostId, [HEADERS.ts]: fields.ts, [HEADERS.nonce]: nonce, [HEADERS.role]: role,
    [HEADERS.body]: fields.body, [HEADERS.sig]: mac(secret, canonical(fields)).toString('base64url'),
  };
  if (commandId) out[HEADERS.cmd] = commandId;
  if (actor) out[HEADERS.actor] = actor;
  if (workspaceId) out[HEADERS.ws] = workspaceId;
  if (revision) out[HEADERS.rev] = revision;
  return out;
}

// Replay window: a nonce is accepted once inside the clock-skew window.
export class NonceCache {
  constructor({windowMs = MAX_SKEW_MS * 2, max = 20_000} = {}) {this.windowMs = windowMs; this.max = max; this.seen = new Map();}
  take(nonce, now = Date.now()) {
    for (const [n, at] of this.seen) {if (now - at > this.windowMs) this.seen.delete(n); else break;}
    if (this.seen.has(nonce)) return false;
    if (this.seen.size >= this.max) return false; // fail closed under flood
    this.seen.set(nonce, now);
    return true;
  }
}

// Verify an incoming envelope. Returns {ok:true, envelope} or {ok:false, code}.
export function verify({secret, hostId, method, target, body = Buffer.alloc(0), headers, nonces, now = Date.now()}) {
  const h = name => {const v = headers[name]; return typeof v === 'string' ? v : undefined;};
  const fields = {method: method.toUpperCase(), target, host: h(HEADERS.host), ts: h(HEADERS.ts), nonce: h(HEADERS.nonce), cmd: h(HEADERS.cmd), role: h(HEADERS.role), actor: h(HEADERS.actor), ws: h(HEADERS.ws), rev: h(HEADERS.rev), body: h(HEADERS.body)};
  const sig = h(HEADERS.sig);
  if (!sig || !fields.host || !fields.ts || !fields.nonce || !fields.role || !fields.body) return {ok: false, code: 'missing_envelope'};
  if (fields.host !== hostId) return {ok: false, code: 'wrong_host'};
  if (!/^[a-f0-9]{16,64}$/.test(fields.nonce) || !/^\d{10,16}$/.test(fields.ts)) return {ok: false, code: 'bad_envelope'};
  if (fields.cmd !== undefined && !ID.test(fields.cmd)) return {ok: false, code: 'bad_command_id'};
  if (fields.ws !== undefined && !ID.test(fields.ws)) return {ok: false, code: 'bad_workspace'};
  if (fields.actor !== undefined && !ACTOR.test(fields.actor)) return {ok: false, code: 'bad_actor'};
  if (fields.role !== 'operator') return {ok: false, code: 'role_not_allowed'};
  const expected = mac(secret, canonical(fields));
  let given; try {given = Buffer.from(sig, 'base64url');} catch {return {ok: false, code: 'bad_signature'};}
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return {ok: false, code: 'bad_signature'};
  if (fields.body !== sha256(body)) return {ok: false, code: 'body_mismatch'};
  const skew = Math.abs(now - Number(fields.ts));
  if (skew > MAX_SKEW_MS) return {ok: false, code: 'expired'};
  if (nonces && !nonces.take(fields.nonce, now)) return {ok: false, code: 'replayed'};
  return {ok: true, envelope: {hostId: fields.host, commandId: fields.cmd, role: fields.role, actor: fields.actor ?? '', workspaceId: fields.ws, revision: fields.rev}};
}

// Response proof for the hello handshake: proves the responder holds the secret and saw our challenge.
export const helloProof = (secret, hostId, challenge, bootId) => mac(secret, ['hello', hostId, challenge, bootId].join('\n')).toString('base64url');
export function checkHelloProof(secret, hostId, challenge, bootId, proof) {
  if (typeof proof !== 'string') return false;
  const expected = Buffer.from(helloProof(secret, hostId, challenge, bootId)); const given = Buffer.from(proof);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Pairing token: shown once on the host terminal and pasted by the owner into the central panel.
// It carries the shared secret, so it must never be written to chat, Git or logs.
export const encodePairing = ({hostId, secret}) => 'ah1.' + Buffer.from(JSON.stringify({hostId, secret})).toString('base64url');
export function decodePairing(token) {
  if (typeof token !== 'string' || !token.startsWith('ah1.') || token.length > 400) throw new Error('bad_pairing');
  const v = JSON.parse(Buffer.from(token.slice(4), 'base64url').toString('utf8'));
  if (typeof v.hostId !== 'string' || typeof v.secret !== 'string' || v.secret.length < 32) throw new Error('bad_pairing');
  return {hostId: v.hostId, secret: v.secret};
}
