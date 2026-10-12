const WORK=new Set(['working','running','blocked','waiting','busy']);
const TERMINAL=new Set(['done','completed','failed','stopped']);
// Unknown native state must not hide a positive process busy signal.
// Explicit terminal states retain precedence over lingering process metadata.
export function hasNativeWork(agent){if(TERMINAL.has(agent?.state))return false;return WORK.has(agent?.state)||WORK.has(agent?.status);}
