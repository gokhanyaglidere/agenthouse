export function sessionOptions(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Oturum tercihleri geçersiz.');
 const model=input.model??null,effort=input.effort??null,mode=input.mode??'manual';
 if(model!==null&&(typeof model!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,99}$/.test(model)))throw Error('Model tercihi geçersiz.');
 if(effort!==null&&!['low','medium','high','xhigh','max'].includes(effort))throw Error('Efor tercihi geçersiz.');
 if(!['manual','plan','auto','acceptEdits'].includes(mode))throw Error('Çalışma modu geçersiz.');
 return {model,effort,mode};
}
export function sessionOptionArgs(options){const o=sessionOptions(options);return ['--permission-mode',o.mode,...(o.model?['--model',o.model]:[]),...(o.effort?['--effort',o.effort]:[])];}
