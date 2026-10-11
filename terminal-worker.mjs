// One detached owner per PTY. Gateway disconnects do not terminate Claude.
import net from 'node:net';import {readFileSync,unlinkSync,chmodSync} from 'node:fs';import * as pty from 'node-pty';
const configPath=process.argv[2];const config=JSON.parse(readFileSync(configPath,'utf8'));unlinkSync(configPath);
const terminal=pty.spawn(config.command,config.args,{name:'xterm-256color',cols:100,rows:32,cwd:config.cwd,env:{...process.env,TERM:'xterm-256color'}});
let output='',client=null,stopped=false;
const send=value=>{if(client&&!client.destroyed)client.write(JSON.stringify(value)+'\n');};
terminal.onData(data=>{output=(output+data).slice(-65536);send({type:'data',data});});
const server=net.createServer(socket=>{let buffer='';if(client){socket.end(JSON.stringify({type:'busy'})+'\n');return;}client=socket;send({type:'ready',pid:terminal.pid,key:config.key,workspaceId:config.workspaceId,projectId:config.projectId});if(output)send({type:'data',data:output});
 socket.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>200000){socket.destroy();return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const m=JSON.parse(line);if(m.type==='input'&&typeof m.data==='string'&&m.data.length<=32768)terminal.write(m.data);else if(m.type==='resize'&&Number.isInteger(m.cols)&&Number.isInteger(m.rows)&&m.cols>=20&&m.cols<=300&&m.rows>=5&&m.rows<=120)terminal.resize(m.cols,m.rows);else if(m.type==='stop')terminal.kill();}catch{}}});
 socket.on('error',()=>{});socket.on('close',()=>{if(client===socket)client=null;});
});
server.listen(config.socket,()=>chmodSync(config.socket,0o600));
const finish=exitCode=>{if(stopped)return;stopped=true;send({type:'exit',exitCode});client?.end();server.close();try{unlinkSync(config.socket);}catch{}setTimeout(()=>process.exit(exitCode??0),50);};
terminal.onExit(({exitCode})=>finish(exitCode));server.on('error',()=>{terminal.kill();finish(1);});process.on('SIGTERM',()=>terminal.kill());
