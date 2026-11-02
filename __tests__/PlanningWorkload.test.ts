import {buildInspectorWorkload} from '../src/planning/workload';

test('workload projection counts open, overdue, inaccessible and completed tasks separately',()=>{
  const now=new Date('2026-10-31T12:00:00Z');
  const result=buildInspectorWorkload([{id:'wp',reference:'WP-1',tasks:[
    {id:'open',assignedUserId:'s1',scheduledAt:'2026-10-01T08:00:00Z',dueAt:'2026-10-02T08:00:00Z',statusCode:'Planned'},
    {id:'done',assignedUserId:'s1',dueAt:'2026-10-03T08:00:00Z',statusCode:'Completed'},
    {id:'blocked',assignedUserId:null,dueAt:'2026-09-30T08:00:00Z',statusCode:'Planned',isInaccessible:true},
  ]}], [{id:'s1',displayName:'Surveyor One'}], now);
  expect(result.inspectors).toEqual([
    {userId:'s1',name:'Surveyor One',total:2,open:1,overdue:1,inaccessible:0,completed:1},
    {userId:'unassigned',name:'Unassigned',total:1,open:1,overdue:0,inaccessible:1,completed:0},
  ]);
  expect(result.agenda.map(task=>task.id)).toEqual(['blocked','open','done']);
});

test('tasks without planned or due dates sort after dated tasks',()=>{
  const result=buildInspectorWorkload([{id:'wp',reference:'WP',tasks:[
    {id:'undated'}, {id:'dated',scheduledAt:'2026-11-01T00:00:00Z'},
  ]}],[],new Date('2026-10-31T00:00:00Z'));
  expect(result.agenda.map(task=>task.id)).toEqual(['dated','undated']);
});
