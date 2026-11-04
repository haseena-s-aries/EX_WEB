import {OfflineInspectionService} from '../src/offline/offlineInspectionService';
import {OfflineRecord, OfflineStoreDriver} from '../src/offline/offlineInspectionStore';

class MemoryStore implements OfflineStoreDriver {
  featureEnabled=true;
  rows=new Map<string,OfflineRecord>();
  photos=new Map<string,string>();
  documents=new Map<string,{account:string;sha:string;data:string}>();
  passwords=new Map<string,string>();
  storageFull=false;
  async bindAccount(_account:string){return 'bound';}
  async put(account:string,id:string,type:string,payload:string){this.rows.set(`${account}:${id}`,{id,type,payload,updatedAt:Date.now()});return true;}
  async get(account:string,id:string){return this.rows.get(`${account}:${id}`)?.payload??null;}
  async list(account:string,type?:string){return [...this.rows.values()].filter(r=>this.rows.has(`${account}:${r.id}`)&&(!type||r.type===type));}
  async remove(account:string,id:string){return this.rows.delete(`${account}:${id}`);}
  async clearAccount(account:string){for(const key of this.rows.keys())if(key.startsWith(`${account}:`))this.rows.delete(key);return 0;}
  async setOfflinePassword(account:string,password:string){this.passwords.set(account,password);return true;}
  async verifyOfflinePassword(account:string,password:string){return this.passwords.get(account)===password;}
  async stats(){return {bytesUsed:0,recordCount:this.rows.size,maxBytes:1000000};}
  async storePhoto(account:string,id:string,uri:string,mimeType='image/jpeg',fileName='photo.jpg',activityId='',checkpointResponseId?:string){this.photos.set(id,uri);this.rows.set(`${account}:${id}`,{id,type:'offline-photo',payload:JSON.stringify({id,mimeType,fileName,activityId,checkpointResponseId}),updatedAt:Date.now()});return true;}
  async exportPhoto(_account:string,id:string){const value=this.photos.get(id);if(!value)throw new Error('missing photo');return value;}
  async deleteExportedPhoto(){return true;}
  async storeDocument(account:string,id:string,base64:string,expectedSha256:string,_mimeType='application/pdf',_fileName='doc.pdf'){if(this.storageFull)throw new Error('OFFLINE_STORAGE_FULL');if(expectedSha256.toLowerCase()==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'&&base64!=='YWJj')throw new Error('Document integrity verification failed.');if(base64==='YWJj'&&expectedSha256.toLowerCase()!=='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')throw new Error('Document integrity verification failed.');this.documents.set(id,{account,sha:expectedSha256,data:base64});return true;}
  async exportDocument(account:string,id:string,expectedSha256:string,_mimeType:string){const doc=this.documents.get(id);if(!doc||doc.account!==account||doc.sha!==expectedSha256)throw new Error('integrity failure');return `file:///private/${id}`;}
  async deleteDocument(account:string,id:string){const doc=this.documents.get(id);if(doc?.account!==account)return false;return this.documents.delete(id);}
  async deleteExportedDocument(){return true;}
}

const packageData={id:'pkg-1',ready:true,tasks:[{taskId:'task-1',ready:true,grade:'Visual',equipment:{equipmentId:'equipment-1'},checklist:{id:'checklist-1',version:3,questions:[{questionId:'question-1'}]}}]};
const assignedPackage={...packageData,projectId:'project-1',downloadStatus:'Ready',tasks:[{...packageData.tasks[0],project:{id:'project-1'},area:{id:'area-1',name:'Area 1'},grade:'Visual',checklist:{...packageData.tasks[0].checklist,questions:[{questionId:'question-1'}]}}]};

describe('offline inspection persistence and outbox',()=>{
  let store:MemoryStore;let service:OfflineInspectionService;let now:number;
  beforeEach(()=>{store=new MemoryStore();now=1000000;service=new OfflineInspectionService(store,()=>now);});

  it('blocks incomplete downloads and restores a saved draft after service recreation',async()=>{
    await service.downloadPackages('surveyor@example.test',[{...packageData,id:'incomplete',ready:false}]);
    await expect(service.createDraft('surveyor@example.test',{...packageData,id:'incomplete',downloadStatus:'Incomplete'},packageData.tasks[0])).rejects.toThrow('incomplete');
    await service.downloadPackages('surveyor@example.test',[{...packageData,downloadStatus:'Ready'}]);
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);
    draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Pass'}];await service.saveDraft(draft);
    const restarted=new OfflineInspectionService(store,()=>now);
    expect((await restarted.drafts('surveyor@example.test'))[0].checkpoints[0].responseCode).toBe('Pass');
  });

  it('keeps a stable idempotency key, retries with backoff, then records server acknowledgement',async()=>{
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);
    draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Fail',observation:'Cracked'}];await service.queue(draft);
    let calls=0;const transport={submit:async(_p:any,key:string)=>{calls++;expect(key).toBe(draft.clientActivityId);if(calls===1)throw new Error('network lost');return {accepted:true,serverActivityId:'server-1',responseMap:{}};},uploadPhoto:async()=>({}),isAuthFailure:()=>false};
    expect(await service.sync('surveyor@example.test',true,transport)).toEqual({sent:0,pending:1});
    const failed=(await service.drafts('surveyor@example.test'))[0];expect(failed.localStatus).toBe('Failed');
    await service.sync('surveyor@example.test',true,transport);expect(calls).toBe(1);
    now+=60000;expect(await service.sync('surveyor@example.test',true,transport)).toEqual({sent:1,pending:0});
    const accepted=(await service.drafts('surveyor@example.test'))[0];expect(accepted.serverStatus).toBe('Accepted');expect(accepted.serverActivityId).toBe('server-1');
  });

  it('does not retry conflicts automatically and retains the queued record',async()=>{
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Fail'}];await service.queue(draft);
    let calls=0;const conflict={submit:async()=>{calls++;throw {response:{status:409,data:{error:'server conflict'}}};},uploadPhoto:async()=>({}),isAuthFailure:()=>false};
    await service.sync('surveyor@example.test',true,conflict);await service.sync('surveyor@example.test',true,conflict);
    expect(calls).toBe(1);expect((await service.drafts('surveyor@example.test'))[0].localStatus).toBe('Conflict');
  });

  it('retains photo metadata and bytes after an interrupted upload for retry',async()=>{
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Pass'}];await service.saveDraft(draft);await service.savePhoto(draft,{uri:'file://photo.jpg',type:'image/jpeg'},'response-1');await service.queue(draft);
    const transport={submit:async()=>({accepted:true,serverActivityId:'server-1',responseMap:{'response-1':'server-response-1'}}),uploadPhoto:async()=>{throw new Error('upload interrupted');},isAuthFailure:()=>false};
    await service.sync('surveyor@example.test',true,transport);
    expect((await service.photos('surveyor@example.test',draft.clientActivityId))).toHaveLength(1);expect(store.photos.size).toBe(1);
  });

  it('requires the account password offline and expires only the cached session, not inspection data',async()=>{
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Pass'}];await service.saveDraft(draft);
    const token='not-a-jwt';await service.saveCredential('surveyor@example.test',{role:'Surveyor'},token,'correct-password');
    expect(await service.loadCredential('surveyor@example.test','wrong-password')).toBeNull();
    expect(await service.loadCredential('surveyor@example.test','correct-password')).toBeNull();
    expect((await service.drafts('surveyor@example.test'))).toHaveLength(1);
  });

  it('retains an unacknowledged outbox when the cached server session is rejected',async()=>{
    const draft=await service.createDraft('surveyor@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Pass'}];await service.queue(draft);
    const transport={submit:async()=>{throw {response:{status:401}};},uploadPhoto:async()=>({}),isAuthFailure:()=>true};
    await expect(service.sync('surveyor@example.test',true,transport)).rejects.toThrow('remains encrypted');
    expect((await service.drafts('surveyor@example.test'))).toHaveLength(1);
    expect((await store.list('surveyor@example.test','outbox'))).toHaveLength(1);
  });

