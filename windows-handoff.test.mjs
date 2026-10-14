import {test} from 'node:test';import assert from 'node:assert/strict';import {createWindowsHandoff} from './windows-handoff.mjs';
const id='12345678-1234-4234-8234-123456789012';
test('native idle-stop command verifies exact session, project, state and executable and never starts Claude work',async()=>{
 let calls=0;const stop=createWindowsHandoff({projectsRoot:'/mnt/c/Users/Owner/.claude/projects',platform:'linux',execute:async(command,args,options)=>{calls++;const script=Buffer.from(args.at(-1),'base64').toString('utf16le');assert.match(command,/powershell.exe$/);assert.match(script,/session_not_idle/);assert.match(script,/process_identity_mismatch/);assert.ok(script.includes(id));assert.ok(script.includes("D:\\One-Line"));assert.match(script,/agents --json --all/);assert.doesNotMatch(script,/--resume|--bg|--print|--dangerously/);assert.equal(options.timeout,12000);return {stdout:'{"stopped":true}'};}});
 await stop({sessionId:id,cwd:'/mnt/d/One-Line'});assert.equal(calls,1);await assert.rejects(stop({sessionId:'bad; anything',cwd:'/mnt/d/One-Line'}));assert.equal(calls,1);
});
test('native stop fails closed on platform mismatch, command failure or unconfirmed exit',async()=>{
 assert.equal(createWindowsHandoff({projectsRoot:'/mnt/c/X/projects',platform:'darwin'}),null);
 for(const execute of [async()=>{throw Error('busy');},async()=>({stdout:'{}'})]){const stop=createWindowsHandoff({projectsRoot:'/mnt/c/X/projects',platform:'linux',execute});await assert.rejects(stop({sessionId:id,cwd:'/mnt/d/One-Line'}),/İkinci oturum açılmadı/);}
});
