// Capture once per page. Switching projects reloads the page, disposing pending
// requests and terminals rather than rebinding them to another project.
export const workspaceId=typeof location==='undefined'?null:new URLSearchParams(location.search).get('workspaceId');
export function scopedUrl(path:string){const url=new URL(path,'https://office.invalid');if(workspaceId)url.searchParams.set('workspaceId',workspaceId);return url.pathname+url.search;}
export function switchWorkspace(id:string){const url=new URL(location.href);url.searchParams.set('workspaceId',id);for(const key of ['session','task','alerts','token'])url.searchParams.delete(key);location.assign(url.href);}

export function workspaceStorage(key:string){return workspaceId?`${key}:${workspaceId}`:key;}
