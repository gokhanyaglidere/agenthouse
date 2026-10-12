import type {Character} from '../types.js';import type {PosePhase} from '../sprites/cozyPoses.js';
/** Approach/departure use WALK; a visit includes a bounded settle and finish pose. */
export function activityPhase(ch:Pick<Character,'ambientElapsed'|'ambientPause'>):PosePhase{
 if((ch.ambientElapsed??0)<.7)return 'prepare';if((ch.ambientPause??0)<.7)return 'finish';return 'act';
}
export function activityLabel(ch:Character){
 if(!ch.ambientTarget)return null;if((ch.ambientPause??0)<=0)return ch.ambientTarget.activity==='pet'?'Hayvana yaklaşıyor':'Molaya gidiyor';
 if(ch.ambientPartnerId!==undefined)return 'Sohbet ediyor · görsel';
 const phase=activityPhase(ch);if(phase==='prepare')return 'Hazırlanıyor';if(phase==='finish')return 'Toparlanıyor';
 if(ch.ambientTarget.activity==='pet')return (ch.ambientElapsed??0)>3?'Hayvanla oynuyor':'Hayvanı seviyor';
 if(ch.ambientTarget.activity==='coffee'&&ch.ambientTarget.furnitureUid&&(ch.ambientElapsed??0)>2)return 'Kahve içiyor';return ch.ambientTarget.label;
}
