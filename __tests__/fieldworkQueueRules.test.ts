import {canConsolidate,mergeEvidence} from '../src/offline/fieldworkQueueRules';

describe('durable fieldwork queue rules',()=>{
  it('consolidates an unsent save',()=>expect(canConsolidate({status:'Pending',attempts:0,requests:{}})).toBe(true));
  it('preserves an attempted operation for lost-response replay',()=>expect(canConsolidate({status:'Pending',attempts:1,requests:{}})).toBe(false));
  it('preserves materialized request IDs even before the first attempt',()=>expect(canConsolidate({status:'Pending',attempts:0,requests:{save:{id:'stable'}}})).toBe(false));
  it('does not consolidate conflicts',()=>expect(canConsolidate({status:'Conflict',attempts:0,requests:{}})).toBe(false));
  it('retains earlier photographs and deduplicates stable identifiers',()=>expect(mergeEvidence([{id:'a'},{id:'b'}],[{id:'b'},{id:'c'}])).toEqual([{id:'a'},{id:'b'},{id:'c'}]));
});