  it('keeps an unacknowledged package and outbox isolated when the device account is switched',async()=>{
    const draft=await service.createDraft('first@example.test',{...packageData,downloadStatus:'Ready'},packageData.tasks[0]);
    draft.checkpoints=[{clientResponseId:'response-account-1',questionId:'question-1',responseCode:'Pass'}];
    await service.queue(draft);
    await service.bind('second@example.test');
    expect(await service.drafts('second@example.test')).toHaveLength(0);
    expect(await store.list('second@example.test','outbox')).toHaveLength(0);
    expect(await service.drafts('first@example.test')).toHaveLength(1);
    expect(await store.list('first@example.test','outbox')).toHaveLength(1);
  });

  it('creates and restores an equipment registration draft without an RFID tag',async()=>{
    const [pkg]=await service.downloadPackages('surveyor@example.test',[assignedPackage]);
    const equipment=await service.createEquipmentDraft('surveyor@example.test',pkg,'area-1',{tagNumber:'NEW-001',type:'Junction Box',location:'Area 1'});
    expect(equipment.rfidTagUid).toBeNull();expect(equipment.registrationStatus).toBe('Provisional');
    const restarted=new OfflineInspectionService(store,()=>now);const restored=await restarted.equipmentDrafts('surveyor@example.test');
    expect(restored).toHaveLength(1);expect(restored[0].clientEquipmentId).toBe(equipment.clientEquipmentId);expect(restored[0].tagNumber).toBe('NEW-001');
  });

