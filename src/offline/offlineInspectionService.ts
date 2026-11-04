import {androidOfflineStore, OfflineStoreDriver} from './offlineInspectionStore';

export type OfflineCheckpointDraft = {clientResponseId: string; questionId: string; applicabilityResultCode?: string; responseCode?: 'Pass'|'Fail'|'NA'; technicalConditionCode?: string; observation?: string; numericValue?: number};
export type OfflineFindingDraft = {id: string; clientResponseId: string; observation: string; proposedAction?: string; severityCode?: string; faultCode?: string; requiredMaterialsOrSupport?: string; responsibleParty?: string; dueAt?: string};
export type OfflineActivityDraft = {clientActivityId: string; accountId: string; taskId: string; packageId: string; equipmentId: string; clientEquipmentId?:string; isProvisional?:boolean; requiresPlanningApproval?:boolean; grade: string; checklistTemplateId: string; checklistVersion: number; referenceDocumentsAtStart?:Array<{id:string;revision:string;sha256:string;title:string}>;referenceDocumentsUsed?:Array<{id:string;identity:string;documentId:string;revision:string;sha256:string;title:string;scope:string;scopeId:string;openedAt:string}>;documentUsageWarning?:string;startedAt: string; checkpoints: OfflineCheckpointDraft[]; findings: OfflineFindingDraft[]; localStatus: 'Draft'|'Queued'|'Conflict'|'Failed'|'NeedsPlanningApproval'; serverStatus: 'NotSent'|'Pending'|'Accepted'; serverActivityId?: string; lastError?: string; updatedAt: string};
export type OfflineOutboxItem = {id: string; activityId: string; idempotencyKey: string; payload: any; state: 'Pending'|'Retry'|'Conflict'; attempts: number; nextAttemptAt: number; lastError?: string};
export type OfflineEquipmentDraft = {clientEquipmentId:string;accountId:string;packageId:string;projectId:string;areaId:string;tagNumber:string;type:string;equipmentCode?:string|null;rfidTagUid?:string|null;rfidIdentificationMethod?:string|null;scannedIdentifier?:string|null;scannedTechnology?:'HF_RFID'|'NFC'|'QR'|'MANUAL'|null;tagReconciliationStatus?:'NotNeeded'|'Pending'|'Resolved';location?:string|null;manufacturer?:string|null;description?:string|null;model?:string|null;serialNumber?:string|null;protectionDetails?:string|null;certificateNumber?:string|null;exProtectionType?:string|null;gasGroup?:string|null;temperatureClass?:string|null;hazardousAreaZone?:string|null;ambientTemperatureRange?:string|null;ipRating?:string|null;notifiedBody?:string|null;specialConditionsOfUse?:string|null;registrationStatus:'Provisional'|'Queued'|'Synced'|'Conflict'|'Failed';serverEquipmentId?:string;lastError?:string;createdAt:string;updatedAt:string};
export type OfflineReferenceDocument = {id:string;identity?:string;kind:string;documentId:string;scope:string;scopeId:string;title:string;category:string;revision:string;issueDate?:string|null;expiryDate?:string|null;expired?:boolean;missing?:boolean;integrityMismatch?:boolean;fileName:string;contentType:string;sizeBytes:number;sha256:string;required:boolean;downloadUrl:string;downloadStatus?:'Pending'|'Downloaded'|'Failed';downloadError?:string};

const recordId = (type: string, id: string) => `${type}:${id}`;
export const newStableId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);});

