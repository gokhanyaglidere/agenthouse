// Sandbox prerequisites for a Linux/WSL2 execution host. Claude Code's sandbox needs bubblewrap and socat;
// the gateway already launches Claude with sandbox.failIfUnavailable, so a host without them must not take work.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

function has(bin, run = execFileSync) {
  try {run('sh', ['-c', `command -v ${bin}`], {stdio: 'ignore', timeout: 3000}); return true;} catch {return false;}
}

export function runPreflight({platform = process.platform, run = execFileSync, readProc = p => readFileSync(p, 'utf8'), stateDir = ''} = {}) {
  const problems = [];
  if (platform !== 'linux') problems.push('host_not_linux');
  if (!has('bwrap', run)) problems.push('bubblewrap_missing');
  if (!has('socat', run)) problems.push('socat_missing');
  if (!has('claude', run)) problems.push('claude_missing');
  // The gateway keeps 0600 state and lock files; those semantics are not reliable on Windows drives mounted in WSL.
  if (/^\/mnt\/[a-z](\/|$)/i.test(stateDir)) problems.push('state_dir_on_windows_drive');
  let wsl = false;
  try {wsl = /microsoft/i.test(readProc('/proc/version'));} catch {}
  return {sandboxReady: problems.length === 0, problems, platform, wsl};
}

// Cached wrapper: probing shells out, so it is refreshed at most every 30 seconds.
export function cachedPreflight(options = {}, ttlMs = 30_000, now = Date.now) {
  let at = -Infinity, value = null;
  return () => {if (!value || now() - at > ttlMs) {value = runPreflight(options); at = now();} return value;};
}
