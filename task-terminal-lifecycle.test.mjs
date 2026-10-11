import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {watchTaskTerminal} from './task-terminal-lifecycle.mjs';
class Socket extends EventEmitter{readyState=1;close(){this.readyState=3;this.emit('close');}}
const terminal=()=>({onExit(fn){this.exit=fn;},kill(){this.killed=true;}});
test('late attach exit cannot unlock a replacement viewer',()=>{const map=new Map(),a=terminal(),b=terminal(),sa=new Socket(),sb=new Socket();watchTaskTerminal(map,'task',a,sa);sa.close();assert.equal(a.killed,true);watchTaskTerminal(map,'task',b,sb);a.exit();assert.equal(map.get('task'),b);assert.equal(sb.readyState,1);assert.equal(map.has('task'),true);sb.close();assert.equal(map.size,0);b.exit();assert.equal(map.size,0);});
test('natural attach exit closes its viewer and releases its own lock',()=>{const map=new Map(),p=terminal(),s=new Socket();watchTaskTerminal(map,'task',p,s);p.exit();assert.equal(map.size,0);assert.equal(s.readyState,3);});
