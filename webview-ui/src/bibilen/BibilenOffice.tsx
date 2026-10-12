import {HistorySearch} from './HistorySearch.js';
import {ProjectSummary} from './ProjectSummary.js';
import {ManagementCenter} from './ManagementCenter.js';
import {motionEnabled} from './motion.js';
import {workspaceStorage,workspaceId} from './workspace.js';
import {ProjectSwitcher} from './ProjectSwitcher.js';
import {OperationCenter} from './OperationCenter.js';
import {setCharacterStyle} from '../office/sprites/spriteData.js';
import {IntegrationsPanel} from './IntegrationsPanel.js';
import {lazy,Suspense,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {OfficeState} from '../office/engine/officeState.js';
import type {OfficeLayout} from '../office/types.js';
import {transport} from '../transport/index.js';
import {getState,getWorkOverview,getAppearance,getNotifications} from './api.js';
import {AppearancePanel,type Ambience} from './AppearancePanel.js';
import {makeLayout,COZY_ROOMS,type Theme} from './layouts.js';
import {ROSTER,residentId} from './roster.js';
import {syncResidents} from './residents.js';
import {SessionDirectory} from './SessionDirectory.js';
import {NotificationCenter} from './NotificationCenter.js';
import {memberName,workStatusLabels} from './work.js';
import {liveMemberLocation,type WorkLocation} from './work-presence.js';
import {syncWorkPresence} from './work-presence.js';
import {WorkDetail} from './WorkDetail.js';
import {workBadge} from './work.js';
import {TaskBoard} from './TaskBoard.js';
import {TaskComposer} from './TaskComposer.js';
const TaskConsole=lazy(()=>import('./TaskConsole.js').then(m=>({default:m.TaskConsole})));
import {TeamDirectory} from './TeamDirectory.js';
import type {BibilenTask,CommandState,CommandView,WorkOverview} from './types.js';
import './office.css';
import {Icon} from './Icon.js';
import {FloorPlan} from './FloorPlan.js';
import {ReceptionPreview} from './ReceptionPreview.js';
import {roomCamera,zoomAtCenter} from './camera.js';
import {ConnectionStatus} from './ConnectionStatus.js';

const ClaudePanel=lazy(()=>import('./ClaudePanel.js').then(m=>({default:m.ClaudePanel})));
const emptyState:CommandState={operator:false,settings:{maxConcurrent:3},tasks:[],events:[],serverTime:Date.now()};
const viewFromUrl=():CommandView=>{const value=new URLSearchParams(location.search).get('view');return ['office','operations','tasks','team','sessions','history'].includes(value??'')?value as CommandView:'office';};

export function BibilenOffice({office,onLayout,subagents,zoom,onZoom,panRef,onEditLayout,onAdvancedSettings}:{onEditLayout:()=>void;onAdvancedSettings:()=>void;office:OfficeState;subagents:Array<{id:number;label:string}>;onLayout:(layout:OfficeLayout)=>void;zoom:number;onZoom:(zoom:number)=>void;panRef:{current:{x:number;y:number}}}){
 const frameRef=useRef<HTMLDivElement>(null);
 const menuRef=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const dismiss=(e:PointerEvent)=>{const menu=menuRef.current;if(menu?.open&&!menu.contains(e.target as Node))menu.open=false;};const escape=(e:KeyboardEvent)=>{const menu=menuRef.current;if(e.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};},[]);
 useLayoutEffect(()=>{
  const frame=frameRef.current;const host=frame?.parentElement?.parentElement;
  if(!frame||!host)return;
  const fit=()=>{const box=frame.getBoundingClientRect();const origin=host.getBoundingClientRect();
   host.style.setProperty('--bb-canvas-left',`${box.left-origin.left}px`);
   host.style.setProperty('--bb-canvas-top',`${box.top-origin.top}px`);
   host.style.setProperty('--bb-canvas-width',`${box.width}px`);
   host.style.setProperty('--bb-canvas-height',`${box.height}px`);
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(frame);observer.observe(host);
  return()=>observer.disconnect();
 });
 const [officeConnection,setOfficeConnection]=useState(transport.state);
 useEffect(()=>transport.onStateChange(setOfficeConnection),[]);
 const [stateAvailable,setStateAvailable]=useState(false);
 const [lastStateCheck,setLastStateCheck]=useState<number|null>(null);
 const [unread,setUnread]=useState(0);
 const [online,setOnline]=useState(navigator.onLine);
 const [healthClock,setHealthClock]=useState(Date.now());
 useEffect(()=>{let alive=true;const refresh=()=>{setOnline(navigator.onLine);if(document.visibilityState==='visible')void getNotifications('all').then(n=>{if(alive)setUnread(n.items.filter(i=>!i.read).length);}).catch(()=>{});};refresh();const timer=setInterval(()=>{setHealthClock(Date.now());refresh();},10000);window.addEventListener('online',refresh);window.addEventListener('offline',refresh);window.addEventListener('focus',refresh);return()=>{alive=false;clearInterval(timer);window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);window.removeEventListener('focus',refresh);};},[]);
 const [lastWorkCheck,setLastWorkCheck]=useState<number|null>(null);
 const [work,setWork]=useState<WorkOverview>({inventoryAvailable:false,groups:[]});
 const [workTarget,setWorkTarget]=useState<{taskId?:string;sessionId?:string}|null>(()=>{const taskId=new URLSearchParams(location.search).get('task');return taskId?{taskId}:null;});
 const closeWork=useCallback(()=>{setWorkTarget(null);const url=new URL(location.href);url.searchParams.delete('task');history.replaceState({},'',url);},[]);
 const [characterLooks,setCharacterLooks]=useState<{style:'cozy'|'original';looks:Record<string,number>}>({style:'cozy',looks:{}});
 useEffect(()=>{let alive=true;const load=async()=>{try{const value=await getAppearance();if(alive){setCharacterStyle(value.style);setCharacterLooks(value);}}catch{}};void load();const timer=setInterval(load,3000);return()=>{alive=false;clearInterval(timer);};},[]);
 const [showIntegrations,setShowIntegrations]=useState(()=>new URLSearchParams(location.search).get('alerts')==='slack');
 const [showNotifications,setShowNotifications]=useState(false);const closeNotifications=useCallback(()=>setShowNotifications(false),[]);
 const [memberFocus,setMemberFocus]=useState<{sessionId:string;memberId:string;characterId:number;label:string}|null>(null);
 const [bindings,setBindings]=useState<Map<string,number>>(new Map());
 const [state,setState]=useState<CommandState>(emptyState);
 const [view,setViewState]=useState<CommandView>(viewFromUrl);
 const [selected,setSelected]=useState<number|null>(null);
 const [fullOffice,setFullOffice]=useState(true);
 const [showManagement,setShowManagement]=useState(false);
 const [showPlan,setShowPlan]=useState(false);
 const [showReceptionPreview,setShowReceptionPreview]=useState(false);
 const cameraStop=useRef<(()=>void)|null>(null);
 const cameraAnimation=useRef<number|null>(null);
 useEffect(()=>()=>{cameraStop.current?.();if(cameraAnimation.current!==null)cancelAnimationFrame(cameraAnimation.current);},[]);
 const changeOfficeZoom=(next:number)=>{
  cameraStop.current?.();office.cameraFollowId=null;office.cancelGreeterCamera();
  panRef.current=zoomAtCenter(panRef.current,zoom,next);onZoom(next);
 };
 const goToRoom=(index:number)=>{
  cameraStop.current?.();if(cameraAnimation.current!==null){cancelAnimationFrame(cameraAnimation.current);cameraAnimation.current=null;}
  office.cameraFollowId=null;office.cancelGreeterCamera();
  const layout=office.getLayout();
  const canvas=document.querySelector('canvas');
  if(index<0){const fit=canvas?Math.max(.25,Math.min(canvas.width/(layout.cols*16),canvas.height/(layout.rows*16))*.95):1;onZoom(fit);panRef.current={x:0,y:0};return;}
  const room=COZY_ROOMS[index];if(!canvas)return;
  const camera=roomCamera(layout,room,canvas);
  if(!motionEnabled()){onZoom(camera.zoom);panRef.current=camera.pan;return;}
  const from={...panRef.current},fromZoom=zoom,start=performance.now();
  const stop=()=>{if(cameraAnimation.current!==null)cancelAnimationFrame(cameraAnimation.current);cameraAnimation.current=null;window.removeEventListener('pointerdown',stop);};
  cameraStop.current=stop;window.addEventListener('pointerdown',stop,{once:true});
  const step=(now:number)=>{const t=Math.min(1,(now-start)/420),ease=1-Math.pow(1-t,3);onZoom(fromZoom+(camera.zoom-fromZoom)*ease);panRef.current={x:from.x+(camera.pan.x-from.x)*ease,y:from.y+(camera.pan.y-from.y)*ease};if(t<1)cameraAnimation.current=requestAnimationFrame(step);else{cameraAnimation.current=null;window.removeEventListener('pointerdown',stop);}};
  cameraAnimation.current=requestAnimationFrame(step);
 };
 useEffect(()=>{if(view!=='office')return;const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>goToRoom(-1)));return()=>cancelAnimationFrame(frame);},[view,stateAvailable]);
 const [composer,setComposer]=useState<string|null>(null);
 const [consoleTask,setConsoleTask]=useState<BibilenTask|null>(null);
 const [showClaude,setShowClaude]=useState(false);
 const [sessionTarget,setSessionTarget]=useState<string|null>(()=>new URLSearchParams(location.search).get('session'));
 const openSession=(id:string)=>{setSessionTarget(id);setView('sessions');const url=new URL(location.href);url.searchParams.set('session',id);url.searchParams.delete('task');history.replaceState({},'',url);};
 const [showAppearance,setShowAppearance]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>transport.onMessage(message=>{const m=message as unknown as {type:string;message?:string};if(m.type==='bibilenNotice'&&m.message)setNotice(m.message);}),[]);
 const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem(workspaceStorage('bb-theme')) as Theme)||'studio');
 const [ambience,setAmbience]=useState<Ambience>(()=>(localStorage.getItem(workspaceStorage('bb-ambience')) as Ambience)||'auto');
 const [clock,setClock]=useState(Date.now());
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{if(event.key!=='Escape'||(event.target instanceof Element&&event.target.closest('.xterm')))return;if(workTarget){event.preventDefault();closeWork();return;}
   if(showIntegrations)setShowIntegrations(false);
   else if(showNotifications)setShowNotifications(false);
   else if(showReceptionPreview)setShowReceptionPreview(false);
   else if(showPlan)setShowPlan(false);
   else if(showAppearance)setShowAppearance(false);
   else if(consoleTask)setConsoleTask(null);
   else if(composer)setComposer(null);
   else if(showClaude)setShowClaude(false);
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[composer,consoleTask,showAppearance,showPlan,showReceptionPreview,showClaude,workTarget,closeWork,showNotifications,showIntegrations]);
 useEffect(()=>{let alive=true;let pending=false;const refresh=async()=>{if(pending)return;pending=true;try{const value=await getWorkOverview();if(alive){setWork(value);setLastWorkCheck(Date.now());}}catch{if(alive)setWork({inventoryAvailable:false,groups:[]});}finally{pending=false;}};void refresh();const timer=setInterval(refresh,5000);return()=>{alive=false;clearInterval(timer);};},[]);
 useEffect(()=>syncWorkPresence(office,work.groups),[office,work,bindings]);
 const statePending=useRef<Promise<void>|null>(null);
 const reload=useCallback(()=>{if(statePending.current)return statePending.current;statePending.current=getState().then(value=>{setState(value);setStateAvailable(true);setLastStateCheck(Date.now());}).catch(()=>setStateAvailable(false)).finally(()=>{statePending.current=null;});return statePending.current;},[]);
 useEffect(()=>{void reload();const refresh=()=>{if(document.visibilityState==='visible')void reload();};const timer=setInterval(refresh,3000);window.addEventListener('bibilen-auth',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('bibilen-auth',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[reload]);
 useEffect(()=>{const update=()=>setBindings(syncResidents(office,subagents,state.tasks,work));update();const timer=setInterval(update,1000);return()=>clearInterval(timer);},[office,subagents,state.tasks,work]);
 useEffect(()=>{for(let i=0;i<ROSTER.length;i++){const palette=characterLooks.looks[ROSTER[i].key];if(!Number.isInteger(palette))continue;const ch=office.characters.get(bindings.get(ROSTER[i].key)??residentId(i));if(ch){ch.palette=palette;ch.hueShift=0;}}},[office,bindings,characterLooks]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[]);
 const setView=(next:CommandView)=>{setViewState(next);const url=new URL(location.href);url.searchParams.set('view',next);if(next!=='sessions')url.searchParams.delete('session');history.replaceState({},'',url);};
 const requestTask=(role='chief')=>{if(!state.operator){setNotice('İzleyici erişiminde görev verilemez.');return;}setComposer(role);};
 const changeTheme=(next:Theme)=>{const layout=makeLayout(next);office.rebuildFromLayout(layout);onLayout(layout);transport.send({type:'saveLayout',layout});setTheme(next);localStorage.setItem(workspaceStorage('bb-theme'),next);};
 const changeAmbience=(next:Ambience)=>{setAmbience(next);localStorage.setItem(workspaceStorage('bb-ambience'),next);};
 const focus=(i:number)=>{setMemberFocus(null);setSelected(i);const id=bindings.get(ROSTER[i].key)??residentId(i);office.selectedAgentId=id;office.cameraFollowId=id;setView('office');};
 useEffect(()=>{const timer=setInterval(()=>{const id=office.selectedAgentId;if(id===null)return;if(memberFocus){const current=liveMemberLocation(office,memberFocus.sessionId,memberFocus.memberId);if(id===memberFocus.characterId||id===current?.characterId)return;setMemberFocus(null);}const index=ROSTER.findIndex((r,i)=>(bindings.get(r.key)??residentId(i))===id);if(index>=0)setSelected(index);},250);return()=>clearInterval(timer);},[office,bindings,memberFocus]);
 const closeAgent=()=>{setMemberFocus(null);setSelected(null);office.selectedAgentId=null;office.cameraFollowId=null;};
 const focusMember=(sessionId:string,memberId:string,_place:WorkLocation,label:string)=>{const current=liveMemberLocation(office,sessionId,memberId);if(!current){setNotice('Bu karakter artık ofise bağlı değil.');return;}closeWork();setSelected(null);setMemberFocus({sessionId,memberId,characterId:current.characterId,label});office.cancelGreeterCamera();office.selectedAgentId=current.characterId;office.cameraFollowId=current.characterId;setFullOffice(true);setView('office');};
 const focusedTrace=memberFocus?work.groups.find(g=>g.sessionId===memberFocus.sessionId):undefined;
 const focusedMember=focusedTrace?.members.find(m=>m.id===memberFocus?.memberId);
 const focusedPlace=memberFocus?liveMemberLocation(office,memberFocus.sessionId,memberFocus.memberId):undefined;
 const active=state.tasks.filter(t=>!['completed','failed','stopped'].includes(t.status));
 const recentEvents=state.events.slice(0,5);
 const selectedRole=selected===null?null:ROSTER[selected];
 const liveByRole=useMemo(()=>new Map(active.map(t=>[t.role,t])),[active]);
 const synchronized=online&&officeConnection==='connected'&&stateAvailable&&work.inventoryAvailable&&!!lastStateCheck&&!!lastWorkCheck&&healthClock-lastStateCheck<30000&&healthClock-lastWorkCheck<30000;
 const hour=new Date(clock).getHours();
 const resolvedAmbience=ambience==='auto'?(hour>=19||hour<7?'night':'day'):ambience;
 return <div className={`bb-shell bb-view-${view} bb-ambience-${resolvedAmbience} ${fullOffice?'bb-full-office':'bb-hybrid'}`}>
  <header className="bb-masthead"><button className="bb-brand" aria-label="Agent House ana sayfa" onClick={()=>{closeAgent();setView('office');requestAnimationFrame(()=>goToRoom(-1));}}><span className="bb-mark">AH</span><span><strong>Agent House</strong><small>AJAN KOMUTA MERKEZİ</small></span></button><nav><button className="bb-mobile-action" onClick={()=>setShowNotifications(true)} aria-label="Bildirim merkezi" title="Bildirimler"><Icon name="bell"/>{unread>0&&<b className="bb-unread-badge" aria-label={`${unread} okunmamış bildirim`}>{unread>99?'99+':unread}</b>}</button><button disabled={!state.operator} className="bb-primary" aria-label="Yeni görev" onClick={()=>requestTask()}><Icon name="plus"/><span>Yeni görev</span></button><details ref={menuRef} className="bb-main-menu"><summary aria-label="Menü"><Icon name="menu"/></summary><div className="bb-menu-items"><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setShowManagement(true);}}><Icon name="operations"/>Yönetim merkezi</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setShowIntegrations(true);}}><Icon name="link"/>Kullanım ve bağlantılar</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setShowAppearance(true);}}><Icon name="settings"/>Ofis ayarları</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setView('team');}}><Icon name="team"/>Ekip</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setView('history');}}><Icon name="history"/>Geçmiş</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onEditLayout();}}><Icon name="plan"/>Yerleşimi düzenle</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onAdvancedSettings();}}><Icon name="settings"/>Gelişmiş ayarlar</button><small>{state.operator?'Yönetici erişimi':'İzleyici erişimi'}</small></div></details></nav></header>
  <ProjectSwitcher operator={state.operator}/>
  <div className={`bb-sync-status ${synchronized?'ready':'pending'}`} role="status"><i/>{synchronized?'Canlı bağlantı · proje ve oturumlar güncel':!online?'İnternet bağlantısı yok · görünen bilgiler son kayıttan':officeConnection!=='connected'?'Ofis bağlantısı yenileniyor · kayıtlar korunuyor':'Eşitleme bekleniyor · canlı durum doğrulanıyor'}{!synchronized&&<button onClick={()=>{void reload();void getWorkOverview().then(v=>{setWork(v);setLastWorkCheck(Date.now());}).catch(()=>setWork({inventoryAvailable:false,groups:[]}));}}>Yeniden kontrol et</button>}</div>
  <aside className="bb-rail" aria-label="Ana bölümler">{([['office','Ofis','home'],['operations','Operasyon','operations'],['tasks','Görevler','tasks'],['sessions','Oturumlar','terminal']] as const).map(([id,label,icon])=><button key={id} className={view===id?'active':''} aria-current={view===id?'page':undefined} onClick={()=>{setSessionTarget(null);if(id==='office'){closeAgent();requestAnimationFrame(()=>goToRoom(-1));}setView(id);}}><Icon name={icon}/>{label}{id==='tasks'&&active.length>0&&<b>{active.length}</b>}</button>)}<button disabled={!state.operator} className="bb-rail-create" onClick={()=>requestTask()}><Icon name="plus"/>Yeni görev</button></aside>
  {view==='office'&&<>
   <div className="bb-office-window-label"><span><i className="bb-dot live"/>Canlı ofis</span><div className="bb-cozy-controls"><button aria-label="Kat planı" onClick={()=>setShowPlan(true)} title="Kat planı"><Icon name="plan"/><span className="bb-control-label">Plan</span></button><button aria-label="Ofisi uzaklaştır" onClick={()=>changeOfficeZoom(Math.max(.25,zoom-.5))} title="Uzaklaştır"><Icon name="minus"/></button><button aria-label="Ofisi yakınlaştır" onClick={()=>changeOfficeZoom(Math.min(8,zoom+.5))} title="Yakınlaştır"><Icon name="plus"/></button><select aria-label="Odaya git" defaultValue="" onChange={e=>{goToRoom(Number(e.target.value));e.target.value='';}}><option value="" disabled>Odalar</option><option value="-1">Tüm ofis</option>{COZY_ROOMS.map((r,i)=><option key={r.label} value={i}>{r.label}</option>)}</select><button aria-label="Tüm ofisi göster" onClick={()=>{closeAgent();goToRoom(-1);}} title="Tüm ofis"><Icon name="expand"/></button></div></div>
   <div className="bb-office-frame" ref={frameRef} aria-hidden="true"/>
   {memberFocus&&<aside className="bb-role-card bb-session-focus"><button className="bb-close-agent" aria-label="Ajan kartını kapat" onClick={closeAgent}><Icon name="close"/></button><span className="bb-kicker">{workBadge(memberFocus.sessionId)} · Oturum ekibi</span><h2>{focusedMember?memberName(focusedMember):memberFocus.label}</h2><p>{focusedMember?focusedMember.liveState==='idle'?'Yeni mesaj için hazır':workStatusLabels[focusedMember.status]:'Oturum durumu güncelleniyor'}</p><p>{focusedPlace?.room??'Canlı konum bağlantısı sona erdi.'}</p>{focusedMember?.lastTool&&<p>Son işlem: {focusedMember.lastTool}</p>}<button onClick={()=>setWorkTarget({sessionId:memberFocus.sessionId})}>Bu oturumun ekip ve iş akışı</button><button onClick={()=>openSession(memberFocus.sessionId)}>Konuşmaya dön</button></aside>}
   {selectedRole&&!memberFocus&&<aside className="bb-role-card"><button className="bb-close-agent" aria-label="Ajan kartını kapat" onClick={closeAgent}><Icon name="close"/></button><div><span className={`bb-avatar ${liveByRole.has(selectedRole.key)?'busy':''}`}>{selectedRole.name.slice(0,2).toLocaleUpperCase('tr')}</span><div><small>{selectedRole.group}</small><h2>{selectedRole.name}</h2></div></div><p>{liveByRole.get(selectedRole.key)?.title??selectedRole.description}</p><button onClick={()=>requestTask(selectedRole.key)}>Bu uzmana görev ver</button>{work.groups.filter(g=>g.sessionId===office.agentSessionIds.get(bindings.get(selectedRole.key)??-99999)||g.members.some(m=>m.role===selectedRole.key)).map(g=><button key={g.sessionId} onClick={()=>setWorkTarget({sessionId:g.sessionId})}>{workBadge(g.sessionId)} · Ekip ve iş akışı</button>)}<details><summary>Yetenekleri</summary>{selectedRole.skills.map(s=><span key={s}>{s}</span>)}</details></aside>}
  </>}
  {view==='operations'&&<main className="bb-workspace"><OperationCenter tasks={state.tasks} work={work} office={office} stateAvailable={stateAvailable} lastCheck={lastWorkCheck} openWork={setWorkTarget} openSession={openSession} focusMember={focusMember}/></main>}
  {view==='tasks'&&<main className="bb-workspace"><ProjectSummary tasks={state.tasks} work={work} available={stateAvailable} operator={state.operator} onWork={id=>setWorkTarget({taskId:id})} onSession={openSession}/><details className="bb-task-connection" open={state.execution?.status!=='ready'||undefined}><summary>{state.execution?.status==='ready'?'Claude bağlantısı hazır':'Claude bağlantısını kontrol et'}</summary><ConnectionStatus operator={state.operator} value={state.execution} onChange={reload}/></details><TaskBoard available={stateAvailable} onNew={()=>requestTask()} tasks={state.tasks} operator={state.operator} onOpen={setConsoleTask} onSession={openSession} onWork={id=>setWorkTarget({taskId:id})} onChange={reload}/></main>}
  {view==='sessions'&&<main className="bb-workspace"><SessionDirectory operator={state.operator} office={office} focusMember={focusMember} execution={state.execution} onCheck={reload} initialSessionId={sessionTarget} onWork={id=>setWorkTarget({sessionId:id})} onTask={id=>{const task=state.tasks.find(t=>t.id===id);if(task)setConsoleTask(task);}}/></main>}
  {view==='team'&&<main className="bb-workspace"><TeamDirectory available={stateAvailable&&work.inventoryAvailable} operator={state.operator} workGroups={work.groups} openWork={id=>setWorkTarget({sessionId:id})} tasks={state.tasks} bindings={bindings} focus={focus} startTask={requestTask}/></main>}
  {view==='history'&&<main className="bb-workspace">{state.operator&&<HistorySearch onSession={openSession}/>}<TaskBoard available={stateAvailable} onNew={()=>requestTask()} tasks={state.tasks} operator={state.operator} history onOpen={setConsoleTask} onSession={openSession} onWork={id=>setWorkTarget({taskId:id})} onChange={reload}/>{state.operator&&<section className="bb-audit"><h2>İşlem geçmişi</h2>{recentEvents.map(e=><p key={e.id}><time>{new Date(e.at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time>{e.message}</p>)}</section>}</main>}
  <nav className="bb-mobile-nav" aria-label="Ana bölümler">{([['office','Ofis','home'],['operations','Operasyon','operations'],['tasks','Görevler','tasks'],['sessions','Oturumlar','terminal']] as const).map(([id,label,icon])=><button key={id} className={view===id?'active':''} aria-current={view===id?'page':undefined} onClick={()=>{setSessionTarget(null);if(id==='office'){closeAgent();requestAnimationFrame(()=>goToRoom(-1));}setView(id);}}><Icon name={icon}/><span>{label}</span></button>)}</nav>
  {composer&&<TaskComposer defaultRole={composer} execution={state.execution} onCheck={reload} close={()=>setComposer(null)} onCreated={()=>{reload();setView('tasks');}}/>}{consoleTask&&<Suspense fallback={<p role="status">Terminal yükleniyor…</p>}><TaskConsole task={consoleTask} close={()=>setConsoleTask(null)}/></Suspense>}
  {showClaude&&<Suspense fallback={<div className="bb-console">Çalışma paneli açılıyor…</div>}><ClaudePanel close={()=>setShowClaude(false)}/></Suspense>}{showAppearance&&<AppearancePanel operator={state.operator} office={office} theme={theme} changeTheme={changeTheme} ambience={ambience} changeAmbience={changeAmbience} maxConcurrent={state.settings.maxConcurrent} bindings={bindings} close={()=>setShowAppearance(false)} onSettings={reload}/>} 
  {showPlan&&<FloorPlan close={()=>setShowPlan(false)} preview={()=>{setShowPlan(false);setShowReceptionPreview(true);}} visit={index=>{setShowPlan(false);setFullOffice(true);closeAgent();requestAnimationFrame(()=>requestAnimationFrame(()=>goToRoom(index)));}}/>}
  {showReceptionPreview&&<ReceptionPreview close={()=>setShowReceptionPreview(false)}/>}
  {workTarget&&<WorkDetail operator={state.operator} {...workTarget} close={closeWork} onSession={id=>{closeWork();openSession(id);}} onConsole={task=>{closeWork();setConsoleTask(task);}} office={office} focusMember={focusMember}/>}
  {showIntegrations&&<IntegrationsPanel operator={state.operator} close={()=>setShowIntegrations(false)}/>}
  {showManagement&&<ManagementCenter state={state} work={work} connected={synchronized} close={()=>setShowManagement(false)} onSession={id=>{setShowManagement(false);openSession(id);}} onWork={id=>{setShowManagement(false);setWorkTarget({taskId:id});}}/>}
  {showNotifications&&<NotificationCenter operator={state.operator} close={closeNotifications} openNotification={n=>{if(n.workspaceId&&n.workspaceId!==workspaceId){location.assign(n.url);return;}if(n.source==='slack'){setShowIntegrations(true);}else if(n.sessionId&&!n.taskId){openSession(n.sessionId);}else if(n.taskId){setView(n.kind==='completed'?'history':'tasks');setWorkTarget({taskId:n.taskId});}else{setView('office');}}}/>}
  {state.operator&&<button className="bb-claude-fab" onClick={()=>{setSessionTarget(null);setView('sessions');}}><Icon name="terminal"/>Oturumlar</button>}{notice&&<button className="bb-toast" onClick={()=>setNotice('')}>{notice}</button>}
 </div>;
}
