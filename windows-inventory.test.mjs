import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWindowsInventory,normalizeWindowsAgents} from './windows-inventory.mjs';
const id='12345678-1234-4234-8234-123456789012';
const agent={sessionId:id,cwd:'D:\\One-Line',pid:42,kind:'interactive',state:'busy',nativeAlive:true};
test('native Windows inventory requires a live Windows process and exact project scope',()=>{
 const rows=[agent,{...agent,cwd:'D:\\One-Line-other'},{...agent,nativeAlive:false},{...agent,sessionId:'bad'},{...agent,pid:-1}];
 assert.deepEqual(normalizeWindowsAgents(rows,'/mnt/d/One-Line'),[{...agent,cwd:'/mnt/d/One-Line',origin:'windows'}]);
 assert.equal(normalizeWindowsAgents(null,'/mnt/d/One-Line'),null);
});
test('fixed read-only query uses the transcript config and caches concurrent calls',async()=>{
 let calls=0,time=100;const execute=async(command,args,options)=>{calls++;assert.match(command,/powershell.exe$/);assert.equal(options.timeout,8000);const script=Buffer.from(args.at(-1),'base64').toString('utf16le');assert.match(script,/agents --json --all/);assert.match(script,/CLAUDE_CONFIG_DIR='C:\\Users\\Owner\\.claude'/);assert.doesNotMatch(script,/--resume|--bg| stop |--print/);return {stdout:JSON.stringify([agent])};};
 const inventory=createWindowsInventory({projectsRoot:'/mnt/c/Users/Owner/.claude/projects',platform:'linux',execute,now:()=>time});
 const [a,b]=await Promise.all([inventory('/mnt/d/One-Line'),inventory('/mnt/d/Other')]);assert.equal(a.length,1);assert.equal(b.length,0);assert.equal(calls,1);
 await inventory('/mnt/d/One-Line');assert.equal(calls,1);time+=5000;await inventory('/mnt/d/One-Line');assert.equal(calls,2);
});
test('failed Windows query is unavailable and cannot masquerade as an empty live inventory',async()=>{
 const inventory=createWindowsInventory({projectsRoot:'/mnt/c/Users/Owner/.claude/projects',platform:'linux',execute:async()=>{throw Error('interop unavailable');}});
 assert.equal(await inventory('/mnt/d/One-Line'),null);
 assert.equal(createWindowsInventory({projectsRoot:'/home/user/.claude/projects',platform:'linux'}),null);
 assert.equal(createWindowsInventory({projectsRoot:'/mnt/c/Users/Owner/.claude/projects',platform:'darwin'}),null);
});
