#!/usr/bin/env node
// Provision an execution host (run on the host itself, e.g. inside WSL2).
//   node host-cli.mjs init --root /mnt/d/mobile-apps [--root ...] [--label "Windows WSL"]
//   node host-cli.mjs add-root /mnt/d/other-projects
//   node host-cli.mjs status
// `init` prints a one-time pairing token. Paste it into the central panel; never put it in chat or Git.
import {existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, realpathSync, statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {newSecret, encodePairing} from './host-protocol.mjs';
import {runPreflight} from './host-preflight.mjs';

const file = process.env.AGENT_HOUSE_HOST_CREDENTIAL ?? join(homedir(), '.pixel-agents', 'host-credential.json');
const [cmd, ...rest] = process.argv.slice(2);
const flags = (name) => rest.flatMap((v, i) => (v === name && rest[i + 1] ? [rest[i + 1]] : []));
const fail = (m) => {console.error(m); process.exit(1);};
const dirRoot = p => {const r = realpathSync(resolve(p)); if (!statSync(r).isDirectory()) throw new Error(p + ' is not a directory'); return r;};
const save = c => {mkdirSync(dirname(file), {recursive: true, mode: 0o700}); writeFileSync(file, JSON.stringify(c, null, 1), {mode: 0o600}); chmodSync(file, 0o600);};
const load = () => JSON.parse(readFileSync(file, 'utf8'));

try {
  if (cmd === 'init' || cmd === 'rotate') {
    const roots = flags('--root').map(dirRoot);
    if (!roots.length) fail('At least one --root <project-parent-folder> is required (the allowlist).');
    const exists = existsSync(file);
    if (cmd === 'init' && exists) fail('Credential already exists. Use "rotate" to issue a new secret.');
    const prev = exists ? load() : {};
    const c = {hostId: cmd === 'rotate' && prev.hostId ? prev.hostId : randomBytes(8).toString('hex'), secret: newSecret(), allowedRoots: roots.length ? roots : prev.allowedRoots, accountLabel: flags('--label')[0] ?? prev.accountLabel ?? ''};
    save(c);
    console.log('Host credential written to ' + file + ' (mode 0600).');
    console.log('Host id: ' + c.hostId + '\nAllowed roots: ' + c.allowedRoots.join(', '));
    console.log('\nPairing token (shown once, paste into the central panel; do not share):\n' + encodePairing(c));
  } else if (cmd === 'add-root') {
    const c = load(); const r = dirRoot(rest[0] ?? ''); if (!c.allowedRoots.includes(r)) c.allowedRoots.push(r); save(c); console.log('Allowed roots: ' + c.allowedRoots.join(', '));
  } else if (cmd === 'status') {
    const c = load(); console.log(JSON.stringify({hostId: c.hostId, allowedRoots: c.allowedRoots, accountLabel: c.accountLabel, preflight: runPreflight({stateDir: join(homedir(), '.pixel-agents')})}, null, 1));
  } else fail('Usage: host-cli.mjs init|rotate --root <dir>... | add-root <dir> | status');
} catch (e) {fail(e.message);}
