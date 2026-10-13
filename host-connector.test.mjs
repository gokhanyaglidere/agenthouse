import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket, WebSocketServer} from 'ws';
import {sign, verify, NonceCache, newSecret, encodePairing, decodePairing, sha256} from './host-protocol.mjs';
import {createHostGuard, CommandLedger, rootAllowed} from './host-mode.mjs';
import {HostLink, HostError, assertTailnetUrl} from './host-link.mjs';
import {HostManager, remoteWorkspaceId, parseRemote} from './host-manager.mjs';
import {runPreflight} from './host-preflight.mjs';

const wait = ms => new Promise(r => setTimeout(r, ms));
const HOST = 'abcd1234abcd';

// A simulated execution host: the real guard in front of a fake gateway listener.
async function startHost({secret, root, port = 0, ledgerPath, sandboxReady = true, workspaces, hostId = HOST, delayMs = 0, dropFirst = false}) {
  const calls = [];
  let dropped = false;
  const wsList = workspaces ?? [{id: 'wsA', projectId: 'pA', name: 'Alpha', root: join(root, 'alpha')}, {id: 'wsB', projectId: 'pB', name: 'Alpha', root: join(root, 'beta')}, {id: 'wsX', projectId: 'pX', name: 'Foreign', root: join(root, '..', 'outside-' + Math.random().toString(16).slice(2))}];
  const revisions = {wsA: 'rev-A-1', wsB: 'rev-B-1'};
  const credential = {hostId, secret, allowedRoots: [root], accountLabel: 'test-account'};
  const holder = {server: null, port: 0};
  const guard = createHostGuard({
    credential, port: 0, ledger: new CommandLedger({path: ledgerPath}), workspaces: () => wsList,
    inventoryRevision: id => revisions[id] ?? null, preflight: () => ({sandboxReady, problems: sandboxReady ? [] : ['bubblewrap_missing']}),
  });
  const listener = async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let body = ''; for await (const c of req) body += c;
    calls.push({method: req.method, path: url.pathname, ws: req.headers['x-workspace-id'], query: url.searchParams.get('workspaceId'), headers: {...req.headers}, body});
    if (dropFirst && !dropped && req.method === 'POST') {dropped = true; req.socket.destroy(); return;}
    if (delayMs) await wait(delayMs);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, workspace: req.headers['x-workspace-id'], path: url.pathname, tasks: [{id: 'task-of-' + req.headers['x-workspace-id']}]}));
  };
  const server = http.createServer(guard.wrap(listener));
  const wss = new WebSocketServer({noServer: true, handleProtocols: () => 'bibilen-control'});
  const upgrades = [];
  server.on('upgrade', guard.wrapUpgrade((req, socket, head) => {
    upgrades.push({url: req.url, ws: req.headers['x-workspace-id']});
    wss.handleUpgrade(req, socket, head, ws => ws.on('message', m => ws.send('echo:' + m)));
  }));
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  holder.server = server; holder.port = server.address().port;
  return {server, guard, calls, upgrades, port: holder.port, revisions, wss, stop: () => new Promise(r => {for (const c of wss.clients) c.terminate(); server.closeAllConnections?.(); server.close(r);})};
}

