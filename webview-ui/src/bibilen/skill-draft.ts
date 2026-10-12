export interface SkillDraftState{alive:boolean;generation:number;selectedId:string;stage:(text:string)=>boolean}
// Read the latest draft callback after the response, never the callback captured
// before a person had time to type or switch sessions/skills.
export async function loadSkillDraft(fetcher:(id:string)=>Promise<{name:string;body:string}>,current:()=>SkillDraftState){
 const start=current();if(!start.alive||!start.selectedId)return 'discarded';
 const result=await fetcher(start.selectedId),next=current();
 if(!next.alive)return 'discarded';
 if(start.generation!==next.generation||start.selectedId!==next.selectedId)return 'changed';
 return next.stage(`Skill: ${result.name}\n\n${result.body}`)?'inserted':'occupied';
}
