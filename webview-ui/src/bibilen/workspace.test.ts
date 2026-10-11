import {describe,it,expect} from 'vitest';
import {configureRoster,ROSTER} from './roster.js';
import {makeLayout} from './layouts.js';
import {scopedUrl} from './workspace.js';
describe('project profiles',()=>{
 it('shows only registered roles and strips another project’s skill paths',()=>{
  configureRoster(['chief','project-engineer','finance-analyst'],false);
  expect(ROSTER.map(r=>r.key)).toEqual(['chief','project-engineer','finance-analyst']);
  expect(ROSTER.flatMap(r=>r.skills)).toEqual([]);
  expect(ROSTER.find(r=>r.key==='chief')?.name).toBe('Gökhan');
  const layout=makeLayout('studio');expect(layout.furniture.some(f=>f.uid==='seat-project-engineer')).toBe(true);
  const desks=layout.furniture.filter(f=>f.uid.startsWith('desk-'));expect(new Set(desks.map(f=>`${f.col},${f.row}`)).size).toBe(desks.length);
 });
 it('preserves terminal query parameters when constructing scoped URLs',()=>{
  expect(scopedUrl('/bibilen-session-terminal?id=123')).toContain('id=123');
 });
});