async function setup(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ah-host-'));
  const root = join(dir, 'projects'); mkdirSync(join(root, 'alpha'), {recursive: true}); mkdirSync(join(root, 'beta'), {recursive: true});
  const secret = newSecret();
  const ledgerPath = join(dir, 'commands.json');
  const host = await startHost({secret, root, ledgerPath, ...opts});
  const manager = new HostManager({hostsPath: join(dir, 'hosts.json'), secretsPath: join(dir, 'secrets.json'), allowLoopback: true, linkOptions: {pollMs: 50, offlineAfterMs: 120, verifiedTtlMs: 400, timeoutMs: 600}});
  const {secret: used} = manager.add({name: 'Windows WSL', baseUrl: `http://127.0.0.1:${host.port}`, hostId: HOST, secret});
  const link = manager.link(HOST);
  await link.hello();
  const central = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://central');
    await manager.proxy(req, res, url, {actor: 'owner@example.com'});
  });
  central.on('upgrade', (req, socket, head) => manager.upgrade(req, socket, head, {actor: 'owner@example.com'}));
  await new Promise(r => central.listen(0, '127.0.0.1', r));
  const cport = central.address().port;
  const call = (method, path, {body, headers = {}} = {}) => fetch(`http://127.0.0.1:${cport}${path}`, {method, headers: {'content-type': 'application/json', ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
  const ctx = {dir, root, secret, ledgerPath, host, manager, link, central, cport, call, used};
  ctx.cleanup = async () => {manager.stop(); await new Promise(r => {central.closeAllConnections?.(); central.close(r);}); await ctx.host.stop(); rmSync(dir, {recursive: true, force: true});};
  return ctx;
}
const A = remoteWorkspaceId(HOST, 'wsA'), B = remoteWorkspaceId(HOST, 'wsB'), X = remoteWorkspaceId(HOST, 'wsX');

test('tailnet-only addresses are enforced', () => {
  assert.equal(assertTailnetUrl('https://win-wsl.tail1234.ts.net'), 'https://win-wsl.tail1234.ts.net');
  assert.equal(assertTailnetUrl('http://100.101.102.103:3100'), 'http://100.101.102.103:3100');
  for (const bad of ['https://example.com', 'http://8.8.8.8', 'http://192.168.1.5:3100', 'http://win.tail1.ts.net', 'https://user:pw@a.tail1.ts.net', 'ftp://a.ts.net', 'http://127.0.0.1:3100', 'https://a.ts.net.evil.com'])
    assert.throws(() => assertTailnetUrl(bad), HostError, bad);
  assert.equal(assertTailnetUrl('http://127.0.0.1:3100', {allowLoopback: true}), 'http://127.0.0.1:3100');
});

test('protocol: signature binds method, target, body, workspace and command', () => {
  const secret = newSecret(), nonces = new NonceCache();
  const body = Buffer.from('{"a":1}');
  const h = sign({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body, workspaceId: 'w', commandId: 'c1'});
  const ok = verify({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body, headers: h, nonces});
  assert.equal(ok.ok, true);
  assert.equal(verify({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body, headers: h, nonces}).code, 'replayed');
  const fresh = () => sign({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body, workspaceId: 'w', commandId: 'c1'});
  assert.equal(verify({secret, hostId: HOST, method: 'GET', target: '/bibilen/api/tasks?workspaceId=w', body, headers: fresh()}).code, 'bad_signature');
  assert.equal(verify({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=other', body, headers: fresh()}).code, 'bad_signature');
  assert.equal(verify({secret, hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body: Buffer.from('{"a":2}'), headers: fresh()}).code, 'body_mismatch');
  assert.equal(verify({secret: newSecret(), hostId: HOST, method: 'POST', target: '/bibilen/api/tasks?workspaceId=w', body, headers: fresh()}).code, 'bad_signature');
  const old = sign({secret, hostId: HOST, method: 'GET', target: '/x', now: Date.now() - 120_000});
  assert.equal(verify({secret, hostId: HOST, method: 'GET', target: '/x', headers: old}).code, 'expired');
  assert.equal(verify({secret, hostId: 'otherhostid1', method: 'GET', target: '/x', headers: sign({secret, hostId: HOST, method: 'GET', target: '/x'})}).code, 'wrong_host');
  assert.equal(verify({secret, hostId: HOST, method: 'GET', target: '/x', headers: sign({secret, hostId: HOST, method: 'GET', target: '/x', role: 'viewer'})}).code, 'role_not_allowed');
  assert.deepEqual(decodePairing(encodePairing({hostId: HOST, secret})), {hostId: HOST, secret});
});

test('hello verifies the host, lists only allowed workspaces, and namespaces remote ids', async () => {
  const t = await setup();
  try {
    const snap = t.link.snapshot();
    assert.equal(snap.status, 'online');
    assert.deepEqual(snap.workspaces.map(w => w.id).sort(), ['wsA', 'wsB']); // wsX is outside allowedRoots
    const pub = t.manager.publicProjects();
    assert.deepEqual(pub.workspaces.map(w => w.id).sort(), [A, B].sort());
    assert.ok(pub.workspaces.every(w => w.remote && w.hostName === 'Windows WSL'));
    assert.deepEqual(parseRemote(A), {hostId: HOST, workspaceId: 'wsA'});
    assert.equal(parseRemote('plain-local-id'), null);
  } finally {await t.cleanup();}
});

test('wrong credential is rejected and nothing is started', async () => {
  const t = await setup();
  try {
    const bad = new HostLink({id: HOST, name: 'x', baseUrl: `http://127.0.0.1:${t.host.port}`, secret: newSecret(), allowLoopback: true});
    await bad.hello();
    assert.equal(bad.status, 'rejected');
    await assert.rejects(bad.request({method: 'POST', path: '/bibilen/api/tasks', workspaceId: 'wsA', body: {}}), e => e.code === 'host_rejected');
    assert.equal(t.host.calls.length, 0);
  } finally {await t.cleanup();}
});

test('host rejects unsigned, replayed, tampered and mis-scoped requests directly', async () => {
  const t = await setup();
  try {
    const base = `http://127.0.0.1:${t.host.port}`;
    assert.equal((await fetch(base + '/bibilen/api/state?workspaceId=wsA')).status, 401);
    assert.equal((await fetch(base + '/', {})).status, 404);
    const target = '/bibilen/api/state?workspaceId=wsA';
    const h = sign({secret: t.secret, hostId: HOST, method: 'GET', target, workspaceId: 'wsA'});
    assert.equal((await fetch(base + target, {headers: h})).status, 200);
    assert.equal((await fetch(base + target, {headers: h})).status, 401); // replay
    // signed for wsA but query says wsB -> mismatch
    const t2 = '/bibilen/api/state?workspaceId=wsB';
    assert.equal((await fetch(base + t2, {headers: sign({secret: t.secret, hostId: HOST, method: 'GET', target: t2, workspaceId: 'wsA'})})).status, 403);
    // foreign workspace outside allowed roots
    const t3 = '/bibilen/api/state?workspaceId=wsX';
    const r3 = await fetch(base + t3, {headers: sign({secret: t.secret, hostId: HOST, method: 'GET', target: t3, workspaceId: 'wsX'})});
    assert.equal(r3.status, 403); assert.equal((await r3.json()).error, 'workspace_not_allowed');
    // account-level enumeration is not served by a host
    for (const p of ['/bibilen/api/portfolio', '/bibilen/api/projects', '/bibilen/api/session-catalog', '/bibilen/api/backups/export']) {
      const r = await fetch(base + p, {headers: sign({secret: t.secret, hostId: HOST, method: 'GET', target: p})});
      assert.equal(r.status, 403, p);
    }
    // mutation without command id
    const t4 = '/bibilen/api/tasks?workspaceId=wsA', body = Buffer.from('{}');
    const r4 = await fetch(base + t4, {method: 'POST', headers: sign({secret: t.secret, hostId: HOST, method: 'POST', target: t4, body, workspaceId: 'wsA'}), body});
    assert.equal(r4.status, 400);
    // tampered body
    const r5 = await fetch(base + t4, {method: 'POST', headers: sign({secret: t.secret, hostId: HOST, method: 'POST', target: t4, body, workspaceId: 'wsA', commandId: 'c-t'}), body: Buffer.from('{"x":1}')});
    assert.equal(r5.status, 401);
    // project registration outside allowed roots
    const reg = Buffer.from(JSON.stringify({path: tmpdir(), name: 'x'})), t6 = '/bibilen/api/projects';
    const r6 = await fetch(base + t6, {method: 'POST', headers: sign({secret: t.secret, hostId: HOST, method: 'POST', target: t6, body: reg, commandId: 'reg-1'}), body: reg});
    assert.equal(r6.status, 403); assert.equal((await r6.json()).error, 'root_not_allowed');
    assert.equal(t.host.calls.length, 1); // only the one valid GET reached the gateway
  } finally {await t.cleanup();}
});

test('requests are scoped per workspace: two projects with the same name never mix', async () => {
  const t = await setup();
  try {
    const a = await (await t.call('GET', `/bibilen/api/state?workspaceId=${A}`)).json();
    const b = await (await t.call('GET', `/bibilen/api/state?workspaceId=${B}`)).json();
    assert.equal(a.workspace, 'wsA'); assert.equal(b.workspace, 'wsB');
    assert.deepEqual(a.tasks, [{id: 'task-of-wsA'}]); assert.deepEqual(b.tasks, [{id: 'task-of-wsB'}]);
    const seen = t.host.calls[0];
    assert.equal(seen.query, 'wsA'); // remote prefix stripped before reaching the host gateway
    assert.equal(seen.headers['x-forwarded-for'], undefined);
    assert.equal(seen.headers['tailscale-user-login'], undefined);
    assert.equal(seen.headers.host, '127.0.0.1:0');
    const foreign = await t.call('GET', `/bibilen/api/state?workspaceId=${X}`);
    assert.equal(foreign.status, 404);
    assert.equal((await t.call('GET', `/bibilen/api/state?workspaceId=h~${HOST}~nope`)).status, 404);
    assert.equal((await t.call('GET', `/bibilen/api/state?workspaceId=h~zzzzzzzz9999~wsA`)).status, 404);
  } finally {await t.cleanup();}
});

test('same workspace id on two hosts stays distinct', async () => {
  const t = await setup();
  const dir2 = mkdtempSync(join(tmpdir(), 'ah-host2-')); const root2 = join(dir2, 'p'); mkdirSync(join(root2, 'alpha'), {recursive: true});
  const secret2 = newSecret();
  const host2 = await startHost({secret: secret2, root: root2, ledgerPath: join(dir2, 'c.json'), hostId: 'beef5678beef', workspaces: [{id: 'wsA', projectId: 'pA', name: 'Alpha', root: join(root2, 'alpha')}]});
  try {
    t.manager.add({name: 'Second PC', baseUrl: `http://127.0.0.1:${host2.port}`, hostId: 'beef5678beef', secret: secret2});
    await t.manager.link('beef5678beef').hello();
    const ids = t.manager.publicProjects().workspaces.map(w => w.id);
    assert.ok(ids.includes(remoteWorkspaceId(HOST, 'wsA')) && ids.includes(remoteWorkspaceId('beef5678beef', 'wsA')));
    await t.call('GET', `/bibilen/api/state?workspaceId=${remoteWorkspaceId('beef5678beef', 'wsA')}`);
    assert.equal(host2.calls.length, 1); assert.equal(t.host.calls.length, 0);
  } finally {await host2.stop(); rmSync(dir2, {recursive: true, force: true}); await t.cleanup();}
});

test('duplicate command ids execute once (sequential, concurrent, and after a host restart)', async () => {
  const t = await setup({delayMs: 150});
  try {
    const start = id => t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'chief'}, headers: {'x-command-id': id}});
    const [r1, r2] = await Promise.all([start('cmd-1'), (async () => {await wait(30); return start('cmd-1');})()]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 409); const j2 = await r2.json(); assert.equal(j2.error, 'duplicate_command'); assert.equal(j2.state, 'inflight');
    const r3 = await start('cmd-1'); assert.equal(r3.status, 409); assert.equal((await r3.json()).state, 'done');
    assert.equal(t.host.calls.filter(c => c.method === 'POST').length, 1);
    // same id, different payload is a client bug, not a retry
    const r4 = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'other'}, headers: {'x-command-id': 'cmd-1'}});
    assert.equal(r4.status, 409); assert.equal((await r4.json()).error, 'command_id_reused');
    // restart the host with the same ledger file: command remains known
    const {port} = t.host; await t.host.stop();
    const host2 = await startHost({secret: t.secret, root: t.root, ledgerPath: t.ledgerPath, port});
    await wait(120); await t.link.hello();
    assert.equal(t.link.snapshot().status, 'online');
    const r5 = await start('cmd-1'); assert.equal(r5.status, 409);
    assert.equal(host2.calls.length, 0);
    t.host = host2;
  } finally {await t.cleanup();}
});

