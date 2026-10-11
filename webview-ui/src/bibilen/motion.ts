const query=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
export const motionEnabled=()=>!query?.matches&&localStorage.getItem('agent-house-motion')!=='off'&&localStorage.getItem('agent-house-motion-level')!=='simple';
export const setMotionEnabled=(enabled:boolean)=>localStorage.setItem('agent-house-motion',enabled?'on':'off');

export const motionLevel=():'simple'|'balanced'|'live'=>{const value=localStorage.getItem('agent-house-motion-level');return value==='simple'||value==='live'?value:'balanced';};
export const setMotionLevel=(level:string)=>localStorage.setItem('agent-house-motion-level',level);
