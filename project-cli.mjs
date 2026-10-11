// Local owner onboarding; registering does not start another project's worker.
import {ProjectRegistry} from './project-registry.mjs';
const registry=new ProjectRegistry();
const [command,...args]=process.argv.slice(2);
try {
 if(command==='register') {
  const [name,path]=args;
  if(!name||!path)throw new Error('Kullanım: node project-cli.mjs register "Proje adı" /tam/klasör/yolu');
  const workspace=registry.register({name,path});
  console.log(JSON.stringify({projectId:workspace.projectId,workspaceId:workspace.id,runtime:'registered'},null,2));
 } else if(command==='list') console.log(JSON.stringify(registry.publicState({paths:true}),null,2));
 else if(command==='verify') {
  const context=registry.context(args[0]);
  console.log(JSON.stringify({projectId:context.projectId,workspaceId:context.workspaceId,projectName:context.projectName,roles:context.roles,verified:true},null,2));
 } else throw new Error('Komutlar: list | register "Proje adı" /tam/yol | verify çalışma-ortamı-kimliği');
} catch(error) { console.error(error.message); process.exitCode=1; }