test('ambiguous disconnect is never replayed; outcome is reconciled by command id', async () => {
  const t = await setup({dropFirst: true});
  try {
    const r = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'chief'}, headers: {'x-command-id': 'cmd-amb'}});
    assert.equal(r.status, 502);
    const j = await r.json(); assert.equal(j.error, 'ambiguous_result'); assert.equal(j.commandId, 'cmd-amb');
    assert.equal(t.host.calls.filter(c => c.method === 'POST').length, 1); // no automatic retry
    await wait(200); await t.link.hello();
    const st = await t.link.commandStatus('cmd-amb');
    assert.equal(st.status, 200); assert.ok(['done', 'inflight', 'ambiguous'].includes(st.state));
    // a blind retry with the same id cannot start a second session
    const again = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'chief'}, headers: {'x-command-id': 'cmd-amb'}});
    assert.equal(again.status, 409);
    assert.equal(t.host.calls.filter(c => c.method === 'POST').length, 1);
    assert.equal((await t.link.commandStatus('missing-id')).status, 404);
  } finally {await t.cleanup();}
});

test('offline host blocks new work; reconnect restores it and reports the restart', async () => {
  const t = await setup();
  try {
    const bootBefore = t.link.snapshot().bootId;
    const {port} = t.host; await t.host.stop();
    await wait(450);
    assert.ok(['stale', 'offline'].includes(t.link.snapshot().status));
    const blocked = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'chief'}, headers: {'x-command-id': 'cmd-off'}});
    assert.equal(blocked.status, 503); assert.equal((await blocked.json()).error, 'host_unverified');
    const read = await t.call('GET', `/bibilen/api/state?workspaceId=${A}`);
    assert.ok([503].includes(read.status));
    const host2 = await startHost({secret: t.secret, root: t.root, ledgerPath: t.ledgerPath, port});
    t.host = host2; t.link.start();
    for (let i = 0; i < 40 && t.link.snapshot().status !== 'online'; i++) await wait(50);
    const snap = t.link.snapshot();
    assert.equal(snap.status, 'online'); assert.equal(snap.restarted, true); assert.notEqual(snap.bootId, bootBefore);
    const ok = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {role: 'chief'}, headers: {'x-command-id': 'cmd-after'}});
    assert.equal(ok.status, 200);
    assert.equal(host2.calls.filter(c => c.method === 'POST').length, 1); // the blocked command was never queued
  } finally {await t.cleanup();}
});

