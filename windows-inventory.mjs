import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function windowsPath(path){const m=/^\/mnt\/([a-z])(?:\/(.*))?$/.exec(path??'');return m?m[1].toUpperCase()+':\\'+(m[2]??'').replace(/\//g,'\\'):null;}
const canonical=p=>String(p??'').replace(/\\/g,'/').replace(/\/$/,'').toLowerCase();
export function normalizeWindowsAgents(rows,cwd){
 const win=windowsPath(cwd);if(!win||!Array.isArray(rows))return null;
 return rows.filter(a=>a&&UUID.test(a.sessionId??'')&&canonical(a.cwd)===canonical(win)&&a.nativeAlive===true&&Number.isInteger(a.pid)&&a.pid>0)
  .map(a=>({...a,cwd,origin:'windows',nativeAlive:true}));
}
// A metadata-only native Windows query. Never sends a prompt, attaches, stops or resumes a CLI.
// Use the same configuration directory as the configured read-only transcript mirror.
export function createWindowsInventory({projectsRoot,platform=process.platform,execute=run,now=Date.now,ttl=4000}={}){
 const projects=windowsPath(projectsRoot);let flight=null,cache=null,at=-Infinity;
 if(platform!=='linux'||!projects)return null;
 const config=projects.replace(/\\projects\\?$/i,'');if(config===projects)return null;
 const literal=config.replace(/'/g,"''");
 const script=`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $OutputEncoding=[Console]::OutputEncoding; $env:CLAUDE_CONFIG_DIR='${literal}'; $cli=Get-Command claude -ErrorAction Stop; $raw=& $cli.Source agents --json --all; if($LASTEXITCODE -ne 0){exit 1}; $rows=@(ConvertFrom-Json ($raw -join "\n")); foreach($a in $rows){$live=$false; if($a.pid -gt 0){$p=Get-Process -Id $a.pid -ErrorAction SilentlyContinue; $live=($null -ne $p -and $p.ProcessName -eq 'claude')}; $a | Add-Member -NotePropertyName nativeAlive -NotePropertyValue $live -Force}; ConvertTo-Json -InputObject @($rows) -Depth 12 -Compress`;
 const args=['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
 return async cwd=>{
  if(now()-at>=ttl){flight??=(async()=>{try{const result=await execute('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',args,{timeout:8000,maxBuffer:2*1024*1024,encoding:'utf8',windowsHide:true});cache=JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim());if(!Array.isArray(cache))cache=null;}catch{cache=null;}finally{at=now();flight=null;}})();await flight;}
  return normalizeWindowsAgents(cache,cwd);
 };
}
