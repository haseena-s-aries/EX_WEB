jest.mock('../src/offline/offlineInspectionService',()=>({offlineInspectionService:{packages:jest.fn()}}));
import {offlineInspectionService} from '../src/offline/offlineInspectionService';
import {findOfflineEquipment,normalizeIdentifier,SimulatedScanner} from '../src/identification/equipmentScanner';

const equipment=(equipmentId:string,tagNumber:string,identifier:string)=>({equipment:{equipmentId,tagNumber,identifiers:[{technology:'QR',identifier}]},taskId:`task-${equipmentId}`,grade:'Visual'});
const pkg=(id:string,tasks:any[])=>({id,reference:id,tasks});

describe('equipment scanner adapters and offline identifier lookup',()=>{
 const packages=offlineInspectionService.packages as jest.Mock;
 beforeEach(()=>packages.mockReset());
 it('normalizes HF RFID UIDs without changing QR case or content',()=>{
  expect(normalizeIdentifier(' 04:a1-b2 c3 ','HF_RFID')).toBe('04A1B2C3');
  expect(normalizeIdentifier(' ex/Asset?tag=AbC ','QR')).toBe('ex/Asset?tag=AbC');
 });
 it('simulated scanner returns a typed result for development',async()=>{
  const scanner=new SimulatedScanner({technology:'NFC',identifier:'04A1B2C3',source:'NFC'});
  expect(await scanner.scan()).toEqual({technology:'NFC',identifier:'04A1B2C3',source:'SIMULATED'});
 });
 it('matches a downloaded QR and groups multiple active tasks for one equipment item',async()=>{
  packages.mockResolvedValue([pkg('rotation-1',[equipment('eq-1','PUMP-01','QR/PUMP-01')]),pkg('rotation-2',[equipment('eq-1','PUMP-01','QR/PUMP-01')])]);
  const result=await findOfflineEquipment('surveyor@test.invalid','QR/PUMP-01','QR');
  expect(result.state).toBe('matched');if(result.state==='matched')expect(result.activeTasks).toHaveLength(2);
 });
 it('returns an ambiguity when an identifier matches different equipment',async()=>{
  packages.mockResolvedValue([pkg('package',[equipment('eq-1','PUMP-01','DUP'),equipment('eq-2','PUMP-02','DUP')])]);
  expect((await findOfflineEquipment('surveyor@test.invalid','DUP','QR')).state).toBe('duplicate');
 });
 it('reports an unknown offline tag without inventing an equipment record',async()=>{
  packages.mockResolvedValue([pkg('package',[equipment('eq-1','PUMP-01','QR/PUMP-01')])]);
  expect((await findOfflineEquipment('surveyor@test.invalid','QR/UNKNOWN','QR')).state).toBe('unknown');
 });
 it('matches an offline HF RFID UID to its existing equipment register row',async()=>{
  const item={equipment:{equipmentId:'eq-1',tagNumber:'PUMP-01',rfidTagUid:'04A1B2C3'},taskId:'task-1',grade:'Close'};
  packages.mockResolvedValue([pkg('assigned',[item])]);
  const result=await findOfflineEquipment('surveyor@test.invalid','04:a1:b2:c3','HF_RFID');
  expect(result.state).toBe('matched');if(result.state==='matched')expect(result.equipment.equipmentId).toBe('eq-1');
 });
});