test('stale inventory revision and missing sandbox both stop new work', async () => {
  const t = await setup();
  try {
    const stale = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {}, headers: {'x-command-id': 'cmd-rev1', 'x-expected-revision': 'old-revision'}});
    assert.equal(stale.status, 409); assert.equal((await stale.json()).error, 'stale_inventory');
    const fresh = await t.call('POST', `/bibilen/api/sessions?workspaceId=${A}`, {body: {}, headers: {'x-command-id': 'cmd-rev2', 'x-expected-revision': 'rev-A-1'}});
    assert.equal(fresh.status, 200);
    assert.equal(t.host.calls.filter(c => c.method === 'POST').length, 1);
  } finally {await t.cleanup();}
  const u = await setup({sandboxReady: false});
  try {
    const r = await u.call('POST', `/bibilen/api/tasks?workspaceId=${A}`, {body: {}, headers: {'x-command-id': 'cmd-nosb'}});
    assert.equal(r.status, 503); assert.equal((await r.json()).error, 'sandbox_unavailable');
    assert.equal(u.host.calls.length, 0);
    // even a direct signed call to the host is refused
    const target = '/bibilen/api/tasks?workspaceId=wsA', body = Buffer.from('{}');
    const direct = await fetch(`http://127.0.0.1:${u.host.port}${target}`, {method: 'POST', headers: sign({secret: u.secret, hostId: HOST, method: 'POST', target, body, workspaceId: 'wsA', commandId: 'cmd-nosb2'}), body});
    assert.equal(direct.status, 503); assert.equal((await direct.json()).error, 'sandbox_unavailable');
  } finally {await u.cleanup();}
});