export class OfflineInspectionService {
  constructor(private readonly store: OfflineStoreDriver, private readonly now: () => number = Date.now) {}
  async bind(accountId: string) { await this.store.bindAccount(accountId); }
  async saveCredential(email: string, user: any, token: string, password:string) {
    const tokenExpires=this.tokenExpiry(token);const expiresAt=Math.min(tokenExpires, this.now()+8*60*60*1000);
    await this.bind(email.toLowerCase());
    await this.store.setOfflinePassword(email.toLowerCase(),password);
    await this.store.put(email.toLowerCase(),'offline-credential','credential',JSON.stringify({email:email.toLowerCase(),user,token,expiresAt,savedAt:this.now()}));
  }
  async loadCredential(email: string,password:string) {
    await this.bind(email.toLowerCase());if(!await this.store.verifyOfflinePassword(email.toLowerCase(),password))return null;const raw=await this.store.get(email.toLowerCase(),'offline-credential');if(!raw)return null;
    const session=JSON.parse(raw);if(session.expiresAt<=this.now()){await this.store.remove(email.toLowerCase(),'offline-credential');return null;}return session;
  }
  async downloadPackages(accountId: string, packages: any[], transport?: {download(url:string):Promise<Uint8Array>}) {
    await this.bind(accountId);const normalized=[] as any[];
    for(const source of packages){const pkg=JSON.parse(JSON.stringify(source));const requiredDocs:OfflineReferenceDocument[]=[];const optionalWarnings:string[]=[];
      for(const task of pkg.tasks||[]){task.documents=task.documents||[];for(const doc of task.documents as OfflineReferenceDocument[]){const previous=await this.store.get(accountId,recordId('document',doc.id));const cached=previous?JSON.parse(previous):null;
        if(doc.missing||doc.expired||doc.integrityMismatch){doc.downloadStatus='Failed';doc.downloadError=doc.missing?'Required approved document is missing.':doc.expired?'Document is expired.':'Stored file checksum does not match approved metadata.';if(!doc.required)optionalWarnings.push(`${doc.title}: ${doc.downloadError}`);continue;}
        if(cached?.sha256===doc.sha256&&cached?.verified){doc.downloadStatus='Downloaded';continue;}
        doc.downloadStatus='Pending';if(!transport){if(doc.required)doc.downloadStatus='Failed';else optionalWarnings.push(`${doc.title}: not downloaded`);continue;}
        try{const bytes=await transport.download(doc.downloadUrl);if(bytes.byteLength!==doc.sizeBytes)throw new Error('Downloaded document size does not match its manifest.');const base64=toBase64(bytes);await this.store.storeDocument(accountId,doc.id,base64,doc.sha256,doc.contentType,doc.fileName);doc.downloadStatus='Downloaded';doc.downloadError=undefined;await this.store.put(accountId,recordId('document',doc.id),'offline-document',JSON.stringify({id:doc.id,identity:doc.identity,revision:doc.revision,sha256:doc.sha256,contentType:doc.contentType,fileName:doc.fileName,title:doc.title,category:doc.category,scope:doc.scope,scopeId:doc.scopeId,sizeBytes:doc.sizeBytes,verified:true,downloadedAt:new Date(this.now()).toISOString()}));}
        catch(error:any){doc.downloadStatus='Failed';doc.downloadError=String(error?.message||'Download failed');if(!doc.required)optionalWarnings.push(`${doc.title}: ${doc.downloadError}`);}
      }}
      for(const task of pkg.tasks||[])for(const doc of task.documents as OfflineReferenceDocument[])if(doc.required)requiredDocs.push(doc);
      pkg.requiredDocumentsComplete=requiredDocs.every(doc=>doc.downloadStatus==='Downloaded');pkg.requiredDocumentCount=requiredDocs.length;pkg.optionalDocumentWarnings=optionalWarnings;pkg.downloadStatus=pkg.ready&&pkg.tasks?.length&&pkg.requiredDocumentsComplete?'Ready':'Incomplete';pkg.downloadedAt=new Date(this.now()).toISOString();normalized.push(pkg);
    }
    for(const p of normalized)await this.store.put(accountId,recordId('package',p.id),'package',JSON.stringify(p));
    const previous=await this.store.get(accountId,'offline-meta');
    await this.store.put(accountId,'offline-meta','metadata',JSON.stringify({...JSON.parse(previous||'{}'),lastDownloadAttemptAt:new Date(this.now()).toISOString(),...(normalized.every(p=>p.downloadStatus==='Ready')?{lastSuccessfulDownloadAt:new Date(this.now()).toISOString()}:{})}));
    await this.reconcileProvisionalActivities(accountId);
    return normalized;
  }
  async openDocument(accountId:string,doc:OfflineReferenceDocument,activityId?:string,workPackageId?:string){await this.bind(accountId);const raw=await this.store.get(accountId,recordId('document',doc.id));const record=raw?JSON.parse(raw):null;if(!record?.verified||record.sha256!==doc.sha256)throw new Error('This document is missing, has changed revision, or failed integrity verification. Download it again while connected.');const uri=await this.store.exportDocument(accountId,doc.id,doc.sha256,doc.contentType);if(activityId){const draftRaw=await this.store.get(accountId,recordId('draft',activityId));if(draftRaw){const draft=JSON.parse(draftRaw) as OfflineActivityDraft;const used=draft.referenceDocumentsUsed||[];const openedAt=new Date(this.now()).toISOString();const entry={id:doc.id,identity:doc.identity||doc.id,documentId:doc.documentId,revision:doc.revision,sha256:doc.sha256,title:doc.title,scope:doc.scope,scopeId:doc.scopeId,openedAt};used.push(entry);draft.referenceDocumentsUsed=used;await this.saveDraft(draft);if(doc.kind==='EquipmentReference'){const event={eventId:newStableId(),clientActivityId:activityId,workPackageId,documentId:doc.documentId,revision:doc.revision,sha256:doc.sha256,openedAt,attempts:0,nextAttemptAt:0};await this.store.put(accountId,recordId('document-use',event.eventId),'document-use-outbox',JSON.stringify(event));}}}return uri;}
  async documents(accountId:string){await this.bind(accountId);return (await this.store.list(accountId,'offline-document')).map(x=>JSON.parse(x.payload));}
  async packages(accountId: string) {await this.bind(accountId);return (await this.store.list(accountId,'package')).map(x=>JSON.parse(x.payload));}
  async createEquipmentDraft(accountId:string,pkg:any,areaId:string,fields:Partial<OfflineEquipmentDraft>):Promise<OfflineEquipmentDraft>{
    if(pkg.downloadStatus!=='Ready')throw new Error('Download the assigned work package before registering equipment offline.');
    const task=(pkg.tasks||[]).find((x:any)=>x.area?.id===areaId&&x.project?.id&&x.area?.id);
    if(!task)throw new Error('This area is not part of the downloaded assigned job.');
    const tagNumber=String(fields.tagNumber||'').trim(),type=String(fields.type||'').trim();
    if(!tagNumber||!type)throw new Error('Equipment tag number and type are required.');
    const clientEquipmentId=newStableId(),now=new Date(this.now()).toISOString();
    const draft:OfflineEquipmentDraft={clientEquipmentId,accountId,packageId:pkg.id,projectId:task.project.id,areaId,tagNumber,type,
      equipmentCode:fields.equipmentCode||null,rfidTagUid:fields.rfidTagUid?.trim().replace(/[\s:-]/g,'').toUpperCase()||null,rfidIdentificationMethod:fields.rfidTagUid?.trim()?fields.rfidIdentificationMethod||'HF_RFID':null,scannedIdentifier:fields.scannedIdentifier?.trim()||null,scannedTechnology:fields.scannedTechnology||null,tagReconciliationStatus:fields.scannedTechnology==='QR'?'Pending':'NotNeeded',
      location:fields.location||null,manufacturer:fields.manufacturer||null,description:fields.description||null,model:fields.model||null,serialNumber:fields.serialNumber||null,
      protectionDetails:fields.protectionDetails||null,certificateNumber:fields.certificateNumber||null,exProtectionType:fields.exProtectionType||null,gasGroup:fields.gasGroup||null,
      temperatureClass:fields.temperatureClass||null,hazardousAreaZone:fields.hazardousAreaZone||null,ambientTemperatureRange:fields.ambientTemperatureRange||null,ipRating:fields.ipRating||null,
      notifiedBody:fields.notifiedBody||null,specialConditionsOfUse:fields.specialConditionsOfUse||null,registrationStatus:'Provisional',createdAt:now,updatedAt:now};
    await this.store.put(accountId,recordId('equipment-draft',clientEquipmentId),'equipment-draft',JSON.stringify(draft));
    await this.store.put(accountId,recordId('equipment-registration',clientEquipmentId),'equipment-registration-outbox',JSON.stringify({clientEquipmentId,state:'Pending',attempts:0,nextAttemptAt:0}));
    return draft;
  }
  async equipmentDrafts(accountId:string){await this.bind(accountId);return (await this.store.list(accountId,'equipment-draft')).map(x=>JSON.parse(x.payload) as OfflineEquipmentDraft);}
  async updateEquipmentDraft(draft:OfflineEquipmentDraft,retryRegistration=false){draft.updatedAt=new Date(this.now()).toISOString();await this.store.put(draft.accountId,recordId('equipment-draft',draft.clientEquipmentId),'equipment-draft',JSON.stringify(draft));if(retryRegistration&&draft.registrationStatus!=='Synced'){draft.registrationStatus='Provisional';draft.lastError=undefined;await this.store.put(draft.accountId,recordId('equipment-draft',draft.clientEquipmentId),'equipment-draft',JSON.stringify(draft));await this.store.put(draft.accountId,recordId('equipment-registration',draft.clientEquipmentId),'equipment-registration-outbox',JSON.stringify({clientEquipmentId:draft.clientEquipmentId,state:'Pending',attempts:0,nextAttemptAt:0}));}}
  async saveEquipmentPhoto(draft:OfflineEquipmentDraft,photo:{uri?:string;type?:string;fileName?:string},role:'Overview'|'Nameplate'|'ExMarking'){
    if(!photo.uri)throw new Error('Selected equipment photograph has no readable URI.');const id=newStableId();const mimeType=photo.type||'image/jpeg';
    await this.store.storePhoto(draft.accountId,id,photo.uri,mimeType,photo.fileName||'equipment.jpg',draft.clientEquipmentId,`equipment:${role}`);
    await this.store.put(draft.accountId,recordId('equipment-photo',id),'equipment-photo-outbox',JSON.stringify({id,clientEquipmentId:draft.clientEquipmentId,role,fileName:photo.fileName||'equipment.jpg',mimeType,state:'Pending',attempts:0,nextAttemptAt:0}));
  }
  async equipmentPhotos(accountId:string,clientEquipmentId?:string){await this.bind(accountId);return (await this.store.list(accountId,'equipment-photo-outbox')).map(x=>JSON.parse(x.payload)).filter(x=>!clientEquipmentId||x.clientEquipmentId===clientEquipmentId);}
  async createProvisionalInspection(accountId:string,pkg:any,equipment:OfflineEquipmentDraft,templateTask:any):Promise<OfflineActivityDraft>{
    if(pkg.downloadStatus!=='Ready'||!templateTask?.checklist?.questions?.length)throw new Error('A complete downloaded checklist is required for a provisional inspection.');
    if(templateTask.project?.id!==equipment.projectId||templateTask.area?.id!==equipment.areaId)throw new Error('Checklist must come from this assigned job area.');
    if(templateTask.equipment?.exProtectionType&&!equipment.exProtectionType)throw new Error('Record the verified Ex protection type before using a checklist selected for this equipment class.');
    if(equipment.exProtectionType&&templateTask.equipment?.exProtectionType&&String(equipment.exProtectionType).toLowerCase()!==String(templateTask.equipment.exProtectionType).toLowerCase())throw new Error('The downloaded checklist is for a different recorded Ex protection type.');
    const draft:OfflineActivityDraft={clientActivityId:newStableId(),accountId,taskId:'',packageId:pkg.id,equipmentId:equipment.clientEquipmentId,clientEquipmentId:equipment.clientEquipmentId,isProvisional:true,requiresPlanningApproval:true,
      grade:templateTask.grade,checklistTemplateId:templateTask.checklist.id,checklistVersion:templateTask.checklist.version,startedAt:new Date(this.now()).toISOString(),checkpoints:[],findings:[],localStatus:'Draft',serverStatus:'NotSent',updatedAt:new Date(this.now()).toISOString()};
    await this.saveDraft(draft);return draft;
  }
  async reconcileProvisionalActivities(accountId:string){
    const packages=await this.packages(accountId),drafts=await this.drafts(accountId);
    for(const draft of drafts.filter(x=>x.isProvisional&&x.requiresPlanningApproval)){
      const matches=packages.flatMap((pkg:any)=>(pkg.tasks||[]).map((task:any)=>({pkg,task}))).filter(({task}:any)=>task.equipment?.equipmentId===draft.clientEquipmentId&&task.grade===draft.grade&&task.checklist?.id===draft.checklistTemplateId&&task.checklist?.version===draft.checklistVersion&&task.ready);
      if(matches.length===1){draft.taskId=matches[0].task.taskId;draft.packageId=matches[0].pkg.id;draft.requiresPlanningApproval=false;draft.lastError=undefined;await this.saveDraft(draft);if(draft.localStatus==='NeedsPlanningApproval'&&draft.checkpoints.length)await this.queue(draft);}
      else if(matches.length>1){draft.localStatus='Conflict';draft.lastError='More than one approved assigned task matches this provisional inspection. Keep the local record and ask the planner to resolve the duplicate.';await this.saveDraft(draft);}
    }
  }
  async createDraft(accountId: string, pkg: any, task: any): Promise<OfflineActivityDraft> {
    if(pkg.downloadStatus!=='Ready'||!task.ready||!task.checklist?.questions?.length)throw new Error('This work package is incomplete and cannot start offline.');
    const draft: OfflineActivityDraft={clientActivityId:newStableId(),accountId,taskId:task.taskId,packageId:pkg.id,equipmentId:task.equipment.equipmentId,grade:task.grade,checklistTemplateId:task.checklist.id,checklistVersion:task.checklist.version,referenceDocumentsAtStart:(task.documents||[]).filter((d:any)=>d.downloadStatus==='Downloaded').map((d:any)=>({id:d.id,revision:d.revision,sha256:d.sha256,title:d.title})),referenceDocumentsUsed:[],startedAt:new Date(this.now()).toISOString(),checkpoints:[],findings:[],localStatus:'Draft',serverStatus:'NotSent',updatedAt:new Date(this.now()).toISOString()};
    await this.saveDraft(draft);return draft;
  }
  async saveDraft(draft: OfflineActivityDraft) {draft.updatedAt=new Date(this.now()).toISOString();await this.store.put(draft.accountId,recordId('draft',draft.clientActivityId),'draft',JSON.stringify(draft));}
  async drafts(accountId: string) {await this.bind(accountId);return (await this.store.list(accountId,'draft')).map(x=>JSON.parse(x.payload) as OfflineActivityDraft);}
  async queue(draft: OfflineActivityDraft) {
    if(!draft.checkpoints.length)throw new Error('Answer at least one checkpoint before queueing this activity.');
    if(draft.isProvisional&&(!draft.taskId||draft.requiresPlanningApproval)){
      draft.localStatus='NeedsPlanningApproval';draft.serverStatus='NotSent';draft.lastError='Provisional work is saved locally. It will sync only after an authorized planner assigns this equipment and matching checklist to an approved work package.';
      await this.saveDraft(draft);return;
    }
    draft.localStatus='Queued';draft.serverStatus='Pending';await this.saveDraft(draft);
    const outbox:OfflineOutboxItem={id:recordId('outbox',draft.clientActivityId),activityId:draft.clientActivityId,idempotencyKey:draft.clientActivityId,payload:{clientActivityId:draft.clientActivityId,taskId:draft.taskId,grade:draft.grade,checklistTemplateId:draft.checklistTemplateId,checklistVersion:draft.checklistVersion,startedAt:draft.startedAt,checkpoints:draft.checkpoints,findings:draft.findings,referenceDocumentsUsed:draft.referenceDocumentsUsed||[]},state:'Pending',attempts:0,nextAttemptAt:0};
    await this.store.put(draft.accountId,outbox.id,'outbox',JSON.stringify(outbox));
  }
  async savePhoto(draft: OfflineActivityDraft, photo: {uri?: string; type?: string; fileName?: string}, clientResponseId?: string) {
    if(!photo.uri)throw new Error('Selected photo has no readable URI.');const id=newStableId();
    await this.store.storePhoto(draft.accountId,id,photo.uri,photo.type||'image/jpeg',photo.fileName||'inspection.jpg',draft.clientActivityId,clientResponseId);
    const meta={id,activityId:draft.clientActivityId,checkpointResponseId:clientResponseId||null,fileName:photo.fileName||'inspection.jpg',mimeType:photo.type||'image/jpeg',syncStatus:'Pending'};
    await this.store.put(draft.accountId,recordId('photo-meta',id),'photo-meta',JSON.stringify(meta));return meta;
  }
  async photos(accountId: string, activityId?: string) {await this.bind(accountId);return (await this.store.list(accountId,'photo-meta')).map(x=>JSON.parse(x.payload)).filter(x=>!activityId||x.activityId===activityId);}
  async sync(accountId: string, online: boolean, transport: {submit(payload:any,key:string):Promise<any>; uploadPhoto(activityId:string,photo:any,checkpointId:string|undefined,key:string):Promise<any>; registerEquipment?(projectId:string,areaId:string,payload:any,key:string):Promise<any>; uploadEquipmentPhoto?(projectId:string,areaId:string,equipmentId:string,photo:any,role:string,key:string):Promise<any>; recordDocumentUse?(payload:any):Promise<any>; isAuthFailure(error:any):boolean}) {
    if(!online)return {sent:0,pending:(await this.store.list(accountId,'equipment-registration-outbox')).length+(await this.store.list(accountId,'equipment-photo-outbox')).length+(await this.store.list(accountId,'outbox')).length+(await this.store.list(accountId,'document-use-outbox')).length};
    await this.bind(accountId);let sent=0;
    // Dependency 1-2: create discovered equipment first, using its stable local ID as the server ID.
    for(const row of await this.store.list(accountId,'equipment-registration-outbox')){
      const item=JSON.parse(row.payload);if(item.state==='Conflict'||item.nextAttemptAt>this.now()||!transport.registerEquipment)continue;
      const raw=await this.store.get(accountId,recordId('equipment-draft',item.clientEquipmentId));if(!raw)continue;const draft=JSON.parse(raw) as OfflineEquipmentDraft;
      try{
        const ack=await transport.registerEquipment(draft.projectId,draft.areaId,{...draft,clientEquipmentId:draft.clientEquipmentId},draft.clientEquipmentId);
        const serverId=ack?.id||ack?.equipmentId;if(!serverId||serverId.toLowerCase()!==draft.clientEquipmentId.toLowerCase())throw new Error('Server did not acknowledge the stable equipment ID.');
        draft.serverEquipmentId=serverId;draft.registrationStatus='Synced';draft.lastError=undefined;await this.updateEquipmentDraft(draft);await this.store.remove(accountId,row.id);
      }catch(error:any){
        if(transport.isAuthFailure(error)){await this.store.remove(accountId,'offline-credential');throw new Error('Offline session expired or was revoked. Equipment and inspection drafts remain encrypted on this device.');}
        const status=Number(error?.response?.status);item.attempts=(item.attempts||0)+1;item.lastError=String(error?.response?.data?.error||error?.message||'Equipment registration synchronization failed');
        if(status===409||status===400){item.state='Conflict';draft.registrationStatus='Conflict';}else{item.state='Retry';item.nextAttemptAt=this.now()+Math.min(60*60*1000,1000*2**Math.min(item.attempts,12));draft.registrationStatus='Failed';}
        draft.lastError=item.lastError;await this.store.put(accountId,row.id,'equipment-registration-outbox',JSON.stringify(item));await this.updateEquipmentDraft(draft);
      }
    }
    // Dependency 3-4: resolve RFID during registration, then upload role-tagged equipment evidence.
    for(const row of await this.store.list(accountId,'equipment-photo-outbox')){
      const item=JSON.parse(row.payload);if(item.state==='Conflict'||item.nextAttemptAt>this.now()||!transport.uploadEquipmentPhoto)continue;
      const raw=await this.store.get(accountId,recordId('equipment-draft',item.clientEquipmentId));if(!raw)continue;const draft=JSON.parse(raw) as OfflineEquipmentDraft;if(draft.registrationStatus!=='Synced'||!draft.serverEquipmentId)continue;
      const photoRaw=await this.store.get(accountId,item.id);if(!photoRaw)continue;const photo=JSON.parse(photoRaw);let exported:string|undefined;
      try{exported=await this.store.exportPhoto(accountId,item.id);await transport.uploadEquipmentPhoto(draft.projectId,draft.areaId,draft.serverEquipmentId,{uri:exported,type:item.mimeType,fileName:item.fileName},item.role,item.id);await this.store.remove(accountId,item.id);await this.store.remove(accountId,row.id);}
      catch(error:any){if(transport.isAuthFailure(error)){await this.store.remove(accountId,'offline-credential');throw new Error('Offline session expired or was revoked. Equipment evidence remains encrypted on this device.');}const status=Number(error?.response?.status);item.attempts=(item.attempts||0)+1;item.lastError=String(error?.response?.data?.error||error?.message||'Equipment photo synchronization failed');if(status===409||status===400)item.state='Conflict';else{item.state='Retry';item.nextAttemptAt=this.now()+Math.min(60*60*1000,1000*2**Math.min(item.attempts,12));}await this.store.put(accountId,row.id,'equipment-photo-outbox',JSON.stringify(item));}
      finally{if(exported)await this.store.deleteExportedPhoto(exported);}
    }
    const queue=(await this.store.list(accountId,'outbox')).map(x=>JSON.parse(x.payload) as OfflineOutboxItem);
    for(const item of queue){if(item.state==='Conflict'||item.nextAttemptAt>this.now())continue;
      const draftBefore=await this.store.get(accountId,recordId('draft',item.activityId));if(draftBefore){const candidate=JSON.parse(draftBefore) as OfflineActivityDraft;if(candidate.isProvisional&&candidate.clientEquipmentId){const equipmentRaw=await this.store.get(accountId,recordId('equipment-draft',candidate.clientEquipmentId));const equipment=equipmentRaw?JSON.parse(equipmentRaw) as OfflineEquipmentDraft:null;if(!equipment||equipment.registrationStatus!=='Synced'||(await this.equipmentPhotos(accountId,candidate.clientEquipmentId)).length)continue;}}
      try{
        const ack=await transport.submit(item.payload,item.idempotencyKey);if(!ack?.accepted||!ack.serverActivityId)throw new Error('Server did not acknowledge the activity.');
        const draftRaw=await this.store.get(accountId,recordId('draft',item.activityId));if(!draftRaw)throw new Error('Local activity draft is missing.');const draft=JSON.parse(draftRaw) as OfflineActivityDraft;draft.serverStatus='Accepted';draft.serverActivityId=ack.serverActivityId;draft.localStatus='Queued';draft.lastError=undefined;draft.documentUsageWarning=draft.referenceDocumentsUsed?.length&&!ack.documentUsageRecorded?'Document versions opened during this inspection remain saved on this device; server document-use audit is not enabled until its database migration is applied.':undefined;await this.saveDraft(draft);
        await this.flushDocumentUse(accountId,ack.serverActivityId,transport);
        // Activity/answers are acknowledged before media; photo queue entries remain durable on transfer failure.
        const photos=await this.photos(accountId,item.activityId);
        for(const photoMeta of photos){const photoRaw=await this.store.get(accountId,photoMeta.id);if(!photoRaw)continue;const photo=JSON.parse(photoRaw);const exported=await this.store.exportPhoto(accountId,photoMeta.id);
          try{await transport.uploadPhoto(ack.serverActivityId,{uri:exported,type:photo.mimeType,fileName:photo.fileName},photo.checkpointResponseId?ack.responseMap?.[photo.checkpointResponseId]:undefined,photoMeta.id);await this.store.remove(accountId,photoMeta.id);await this.store.remove(accountId,recordId('photo-meta',photoMeta.id));}
          finally{await this.store.deleteExportedPhoto(exported);}
        }
        await this.store.remove(accountId,item.id);sent++;
      }catch(error:any){
        if(transport.isAuthFailure(error)){await this.store.remove(accountId,'offline-credential');throw new Error('This offline session was revoked or expired. Your unsynchronized inspection data remains encrypted on this device; sign in online again to submit it.');}
        const status=Number(error?.response?.status);item.attempts++;item.lastError=String(error?.response?.data?.error||error?.message||'Synchronization failed');
        if(status===409||status===400){item.state='Conflict';}else{item.state='Retry';item.nextAttemptAt=this.now()+Math.min(60*60*1000,1000*Math.pow(2,Math.min(item.attempts,12)));}
        await this.store.put(accountId,item.id,'outbox',JSON.stringify(item));const draftRaw=await this.store.get(accountId,recordId('draft',item.activityId));if(draftRaw){const d=JSON.parse(draftRaw) as OfflineActivityDraft;d.localStatus=item.state==='Conflict'?'Conflict':'Failed';d.lastError=item.lastError;await this.saveDraft(d);}
      }
    }
    const acceptedDrafts=await this.drafts(accountId);for(const draft of acceptedDrafts.filter(x=>x.serverStatus==='Accepted'&&x.serverActivityId))await this.flushDocumentUse(accountId,draft.serverActivityId!,transport);
    if(sent>0){const previous=await this.store.get(accountId,'offline-meta');await this.store.put(accountId,'offline-meta','metadata',JSON.stringify({...JSON.parse(previous||'{}'),lastSuccessfulSyncAt:new Date(this.now()).toISOString()}));}
    return {sent,pending:(await this.store.list(accountId,'equipment-registration-outbox')).length+(await this.store.list(accountId,'equipment-photo-outbox')).length+(await this.store.list(accountId,'outbox')).length+(await this.store.list(accountId,'document-use-outbox')).length};
  }
  private async flushDocumentUse(accountId:string,serverActivityId:string,transport:{recordDocumentUse?(payload:any):Promise<any>}){if(!transport.recordDocumentUse)return;const events=await this.store.list(accountId,'document-use-outbox');for(const row of events){const event=JSON.parse(row.payload);const draft=(await this.drafts(accountId)).find(x=>x.clientActivityId===event.clientActivityId);if(!draft||draft.serverActivityId!==serverActivityId||event.nextAttemptAt>this.now())continue;try{const ack=await transport.recordDocumentUse({eventId:event.eventId,activityId:serverActivityId,workPackageId:event.workPackageId,documentId:event.documentId,revision:event.revision,sha256:event.sha256,openedAt:event.openedAt});if(!ack?.acknowledged)throw new Error('Document-use event was not acknowledged.');await this.store.remove(accountId,row.id);}catch(error:any){event.attempts=(event.attempts||0)+1;event.nextAttemptAt=this.now()+Math.min(60*60*1000,1000*2**Math.min(event.attempts,12));event.lastError=String(error?.message||'Document-use synchronization failed');await this.store.put(accountId,row.id,'document-use-outbox',JSON.stringify(event));}}const refreshed=await this.drafts(accountId);const linked=refreshed.find(x=>x.serverActivityId===serverActivityId);if(linked?.documentUsageWarning&&!(await this.store.list(accountId,'document-use-outbox')).some(x=>JSON.parse(x.payload).clientActivityId===linked.clientActivityId)){linked.documentUsageWarning=undefined;await this.saveDraft(linked);}}
  private tokenExpiry(token:string){try{const part=token.split('.')[1];if(!part)return 0;const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const input=part.replace(/-/g,'+').replace(/_/g,'/');let buffer=0,bits=0,binary='';for(const char of input){const value=alphabet.indexOf(char);if(value<0)continue;buffer=(buffer<<6)|value;bits+=6;if(bits>=8){bits-=8;binary+=String.fromCharCode((buffer>>bits)&255);}}const match=binary.match(/"exp"\s*:\s*(\d+)/);return match?Number(match[1])*1000:0;}catch{return 0;}}
}

function toBase64(bytes:Uint8Array){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],hasB=i+1<bytes.length,hasC=i+2<bytes.length,b=hasB?bytes[i+1]:0,c=hasC?bytes[i+2]:0;out+=chars[a>>2]+chars[((a&3)<<4)|(b>>4)]+(hasB?chars[((b&15)<<2)|(c>>6)]:'=')+(hasC?chars[c&63]:'=');}return out;}

export const offlineInspectionService = new OfflineInspectionService(androidOfflineStore);
