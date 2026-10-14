import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {windowsPath} from './windows-inventory.mjs';
const executeDefault=promisify(execFile);
const UUID=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
// Run only after an explicit operator takeover request. Revalidate on Windows immediately
// before stopping: exact session/cwd, idle interactive process, exact Claude executable.
export function createWindowsHandoff({projectsRoot,platform=process.platform,execute=executeDefault}={}){
 const projects=windowsPath(projectsRoot);if(platform!=='linux'||!projects||!projects.endsWith('\\projects'))return null;
 const literal=value=>String(value).replace(/'/g,"''");const config=projects.slice(0,-9);
 return async({sessionId,cwd})=>{
  const win=windowsPath(cwd);if(!UUID.test(sessionId??'')||!win)throw Error('Windows oturum kimliği veya proje yolu geçersiz.');
  const script=`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $env:CLAUDE_CONFIG_DIR='${literal(config)}'; $cli=Get-Command claude -ErrorAction Stop; $raw=& $cli.Source agents --json --all; if($LASTEXITCODE -ne 0){throw 'inventory_failed'}; $rows=@(ConvertFrom-Json ($raw -join "\n") | ForEach-Object { $_ }); $found=@($rows | Where-Object {$_.sessionId -eq '${sessionId}' -and $_.cwd.TrimEnd('\\') -ieq '${literal(win)}'.TrimEnd('\\')}); if($found.Count -ne 1){throw 'session_changed'}; $a=$found[0]; $state=if($a.state){$a.state}else{$a.status}; if($a.kind -ne 'interactive' -or $state -ne 'idle' -or $a.pid -le 1){throw 'session_not_idle'}; $p=Get-Process -Id $a.pid -ErrorAction Stop; if($p.ProcessName -ne 'claude' -or $p.Path -ine $cli.Source){throw 'process_identity_mismatch'}; Stop-Process -Id $p.Id -ErrorAction Stop; if(-not $p.WaitForExit(5000)){throw 'exit_unconfirmed'}; Write-Output '{"stopped":true}'`;
  try{const result=await execute('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{timeout:12000,maxBuffer:1024*1024,encoding:'utf8',windowsHide:true});if(JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim()).stopped!==true)throw Error();}
  catch{throw Error('Windows oturumu boşta ve doğru Claude süreci olarak doğrulanamadı veya kapanış doğrulanamadı. İkinci oturum açılmadı.');}
 };
}
