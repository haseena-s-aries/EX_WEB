jest.mock('../src/api/client',()=>({__esModule:true,default:{},getApiResourceUrl:jest.fn(),getAuthToken:jest.fn(),setAuthToken:jest.fn()}));
import {dependantsOf,waitingOn} from '../src/offline/fieldwork';

const op=(id:string,status:string,dependsOn:string[]=[])=>({id,status,dependsOn} as any);
describe('queued change dependencies',()=>{
  const all=[op('eq','Failed'),op('defect','Pending',['eq']),op('photo','Pending',['defect']),op('other','Pending'),op('done','Synced',['eq'])];
  it('reports which unsynchronized change blocks another',()=>{
    expect(waitingOn(all[1],all)?.id).toBe('eq');
    expect(waitingOn(all[3],all)).toBeUndefined();
  });
  it('finds every transitive dependant so setting aside never strands a change',()=>
    expect(dependantsOf('eq',all).map(o=>o.id).sort()).toEqual(['defect','done','photo']));
});
