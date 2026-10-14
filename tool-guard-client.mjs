import {readFileSync} from 'node:fs';
let event='PreToolUse';
function output(decision,reason){console.log(JSON.stringify({hookSpecificOutput:event==='PermissionRequest'?{hookEventName:event,decision:{behavior:decision,message:reason}}:{hookEventName:event,permissionDecision:decision,permissionDecisionReason:reason}}));}
try{
 const config=JSON.parse(readFileSync(process.argv[2],'utf8'));let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>100000)throw Error('İstek çok büyük.');}const input=JSON.parse(raw);event=input.hook_event_name;
 if(!['PreToolUse','PermissionRequest'].includes(event))throw Error('Hook türü geçersiz.');
 if(config.conversationOnly===true){output('deny','Bu terminal sohbet modunda: başka proje işi sürerken araç çalıştırılamaz. İşler bittikten sonra terminali yeniden aç.');process.exit(0);}
 const response=await fetch(`http://127.0.0.1:${config.port}/bibilen/guard/check?workspaceId=${encodeURIComponent(config.workspaceId)}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.token},body:JSON.stringify({...input,guard_policy_revision:config.policyRevision??null,guard_runtime_revision:config.runtimeRevision??0}),signal:AbortSignal.timeout(130000)});
 if(!response.ok)throw Error('Koruma servisine ulaşılamadı.');const result=await response.json();
 if(result.decision==='normal'&&event==='PreToolUse')console.log('{}');else if(result.decision==='normal')output('deny','İzin sorusu canlı terminalden yanıtlanmalı; otomatik izin verilmedi.');else output(result.decision,result.reason);
}catch(error){event=['PreToolUse','PermissionRequest'].includes(event)?event:'PreToolUse';output('deny','Agent House koruması doğrulanamadı; araç çalıştırılmadı.');}