test('terminal websocket is bridged, dies with the host link, and nothing is queued across reconnects', async () => {
  const t = await setup();
  try {
    const open = () => new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${t.cport}/bibilen-session-terminal?id=s1&workspaceId=${A}`, 'bibilen-control');
      ws.once('open', () => resolve(ws)); ws.once('error', reject); ws.once('unexpected-response', (_q, r) => reject(new Error('status ' + r.statusCode)));
    });
    const ws = await open();
    const got = new Promise(r => ws.once('message', m => r(String(m))));
    ws.send('ls');
    assert.equal(await got, 'echo:ls');
    assert.deepEqual(t.host.upgrades, [{url: '/bibilen-session-terminal?id=s1&workspaceId=wsA', ws: 'wsA'}]);
    const closed = new Promise(r => ws.once('close', c => r(c)));
    const {port} = t.host; await t.host.stop();
    const code = await closed; assert.ok([1011, 1012, 1000, 1001, 1006].includes(code));
    // keystrokes typed while disconnected must not be replayed after reconnect
    const host2 = await startHost({secret: t.secret, root: t.root, ledgerPath: t.ledgerPath, port}); t.host = host2;
    for (let i = 0; i < 40 && !t.link.usable; i++) {await t.link.hello(); await wait(50);}
    const ws2 = await open(); const msgs = []; ws2.on('message', m => msgs.push(String(m)));
    await wait(100); assert.deepEqual(msgs, []);
    ws2.close();
    // unknown host / foreign workspace cannot be bridged
    await assert.rejects(new Promise((resolve, reject) => {const w = new WebSocket(`ws://127.0.0.1:${t.cport}/bibilen-session-terminal?id=s1&workspaceId=${X}`, 'bibilen-control'); w.once('open', resolve); w.once('error', reject);}));
  } finally {await t.cleanup();}
});

