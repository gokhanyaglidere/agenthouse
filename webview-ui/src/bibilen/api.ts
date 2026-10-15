import {scopedUrl,workspaceId} from './workspace.js';
import type { BibilenTask,CommandState,Priority,ExecutionStatus } from './types.js';

async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),30000);
  try{
  const response=await fetch(scopedUrl(`/bibilen/api/${path}`),{
    ...init,signal:init.signal??abort.signal,
    headers:{'Content-Type':'application/json',...init.headers},
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error??'İşlem tamamlanamadı.');
  if(workspaceId&&body.context?.workspaceId&&body.context.workspaceId!==workspaceId)throw new Error('Sunucu başka bir projenin kaydını döndürdü.');
  return body as T;
  }finally{clearTimeout(timeout);}
}
export const getState=()=>request<CommandState>('state');
export const checkExecution=()=>request<{execution:ExecutionStatus}>('execution-check',{method:'POST'});
export const createTask=(input:{title:string;prompt:string;role:string;priority:Priority;dependencies?:Array<{taskId:string;condition:'completed'|'accepted'}>;runMinutes?:number|null;limitAction?:'notify'|'stop'})=>request<{task:BibilenTask}>('tasks',{method:'POST',body:JSON.stringify(input)});
export const stopTask=(id:string)=>request<{task:BibilenTask}>(`tasks/${id}/stop`,{method:'POST'});
export const getTaskLogs=(id:string)=>request<{logs:string}>(`tasks/${id}/logs`);
export const updateSettings=(maxConcurrent:number)=>request<{settings:{maxConcurrent:number}}>('settings',{method:'POST',body:JSON.stringify({maxConcurrent})});
function decode(value:string){const padding='='.repeat((4-value.length%4)%4);const raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
export async function enablePush(){
  if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Bu tarayıcı bildirimleri desteklemiyor.');
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches)throw new Error('iPhone/iPad’de önce bu paneli Safari’den Ana Ekrana Ekle; ardından o kısayoldan açarak bildirimleri etkinleştir.');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Bildirim izni verilmedi.');
  const registration=await navigator.serviceWorker.register('/bibilen-sw.js');
  await navigator.serviceWorker.ready;
  const {publicKey}=await request<{publicKey:string}>('push-key');
  let existing=await registration.pushManager.getSubscription();
  const expected=decode(publicKey);const actual=existing?.options.applicationServerKey;
  if(existing&&actual&&(new Uint8Array(actual).length!==expected.length||new Uint8Array(actual).some((v,i)=>v!==expected[i]))){await existing.unsubscribe();existing=null;}
  const subscription=existing??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)});
  await request('push-subscriptions',{method:'POST',body:JSON.stringify(subscription)});
}
export const getSessions=()=>request<{sessions:import('./types.js').ClaudeSession[];inventoryAvailable:boolean}>('sessions');
export const newSession=(title:string,role:string,options?:{model:string|null;effort:string|null;mode:string})=>request<{session:{id:string}}> ('sessions',{method:'POST',body:JSON.stringify({title,role,options})});
export const getTranscript=(id:string,before?:number)=>request<{messages:import('./types.js').ConversationMessage[];nextBefore:number|null}>(`sessions/${encodeURIComponent(id)}/transcript${before===undefined?'':`?before=${before}`}`);
export const stopSession=(id:string)=>request<{ok:boolean}>(`sessions/${encodeURIComponent(id)}/stop`,{method:'POST'});
export const getWorkOverview=()=>request<import('./types.js').WorkOverview>('work/overview');
export const getSessionWork=(id:string)=>request<import('./types.js').WorkTrace>(`sessions/${encodeURIComponent(id)}/work`);
export const getTaskWork=(id:string)=>request<{task:BibilenTask;trace:import('./types.js').WorkTrace|null;events:import('./types.js').TaskEvent[]}>(`tasks/${encodeURIComponent(id)}/work`);

