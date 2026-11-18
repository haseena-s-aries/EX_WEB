import {applyConflictChoices,conflictFields,sameChecklist} from '../src/offline/fieldworkConflicts';
import {browserFieldworkEnabled} from '../src/offline/fieldworkConfig';

const p=(code:string,text:string,category='common')=>({code,section:'Apparatus',itemNumber:Number(code.split('/')[1]),text,protectionApplicability:category});

describe('checklist conflict resolution',()=>{
  const local={points:[p('A/1','Local wording'),p('A/2','Same'),p('A/4','Only local')],version:1,photos:[]};
  const server={points:[p('A/1','Server wording'),p('A/2','Same'),p('A/3','Only server')]};
  it('lists each differing checkpoint, including additions on either side',()=>
    expect(conflictFields('checklist',local,server).map(f=>f.key)).toEqual(['checkpoint:A/1','checkpoint:A/4','checkpoint:A/3']));
  it('refuses to resolve until every difference has a choice (nothing is silently overwritten)',()=>
    expect(()=>applyConflictChoices('checklist',local,server,{'checkpoint:A/1':'local'})).toThrow(/Choose local or server/));
  it('applies per-checkpoint choices and keeps unrelated local data',()=>{
    const merged=applyConflictChoices('checklist',local,server,{'checkpoint:A/1':'server','checkpoint:A/4':'local','checkpoint:A/3':'server'});
    expect(merged.points.map((x:any)=>[x.code,x.text])).toEqual([['A/1','Server wording'],['A/2','Same'],['A/4','Only local'],['A/3','Only server']]);
    expect(merged.version).toBe(1);
  });
  it('drops a checkpoint when the chosen side does not include it',()=>{
    const merged=applyConflictChoices('checklist',local,server,{'checkpoint:A/1':'local','checkpoint:A/4':'server','checkpoint:A/3':'local'});
    expect(merged.points.map((x:any)=>x.code)).toEqual(['A/1','A/2']);
  });
  it('never produces an empty checklist',()=>
    expect(()=>applyConflictChoices('checklist',{points:[p('A/9','x')]},{points:[p('A/8','y')]},{'checkpoint:A/9':'server','checkpoint:A/8':'local'})).toThrow(/at least one/));
  it('detects unchanged checklists so no new server version is created',()=>{
    expect(sameChecklist(server.points,[...server.points])).toBe(true);
    expect(sameChecklist(server.points,local.points)).toBe(false);
  });
});

describe('record conflict fields',()=>{
  it('compares only fields stored on the server record and ignores server-managed values',()=>{
    const local={description:'B',model:'M1',areaName:'Display only',updatedAt:'x',sequenceNo:4,photos:[{id:'p'}]};
    const server={description:'A',model:'M1',updatedAt:'y',sequenceNo:5};
    expect(conflictFields('equipment',local,server).map(f=>f.key)).toEqual(['description']);
    expect(applyConflictChoices('equipment',local,server,{description:'local'}).description).toBe('B');
    expect(applyConflictChoices('equipment',local,server,{description:'server'}).description).toBe('A');
  });
  it('keeps defect equipment links out of field choices',()=>
    expect(conflictFields('defect',{equipmentId:'e1',observation:'x'},{equipmentId:'e2',observation:'x'})).toEqual([]));
});

describe('browser fieldwork rollout switch',()=>{
  it("enables 'local' only on loopback hosts",()=>{
    expect(browserFieldworkEnabled({browserFieldworkEnabled:'local'},'localhost')).toBe(true);
    expect(browserFieldworkEnabled({browserFieldworkEnabled:'local'},'127.0.0.1')).toBe(true);
    expect(browserFieldworkEnabled({browserFieldworkEnabled:'local'},'139.5.189.155')).toBe(false);
    expect(browserFieldworkEnabled({browserFieldworkEnabled:'local'},'survey.example.com')).toBe(false);
  });
  it('stays disabled unless explicitly authorized',()=>{
    expect(browserFieldworkEnabled({browserFieldworkEnabled:false},'localhost')).toBe(false);
    expect(browserFieldworkEnabled(undefined,'localhost')).toBe(false);
    expect(browserFieldworkEnabled({browserFieldworkEnabled:'true'},'139.5.189.155')).toBe(false);
  });
});