test('command ledger survives restarts and marks interrupted commands ambiguous', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ah-ledger-')); const path = join(dir, 'l.json');
  try {
    const a = new CommandLedger({path});
    assert.equal(a.begin('c1', 'fp').fresh, true);
    const b = new CommandLedger({path}); // simulated crash while c1 was in flight
    assert.equal(b.get('c1').state, 'ambiguous');
    assert.equal(b.begin('c1', 'fp').fresh, false);
    b.begin('c2', 'fp2'); b.finish('c2', 201);
    assert.equal(new CommandLedger({path}).get('c2').status, 201);
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('pre-flight reports missing sandbox prerequisites and Windows-drive state dirs', () => {
  const run = (cmd, args) => {if (args[1].includes('bwrap')) throw new Error('missing');};
  const r = runPreflight({platform: 'linux', run, readProc: () => 'Linux version 6.6 microsoft-standard-WSL2', stateDir: '/mnt/d/state'});
  assert.equal(r.sandboxReady, false); assert.ok(r.problems.includes('bubblewrap_missing') && r.problems.includes('state_dir_on_windows_drive')); assert.equal(r.wsl, true);
  assert.equal(runPreflight({platform: 'win32', run: () => {}, readProc: () => ''}).problems[0], 'host_not_linux');
  assert.equal(runPreflight({platform: 'linux', run: () => {}, readProc: () => '', stateDir: '/home/a/.pixel-agents'}).sandboxReady, true);
});

test('allowed-root checks resolve symlink escapes and prefix lookalikes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ah-root-')); const root = join(dir, 'proj'), evil = join(dir, 'proj-evil');
  mkdirSync(root); mkdirSync(evil); mkdirSync(join(root, 'sub'));
  try {
    assert.equal(rootAllowed([root], join(root, 'sub')), true);
    assert.equal(rootAllowed([root], evil), false); // string-prefix lookalike
    assert.equal(rootAllowed([root], join(dir, 'missing')), false);
    assert.equal(rootAllowed([root], join(root, '..', 'proj-evil')), false);
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('remote JSON responses retain central workspace identity at every context boundary',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ah-scope-'));try{
  const manager=new HostManager({hostsPath:join(root,'hosts.json'),secretsPath:join(root,'secrets.json')});
  manager.links.set(HOST,{info:{workspaces:[{id:'wsA'}]},effectiveStatus:()=> 'online',request:async()=>({status:200,headers:new Headers({'content-type':'application/json'}),body:Buffer.from(JSON.stringify({context:{workspaceId:'wsA',projectId:'pA'},tasks:[{workspaceId:'wsA'}]}))})});
  let body;const res={writeHead(){},end(value){body=JSON.parse(value);}};
  await manager.proxy({method:'GET',headers:{}},res,new URL('http://localhost/bibilen/api/state?workspaceId='+remoteWorkspaceId(HOST,'wsA')));
  assert.equal(body.context.workspaceId,remoteWorkspaceId(HOST,'wsA'));assert.equal(body.context.projectId,remoteWorkspaceId(HOST,'pA'));assert.equal(body.tasks[0].workspaceId,body.context.workspaceId);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('a scoped signed envelope still cannot enumerate account-level host records',async()=>{
 const t=await setup();try{
  for(const path of ['projects','portfolio','session-catalog','backups','sharing','viewer/projects']){const r=await t.link.request({method:'GET',path:'/bibilen/api/'+path+'?workspaceId=wsA',workspaceId:'wsA'});assert.equal(r.status,403,path);}
 }finally{await t.cleanup();}
});