export const getNotifications=(scope:'project'|'all'='project')=>request<import('./types.js').NotificationState>(`notifications?scope=${scope}`);
export const updateNotificationPreferences=(input:Partial<import('./types.js').NotificationState['preferences']>)=>request<import('./types.js').NotificationState>('notifications/preferences?scope=all',{method:'POST',body:JSON.stringify(input)});
export const markNotificationsRead=(id?:string,scope:'project'|'all'='project')=>request<import('./types.js').NotificationState>(`notifications/read?scope=${scope}`,{method:'POST',body:JSON.stringify({id})});
export async function pushEnabled(){if(!('Notification'in window)||Notification.permission!=='granted'||!('serviceWorker'in navigator)||!('PushManager'in window))return false;const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();if(!subscription)return false;const status=await request<{registered:boolean}>('push-status',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});return status.registered;}
export async function disablePush(){const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();if(subscription){await request('push-unsubscribe',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe();}}

export const updateDeliveryPreferences=(input:Partial<import('./types.js').DeliveryPreferences>)=>request<import('./types.js').NotificationState>('notifications/delivery?scope=all',{method:'POST',body:JSON.stringify(input)});
export const getChanges=(id:string)=>request<{files:Array<{path:string;diff:string;limited?:boolean;untracked?:boolean;missing?:boolean;unavailable?:boolean}>;note:string}>(`sessions/${encodeURIComponent(id)}/changes`);

export const sendNotificationTest=()=>request<import('./types.js').NotificationState>('notifications/test?scope=all',{method:'POST',body:'{}'});

export const getUsage=()=>request<import('./IntegrationsPanel.js').UsageState>('usage');
export const getIntegrations=()=>request<import('./IntegrationsPanel.js').IntegrationState>('integrations');
export const checkIntegrations=()=>request<import('./IntegrationsPanel.js').IntegrationState>('integrations/check',{method:'POST',body:'{}'});
export const configureSlack=(input:{channel:string;token?:string})=>request('integrations/slack',{method:'POST',body:JSON.stringify(input)});

export const getReports=()=>request<import('./DailyReportsCard.js').ReportState>('reports');
export const updateReportSettings=(input:Partial<import('./DailyReportsCard.js').ReportState['settings']>)=>request<import('./DailyReportsCard.js').ReportState>('reports/settings',{method:'POST',body:JSON.stringify(input)});
export const prepareReport=()=>request<import('./DailyReportsCard.js').ReportState>('reports/prepare',{method:'POST',body:'{}'});

export const getAppearance=()=>request<{style:'cozy'|'original';looks:Record<string,number>;revision:number}>('appearance');
export const updateAppearance=(input:{style?:'cozy'|'original';role?:string;palette?:number})=>request('appearance',{method:'POST',body:JSON.stringify(input)});

export const getOperations=()=>request<import('./OperationsCard.js').OperationsState>('operations');
export const prepareOperation=(input:{kind:string;sourceId?:string;notes?:string})=>request<{task:BibilenTask;reused:boolean}>('operations/tasks',{method:'POST',body:JSON.stringify(input)});

export interface ProjectInventory {defaultWorkspaceId:string;projects:Array<{id:string;name:string}>;workspaces:Array<{id:string;projectId:string;root?:string;runtime:string;remote?:boolean;hostName?:string;hostStatus?:string}>;admission:{limit:number;active:number};}
export const getProjects=()=>request<ProjectInventory>('projects');
export const registerProject=(name:string,path:string,templates=false)=>request<{workspace:{id:string};capabilities:CapabilityInventory}>('projects',{method:'POST',body:JSON.stringify({name,path,templates})});
export const getPortfolio=()=>request<{items:Array<{workspaceId:string;projectId:string;name:string;available:boolean;tasks:BibilenTask[];inventoryAvailable:boolean;connectedSessions:number;workingMembers:Array<{sessionId:string;id:string;label:string;role:string|null}>}>;admission:{limit:number;active:number}}>('portfolio');

export const getSessionCatalog=()=>request<{sessions:import('./types.js').CatalogSession[];inventoryAvailable:boolean;source:string}>('session-catalog');
export const getCatalogTranscript=(key:string,before?:number)=>request<{messages:import('./types.js').ConversationMessage[];nextBefore:number|null}>(`session-catalog/${encodeURIComponent(key)}/transcript${before===undefined?'':`?before=${before}`}`);

export const takeoverSession=(id:string)=>request<{session:import('./types.js').ClaudeSession}>(`sessions/${encodeURIComponent(id)}/takeover`,{method:'POST'});

export interface BackupState{last:{id:string;at:number;files:number;bytes:number}|null;count:number;error:string|null;retention:number}
export const getBackups=()=>request<BackupState>('backups');
export const createBackup=()=>request<BackupState>('backups',{method:'POST'});

export async function downloadBackup(){
 const archive=await request<unknown>('backups/export');
 const url=URL.createObjectURL(new Blob([JSON.stringify(archive)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`agent-house-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export interface ProjectToolPolicy{toolRevision:number|null;allowNewWork:boolean;updatedAt:number|null;toolMode:'guarded'|'readonly';deniedPaths:string[];deniedTools:string[];allowedDomains:string[]}
export const getProjectPolicy=()=>request<ProjectToolPolicy>('project-policy');
export const updateProjectPolicy=(allowNewWork:boolean,extra:Partial<ProjectToolPolicy>={})=>request<ProjectToolPolicy>('project-policy',{method:'POST',body:JSON.stringify({allowNewWork,...extra})});

export interface ToolApproval{id:string;sessionId:string;tool:string;input:Record<string,unknown>;files:string[];reason:string;createdAt:number;expiresAt:number;status:string}
export const getApprovals=()=>request<{pending:ToolApproval[];history:ToolApproval[];checkedAt:number|null;checkedSessions:string[]}>('approvals');
export const decideApproval=(id:string,decision:'allow'|'deny')=>request<{ok:boolean}>(`approvals/${id}`,{method:'POST',body:JSON.stringify({decision})});

export interface SkillChoice{id:string;name:string;source:string}
export const getSkillCatalog=()=>request<{skills:SkillChoice[]}>('skills');
export const getSkillInstruction=(id:string)=>request<SkillChoice&{body:string}>(`skills/${encodeURIComponent(id)}`);

export interface ConversationSearchResult {matches:Array<{sessionId:string;title:string;messageId:string;role:string;timestamp:string|null;excerpt:string}>;nextCursor:string|null;pages:number;unreadableSessions:number;totalSessions:number;inventoryAvailable:boolean}
export const searchConversations=(query:string,cursor?:string)=>request<ConversationSearchResult>(`conversation-search?q=${encodeURIComponent(query)}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);

export interface SharingState{webAccess?:{enabled:boolean;origin:string|null};error:string|null;grants:Array<{id:string;login:string;name:string;expiresAt:number;active:boolean}>;items:Array<{id:string;kind:'task'|'session';sourceId:string;workspaceId:string;title:string;summary:string;updatedAt:number}>;audit:Array<{id:string;actor:string;action:string;at:number}>}
export const getSharing=()=>request<SharingState>('sharing');
export const grantObserver=(input:{login:string;name:string;days:number})=>request<SharingState>('sharing/grants',{method:'POST',body:JSON.stringify(input)});
export const revokeObserver=(id:string)=>request<SharingState>(`sharing/grants/${encodeURIComponent(id)}/revoke`,{method:'POST',body:'{}'});
export const publishObserverItem=(input:{kind:string;sourceId:string;title:string;summary:string})=>request<SharingState>('sharing/items',{method:'POST',body:JSON.stringify(input)});
export const removeObserverItem=(id:string)=>request<SharingState>(`sharing/items/${encodeURIComponent(id)}/remove`,{method:'POST',body:'{}'});

export interface CapabilityInventory{workspaceId?:string;projectId?:string;hostId?:string;revision:string;scannedAt:number;agents:Array<{key:string;name:string;description:string;group?:string;skills:string[];skillLinks?:Array<{name:string;available:boolean;reason?:string|null}>}>;skills:Array<SkillChoice&{scope:string;native:boolean}>;diagnostics:Array<{path:string;message:string}>;instructions:string[];}
export const getCapabilities=()=>request<CapabilityInventory>('capabilities');

export const reviewTask=(id:string,decision:string,note:string)=>request<{task:BibilenTask}>(`tasks/${id}/review`,{method:'POST',body:JSON.stringify({decision,note})});
export interface ProjectContextState{decisions:Array<{id:string;text:string;active:boolean;actor:string;at:number}>;readiness:{tools:Array<{name:string;available:boolean}>;manifests:string[];scripts:string[];warning:string|null;message:string};}
export const getProjectContext=()=>request<ProjectContextState>('project-context');
export const addProjectDecision=(text:string)=>request<ProjectContextState>('project-context',{method:'POST',body:JSON.stringify({text})});
export const archiveProjectDecision=(id:string)=>request<ProjectContextState>(`project-context/${id}/archive`,{method:'POST',body:'{}'});

export const setRemoteControlUrl=(id:string,url:string)=>request<{session:import('./types.js').ClaudeSession}>(`sessions/${encodeURIComponent(id)}/remote-control`,{method:'POST',body:JSON.stringify({url})});