  it('keeps a discovered-equipment inspection local until an authorized assigned task is downloaded, then syncs registration, evidence, and inspection in dependency order',async()=>{
    const [pkg]=await service.downloadPackages('surveyor@example.test',[assignedPackage]);
    const equipment=await service.createEquipmentDraft('surveyor@example.test',pkg,'area-1',{tagNumber:'NEW-002',type:'Motor',rfidTagUid:'04:ab:12:34',rfidIdentificationMethod:'NFC'});
    const inspection=await service.createProvisionalInspection('surveyor@example.test',pkg,equipment,pkg.tasks[0]);
    inspection.checkpoints=[{clientResponseId:'response-new',questionId:'question-1',responseCode:'Fail',observation:'Crack'}];
    await service.saveDraft(inspection);await service.saveEquipmentPhoto(equipment,{uri:'file://nameplate.jpg',type:'image/jpeg',fileName:'nameplate.jpg'},'Nameplate');
    await service.queue(inspection);
    expect((await service.drafts('surveyor@example.test'))[0].localStatus).toBe('NeedsPlanningApproval');
    expect(await store.list('surveyor@example.test','outbox')).toHaveLength(0);
    const approvedAssignment={...pkg,tasks:[{...pkg.tasks[0],taskId:'approved-task',equipment:{...pkg.tasks[0].equipment,equipmentId:equipment.clientEquipmentId}}]};
    await service.downloadPackages('surveyor@example.test',[approvedAssignment]);
    const order:string[]=[];
    const transport={registerEquipment:async(_p:string,_a:string,p:any,key:string)=>{order.push('equipment');expect(p.clientEquipmentId).toBe(equipment.clientEquipmentId);expect(key).toBe(equipment.clientEquipmentId);return {id:equipment.clientEquipmentId};},uploadEquipmentPhoto:async(_p:string,_a:string,_e:string,_photo:any,role:string)=>{order.push(`photo:${role}`);return {};},submit:async(payload:any)=>{order.push('activity');expect(payload.taskId).toBe('approved-task');return {accepted:true,serverActivityId:'server-activity',responseMap:{'response-new':'server-response'}};},uploadPhoto:async()=>({}),isAuthFailure:()=>false};
    const result=await service.sync('surveyor@example.test',true,transport);
    expect(result.sent).toBe(1);expect(order).toEqual(['equipment','photo:Nameplate','activity']);
    expect((await service.equipmentDrafts('surveyor@example.test'))[0].registrationStatus).toBe('Synced');
  });

  it('retains equipment and activity data on a conflicting registration response',async()=>{
    const [pkg]=await service.downloadPackages('surveyor@example.test',[assignedPackage]);
    const equipment=await service.createEquipmentDraft('surveyor@example.test',pkg,'area-1',{tagNumber:'CONFLICT-1',type:'Motor'});
    const activity=await service.createProvisionalInspection('surveyor@example.test',pkg,equipment,pkg.tasks[0]);activity.checkpoints=[{clientResponseId:'response-conflict',questionId:'question-1',responseCode:'Pass'}];await service.queue(activity);
    const transport={registerEquipment:async()=>{throw {response:{status:409,data:{error:'Duplicate tag'}}};},submit:async()=>({accepted:true}),uploadPhoto:async()=>({}),isAuthFailure:()=>false};
    const result=await service.sync('surveyor@example.test',true,transport);expect(result.pending).toBe(1);
    expect((await service.equipmentDrafts('surveyor@example.test'))[0].registrationStatus).toBe('Conflict');
    expect((await service.drafts('surveyor@example.test'))[0].checkpoints[0].responseCode).toBe('Pass');
  });

