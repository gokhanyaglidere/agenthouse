export type TaskStatus = 'queued'|'starting'|'running'|'waiting'|'completed'|'failed'|'stopped';
export type Priority = 'normal'|'high'|'urgent';
export interface BibilenTask {
  id:string;title:string;prompt?:string;role:string;priority:Priority;status:TaskStatus;
  stage?:'queued'|'starting'|'researching'|'coding'|'testing'|'working'|'waiting'|'done'|'failed'|'stopped';
  createdAt:number;startedAt:number|null;completedAt:number|null;sessionId?:string|null;
  summary?:string;error?:string;queueReason?:string;
}
export interface TaskEvent {id:string;taskId:string|null;type:string;message:string;at:number}
export interface CommandState {
  operator:boolean;settings:{maxConcurrent:number;writeConcurrency?:number};tasks:BibilenTask[];events:TaskEvent[];serverTime:number;
  execution?:ExecutionStatus;
}
export interface ExecutionStatus {status:'unchecked'|'ready'|'blocked'|'unavailable';message:string;checkedAt:number|null}
export type CommandView='office'|'operations'|'tasks'|'team'|'sessions'|'history';
export interface ClaudeSession {id:string;title:string;role:string|null;createdAt:number;updatedAt:number;status:'open'|'background'|'external'|'history'|'new';canOpen:boolean;canStop?:boolean;hasTranscript:boolean;taskId:string|null;taskTitle:string|null;taskStatus:string|null;note:string|null}
export interface ConversationMessage {id:string;role:'user'|'assistant';text:string;tools:string[];timestamp:string|null}
export type WorkStatus='assigned'|'running'|'waiting'|'reported'|'completed'|'failed'|'stopped'|'unknown';
export interface WorkMember {id:string;parentId:string|null;role:string|null;label:string;agentId?:string;status:WorkStatus;liveState?:'running'|'waiting'|'idle'|'closed'|null;instruction:string;summary:string;lastTool:string|null;file:string|null;updatedAt:string|null}
export interface WorkEvent {id:string;kind:'delegated'|'result'|'message'|'tool'|'assignment';from:string;to:string|null;text:string;at:string|null;file:string|null}
export interface WorkTrace {testResults?:Array<{id:string;actor:string;command:string;at:string|null;failed:boolean;output:string}>;sessionId:string;sessionStatus?:'open'|'background'|'external'|'history'|'new';title:string;taskId:string|null;live:boolean;updatedAt:number;members:WorkMember[];events:WorkEvent[];files:Array<{path:string;operation:string;edited?:boolean;actor:string;at:string|null}>;workItems:Array<{id:string;subject:string;owner?:string;status?:string}>;coverage:{skippedLines:number;limitedMembers:boolean;missingTranscripts:number}}
export interface WorkOverview {inventoryAvailable:boolean;groups:WorkTrace[];totalLiveSessions?:number;limitedSessions?:boolean}

export interface OfficeNotification{workspaceId?:string;projectId?:string;projectName?:string;id:string;taskId:string|null;sessionId?:string|null;source?:string|null;kind:'completed'|'waiting'|'failed'|'alert';title:string;body:string;at:number;read:boolean;url:string}
export interface DeliveryPreferences{quietEnabled:boolean;quietStart:string;quietEnd:string;timeZone:string;privacy:boolean;mutedSessions:string[];mutedWorkspaces:string[]}
export interface NotificationState{deliveryPreferences:DeliveryPreferences;preferences:Record<'completed'|'waiting'|'failed'|'alert',boolean>;items:OfficeNotification[];devices:number;warning:string|null;lastDelivery:{at:number;delivered:number;failed:number}|null}

export interface CatalogSession extends ClaudeSession {catalogKey:string;workspaceId:string|null;projectName:string;discovered?:boolean;activity?:string}
