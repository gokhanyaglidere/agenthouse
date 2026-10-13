import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SessionManager} from './session-manager.mjs';
import {windowsTranscriptRoot} from './host-mode.mjs';

// Windows Claude transcripts seen from a Linux/WSL host. Path mapping (D:\x <-> /mnt/d/x) only exists on Linux.
const linux = {skip: process.platform !== 'linux' && 'Linux/WSL only'};
const ID = '9674c6e1-7a11-4c0e-8a3f-1d2e3f4a5b6c', OTHER = '11111111-2222-4333-8444-555555555555', FRESH = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const line = (cwd, text) => JSON.stringify({type: 'user', cwd, message: {role: 'user', content: text}, timestamp: new Date().toISOString()}) + '\n';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ah-winsess-'));
  const own = join(dir, 'wsl-home-projects', '-mnt-d-proj'), win = join(dir, 'winclaude', 'projects', 'D--proj');
  mkdirSync(own, {recursive: true}); mkdirSync(join(win, ID, 'subagents'), {recursive: true});
  writeFileSync(join(win, ID + '.jsonl'), line('D:\\proj', 'Windows oturumu başlığı'));
  writeFileSync(join(win, OTHER + '.jsonl'), line('D:\\baska-proje', 'başka proje')); // same folder name collision must not leak
  writeFileSync(join(win, FRESH + '.jsonl'), line('D:\\proj', 'şimdi çalışan'));
  utimesSync(join(win, ID + '.jsonl'), new Date(Date.now() - 3600_000), new Date(Date.now() - 3600_000));
  writeFileSync(join(win, ID, 'subagents', 'agent-abc.meta.json'), '{}');
  const manager = new SessionManager({cwd: '/mnt/d/proj', root: own, extraRoots: [win], listAgents: async () => [], storePath: join(dir, 'store.json'), allowedRoots: new Set(['chief'])});
  return {dir, own, win, manager};
}

test('Windows transcript folder is derived from the Windows drive path', linux, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ah-winroot-')); const projects = join(dir, 'projects');
  mkdirSync(join(projects, 'D--One-Line'), {recursive: true}); mkdirSync(join(projects, 'D--One-Line-ux'), {recursive: true});
  try {
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/One-Line'), join(projects, 'D--One-Line'));
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/One-Line-ux'), join(projects, 'D--One-Line-ux')); // siblings stay separate
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/Missing'), null);
    assert.equal(windowsTranscriptRoot(projects, '/home/ahost/agenthouse'), null); // WSL-native project: not a Windows path
    assert.equal(windowsTranscriptRoot(null, '/mnt/d/One-Line'), null);
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('Windows sessions are listed read-only and scoped to the project', linux, async () => {
  const f = fixture();
  try {
    const {sessions} = await f.manager.list();
    const ids = sessions.map(s => s.id);
    assert.ok(ids.includes(ID) && ids.includes(FRESH));
    assert.ok(!ids.includes(OTHER), 'a transcript whose recorded cwd is another project must not appear');
    const old = sessions.find(s => s.id === ID), fresh = sessions.find(s => s.id === FRESH);
    assert.equal(old.origin, 'windows'); assert.equal(old.canOpen, false); assert.equal(old.status, 'history'); assert.equal(old.canStop, false);
    assert.equal(fresh.status, 'external'); assert.match(fresh.note, /yalnızca izlenebilir/);
    assert.equal(f.manager.isExternal(ID), true);
    assert.equal(f.manager.rootFor(ID), f.win);
  } finally {rmSync(f.dir, {recursive: true, force: true});}
});

test('Windows sessions cannot be resumed or taken over from the host', linux, async () => {
  const f = fixture();
  try {
    await assert.rejects(f.manager.connect(ID, {send() {}, on() {}, readyState: 1}), /yalnızca izlenebilir/);
    await assert.rejects(f.manager.takeover(ID), /yalnızca izlenebilir/);
    const t = await f.manager.transcript(ID); // reading the transcript still works
    assert.ok(Array.isArray(t.messages));
  } finally {rmSync(f.dir, {recursive: true, force: true});}
});