  it('requires all designated documents, verifies downloads, and keeps optional failures as warnings',async()=>{
    const docs=[{id:'required-v1',identity:'plan-1',kind:'ProjectPlan',documentId:'project-1',scope:'Project',scopeId:'project-1',title:'Area plan',category:'HazardousAreaPlan',revision:'R1',fileName:'plan.pdf',contentType:'application/pdf',sizeBytes:3,sha256:'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',required:true,downloadUrl:'/download'},
      {id:'optional-v1',kind:'AreaPhoto',documentId:'photo-1',scope:'Area',scopeId:'area-1',title:'Area map',category:'AreaReferenceImage',revision:'R1',fileName:'map.png',contentType:'image/png',sizeBytes:3,sha256:'00',required:false,downloadUrl:'/optional'}];
    const source={...packageData,tasks:packageData.tasks.map(t=>({...t,documents:docs}))};
    const missing=await service.downloadPackages('surveyor@example.test',[source]);expect(missing[0].downloadStatus).toBe('Incomplete');expect(missing[0].requiredDocumentsComplete).toBe(false);
    const downloaded=await service.downloadPackages('surveyor@example.test',[source],{download:async url=>{if(url==='/optional')throw new Error('offline');return new Uint8Array([97,98,99]);}});
    expect(downloaded[0].downloadStatus).toBe('Ready');expect(downloaded[0].optionalDocumentWarnings).toHaveLength(1);expect(downloaded[0].tasks[0].documents[0].downloadStatus).toBe('Downloaded');
    const uri=await service.openDocument('surveyor@example.test',downloaded[0].tasks[0].documents[0]);expect(uri).toContain('required-v1');
  });

  it('rejects partial files, retries required document downloads, and keeps old revisions',async()=>{
    const makeDoc=(id:string,revision:string,sizeBytes:number)=>({id,identity:'project-plan:project-1',kind:'ProjectPlan',documentId:'project-1',scope:'Project',scopeId:'project-1',title:'Area plan',category:'HazardousAreaPlan',revision,fileName:`plan-${revision}.pdf`,contentType:'application/pdf',sizeBytes,sha256:'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',required:true,downloadUrl:'/plan'});
    const old={...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[makeDoc('plan-r1','R1',3)]}))};
    await service.downloadPackages('surveyor@example.test',[old],{download:async()=>new Uint8Array([97,98,99])});
    const changed={...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[makeDoc('plan-r2','R2',4)]}))};
    const failed=await service.downloadPackages('surveyor@example.test',[changed],{download:async()=>new Uint8Array([97,98,99])});expect(failed[0].downloadStatus).toBe('Incomplete');
    expect(store.documents.has('plan-r1')).toBe(true);const retry=await service.downloadPackages('surveyor@example.test',[changed],{download:async()=>new Uint8Array([97,98,99,100])});expect(retry[0].tasks[0].documents[0].downloadStatus).toBe('Failed');
  });

  it('rejects a checksum mismatch and isolates stored documents by account',async()=>{
    await expect(store.storeDocument('first@example.test','corrupt','YWJj','00','application/pdf','x.pdf')).rejects.toThrow('integrity');
    await store.storeDocument('first@example.test','doc-v1','YWJj','BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD','application/pdf','x.pdf');
    await expect(store.exportDocument('second@example.test','doc-v1','BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD','application/pdf')).rejects.toThrow('integrity');
  });

  it('snapshots the available revision on draft start and records document versions opened during the activity',async()=>{
    const doc={id:'plan-r1',identity:'plan-1',kind:'ProjectPlan',documentId:'project-1',scope:'Project',scopeId:'project-1',title:'Area plan',category:'HazardousAreaPlan',revision:'R1',fileName:'plan.pdf',contentType:'application/pdf',sizeBytes:3,sha256:'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',required:true,downloadUrl:'/plan'};
    const [pkg]=await service.downloadPackages('surveyor@example.test',[{...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[doc]}))}],{download:async()=>new Uint8Array([97,98,99])});
    const task=pkg.tasks[0];const draft=await service.createDraft('surveyor@example.test',pkg,task);await service.openDocument('surveyor@example.test',task.documents[0],draft.clientActivityId);
    const restored=(await service.drafts('surveyor@example.test'))[0];expect(restored.referenceDocumentsAtStart).toEqual([expect.objectContaining({revision:'R1',sha256:doc.sha256})]);expect(restored.referenceDocumentsUsed).toEqual([expect.objectContaining({id:'plan-r1',revision:'R1'})]);
    const restarted=new OfflineInspectionService(store,()=>now);expect(await restarted.openDocument('surveyor@example.test',task.documents[0],draft.clientActivityId)).toContain('plan-r1');
  });

  it('keeps a package incomplete and exposes storage exhaustion instead of losing the required document',async()=>{
    store.storageFull=true;const doc={id:'plan-full',kind:'ProjectPlan',documentId:'project-1',scope:'Project',scopeId:'project-1',title:'Plan',category:'HazardousAreaPlan',revision:'R1',fileName:'plan.pdf',contentType:'application/pdf',sizeBytes:3,sha256:'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',required:true,downloadUrl:'/plan'};
    const [pkg]=await service.downloadPackages('surveyor@example.test',[{...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[doc]}))}],{download:async()=>new Uint8Array([97,98,99])});
    expect(pkg.downloadStatus).toBe('Incomplete');expect(pkg.tasks[0].documents[0].downloadStatus).toBe('Failed');expect(pkg.tasks[0].documents[0].downloadError).toBe('OFFLINE_STORAGE_FULL');expect(store.documents.size).toBe(0);
  });

  it('does not mark an expired or missing approved requirement ready',async()=>{
    const [expired]=await service.downloadPackages('surveyor@example.test',[{...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[{id:'expired',kind:'EquipmentReference',documentId:'document-1',scope:'Equipment',scopeId:'equipment-1',title:'Expired certificate',category:'ExCertificate',revision:'R1',fileName:'x.pdf',contentType:'application/pdf',sizeBytes:3,sha256:'00',required:true,expired:true,downloadUrl:'/x'}]}))}],{download:async()=>new Uint8Array([1,2,3])});
    expect(expired.downloadStatus).toBe('Incomplete');expect(expired.requiredDocumentsComplete).toBe(false);expect(expired.tasks[0].documents[0].downloadError).toBe('Document is expired.');
    const [missing]=await service.downloadPackages('surveyor@example.test',[{...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[{id:'missing',kind:'EquipmentReference',documentId:'',scope:'Equipment',scopeId:'equipment-1',title:'Missing datasheet',category:'ManufacturerDatasheet',revision:'',fileName:'',contentType:'',sizeBytes:0,sha256:'',required:true,missing:true,downloadUrl:''}]}))}],{download:async()=>{throw new Error('must not request a missing file');}});
    expect(missing.downloadStatus).toBe('Incomplete');expect(missing.tasks[0].documents[0].downloadError).toBe('Required approved document is missing.');
  });

  it('retains idempotent document-use events until the server acknowledges them',async()=>{
    const sha='BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD';const doc={id:'equip-doc-r1',identity:'equipment-document:doc-1',kind:'EquipmentReference',documentId:'doc-1',scope:'Equipment',scopeId:'equipment-1',title:'Certificate',category:'ExCertificate',revision:'R1',fileName:'cert.pdf',contentType:'application/pdf',sizeBytes:3,sha256:sha,required:false,downloadUrl:'/certificate'};
    const [pkg]=await service.downloadPackages('surveyor@example.test',[{...packageData,tasks:packageData.tasks.map(t=>({...t,documents:[doc]}))}],{download:async()=>new Uint8Array([97,98,99])});const task=pkg.tasks[0];const draft=await service.createDraft('surveyor@example.test',pkg,task);await service.openDocument('surveyor@example.test',task.documents[0],draft.clientActivityId,pkg.id);draft.checkpoints=[{clientResponseId:'response-1',questionId:'question-1',responseCode:'Pass'}];await service.queue(draft);
    let eventCalls=0;const transport={submit:async()=>({accepted:true,serverActivityId:'server-doc-act',responseMap:{}}),uploadPhoto:async()=>({}),recordDocumentUse:async()=>{eventCalls++;if(eventCalls===1)throw new Error('audit unavailable');return {acknowledged:true};},isAuthFailure:()=>false};
    const first=await service.sync('surveyor@example.test',true,transport);expect(first.pending).toBe(1);expect(await store.list('surveyor@example.test','document-use-outbox')).toHaveLength(1);
    now+=10000;const second=await service.sync('surveyor@example.test',true,transport);expect(second.pending).toBe(0);expect(await store.list('surveyor@example.test','document-use-outbox')).toHaveLength(0);expect(eventCalls).toBeGreaterThanOrEqual(2);
  });
});
