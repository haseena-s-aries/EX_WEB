import api, {getApiResourceUrl, getAuthToken, setAuthToken} from '../api/client';
import {canConsolidate, mergeEvidence} from './fieldworkQueueRules';
import {getSessionProfile} from '../api/profileState';
import {applyConflictChoices, Choice} from './fieldworkConflicts';
import {establishFieldwork, fieldworkChanged, fieldworkSession, OFFLINE_WINDOW_MS, stableId, vaultBlob, vaultGet, vaultList, vaultSave} from './fieldworkStore';

export type Point = {code:string;section:string;itemNumber:number;text:string;protectionApplicability:string};
export type Attachment = {id:string;name:string;mime:string;url?:string;owner:string;layoutImageKey?:string;uploadedAt?:string};
export type Bundle = {id:string;name:string;downloadedAt:string;state:'Ready'|'Downloading'|'Failed';error?:string;
  project:any;areas:any[];equipment:any[];points:Record<string,Point[]>;template:Point[];activities:Record<string,any>;
  histories:Record<string,any[]>;defects:any[];files:Attachment[];versions:{equipment:Record<string,string>;defects:Record<string,string>};
  checklistVersions:Record<string,number>;catalog:any;plans:any[]};
export type InspectionDraft = {id:string;projectId:string;equipmentId:string;date:string;activityId?:string;rowVersion?:string;
  points:Point[];answers:Record<string,{grades:Record<string,string|null>;remarks:string;comment?:string}>;comments:string;hold:boolean;submit:boolean;photos:Attachment[]};
export type Operation = {id:string;projectId:string;entityId:string;kind:'equipment'|'inspection'|'defect'|'checklist'|'photo';
  createdAt:string;status:'Pending'|'Syncing'|'Failed'|'Conflict'|'Blocked'|'Synced';attempts:number;error?:string;server?:any;
  payload:any;baseVersion?:string;dependsOn:string[];step:number;requests:Record<string,WireRequest>;results:Record<string,any>;lastAttempt?:string;nextAttempt?:number;errorStatus?:number};
type WireRequest = {id:string;url:string;method:'POST'|'PUT';data:any;version?:string;file?:Attachment;fields?:Record<string,string>};
export const bundles = ()=>vaultList<Bundle>('project');
export const operations = ()=>vaultList<Operation>('operation');
export let syncState = {running:false,done:0,total:0,message:'',lastSuccess:'',
  /** True while the API session is expired/rejected. Sync is paused; all local work is retained. */
  authRequired:false};
export const pendingOperations = async()=> (await operations()).filter(o=>o.status!=='Synced');
/** JWT expiry in ms, or 0 if unreadable. */
export function tokenExpiry(token:string|null|undefined) {
  try {return JSON.parse(atob(String(token).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000||0;} catch {return 0;}
}
export async function backendReady() {
  if(!fieldworkSession()||getSessionProfile()?.id!==fieldworkSession()?.id||getSessionProfile()?.role!=='Surveyor')return false;
  const token=getAuthToken();
  if(!token||tokenExpiry(token)<=Date.now()+15000){syncState.authRequired=true;fieldworkChanged();return false;}
  try {await api.get('/fieldwork/session',{timeout:8000});syncState.authRequired=false;return true;}
  catch(e:any){if(e?.response?.status===401){syncState.authRequired=true;fieldworkChanged();}return false;}
}

/**
 * Re-authenticate in place (token expired) without leaving the fieldwork screen or touching local work.
 * The same account must sign in; a different account is refused so vaults stay isolated.
 */
export async function reauthenticate(password:string):Promise<'ready'|'rekey-required'> {
  const current=fieldworkSession();const profile=getSessionProfile();
  const email=current?.email||profile?.email;
  if(!email)throw new Error('Sign in from the login screen.');
  const {loginUser}=await import('../api/auth');
  let response;
  try {response=await loginUser(email,password);}
  catch(e:any){throw new Error(e?.response?.data?.error||(e?.response?'Sign-in failed. Check your password.':'Still offline. Your work stays on this device; retry when connected.'));}
  const {accessToken,user}=response.data;
  if(user.id!==(current?.id||profile?.id))throw new Error('A different account signed in. Synchronization stays paused for the original account.');
  const expires=tokenExpiry(accessToken);
  setAuthToken(accessToken);
  // setAuthToken(null) clears the profile only; restore it for the same user so the workspace keeps working.
  if(!getSessionProfile()){const {setSessionProfile}=await import('../api/profileState');setSessionProfile({id:user.id,email:user.email,displayName:user.displayName,role:user.role,approvalStatus:'Approved'});}
  syncState.authRequired=false;
  // Always re-open the vault with the password just verified online: if the password changed elsewhere,
  // this detects it and asks for the previous password to re-key (pending work is never dropped).
  const result=await establishFieldwork({id:user.id,email:user.email,name:user.displayName,role:user.role,token:accessToken,tokenExpires:expires,expires:Date.now()+OFFLINE_WINDOW_MS},password);
  return result==='rekey-required'?'rekey-required':'ready';
}
const categoryBase=(p:string,e:string)=>`/v1/inspection-activities/category-checklist/projects/${p}/equipment/${e}`;
const equipmentBase=(p:string,a:string)=>`/surveyor/projects/${p}/areas/${a}/equipment`;
const get=async(url:string,params?:any)=>(await api.get(url,{params,timeout:45000})).data;

export async function downloadProject(id:string,progress:(message:string)=>void) {
  const registration=await navigator.serviceWorker?.getRegistration();
  if(!registration?.active)throw new Error('The offline app shell is not installed yet. Reload this page once while online, then download again. Without it the app cannot reopen offline.');
  if((await pendingOperations()).some(o=>o.projectId===id))throw new Error('Synchronize or resolve this project’s pending work before replacing its download.');
  if(!await backendReady())throw new Error('Connect and sign in to download this project.');
  const owner=fieldworkSession()!.id;
  const old=await vaultGet<Bundle>('project/'+id);
  try {
    progress('Downloading project and areas…');
    const project=await get(`/surveyor/projects/${id}`);
    const areas=await get(`/surveyor/projects/${id}/areas`);
    const b:Bundle={id,name:project.projectName,downloadedAt:'',state:'Downloading',project,areas,equipment:[],points:{},template:[],activities:{},histories:{},defects:[],files:[],versions:{equipment:{},defects:{}},checklistVersions:{},catalog:{},plans:[]};
    b.versions=await get(`/fieldwork/projects/${id}/versions`);
    b.catalog=await get('/v1/inspection-activities/category-checklist/catalog');
    b.template=await get(`/v1/inspection-activities/category-checklist/projects/${id}/fieldwork-template`);
    b.plans=(await get('/surveyor/pending-tasks')).filter((t:any)=>t.projectId===id);
    b.defects=(await get('/defects',{projectId:id})).items;
    const addFiles=(rows:any[],ownerId:string)=>rows.forEach(r=>{
      const url=r.downloadUrl||r.url||r.filePath;
      if(url&&!b.files.some(f=>f.url===url))b.files.push({id:stableId(),name:r.fileName||'Supporting file',mime:r.contentType||(/\.pdf/i.test(url)?'application/pdf':'image/jpeg'),url,owner:ownerId,uploadedAt:r.uploadedAt,
        layoutImageKey:r.id?(ownerId===id?`common:${r.id}`:`area:${r.id}`):undefined});
    });
    addFiles(await get(`/projects/${id}/common-layouts`),id);
    // Full project data includes the hazardous-area plan and persisted project metadata.
    const full=await get(`/projects/${id}`);b.project={...full,...project};
    if(full.hazardousAreaPlanPath)addFiles([{url:full.hazardousAreaPlanPath,fileName:'Hazardous area plan'}],id);
    for(const area of areas){
      const areaId=area.areaId||area.id;
      addFiles(await get(`/projects/${id}/areas/${areaId}/photos`),areaId);
      const equipment=await get(equipmentBase(id,areaId));
      for(const e of equipment){
        progress(`Downloading ${e.tagNumber}: equipment, checklist and history…`);
        b.equipment.push({...e,...await get(`/surveyor/equipment/${e.id}`),areaId});
        const selection=await get(`/v1/inspection-activities/category-checklist/projects/${id}/selection`,{equipmentId:e.id});
        b.points[e.id]=selection.selectedCodes.length
          ? selection.points.filter((point:Point)=>selection.selectedCodes.includes(point.code)) : selection.points;
        b.checklistVersions[e.id]=selection.version;
        const history=[...await get(`/v1/inspection-activities/equipment/${e.id}`,{categoryOnly:true}),...await get(`/v1/inspection-activities/equipment/${e.id}`)];
        b.histories[e.id]=history;
        for(const row of history){b.activities[row.id]=await get(`/v1/inspection-activities/${row.id}`);addFiles(b.activities[row.id].evidence||[],row.id);}
        addFiles(await get(`${equipmentBase(id,areaId)}/${e.id}/photos`),e.id);
      }
    }
    for(const d of b.defects)addFiles(d.photos||[],d.id);
    for(let i=0;i<b.files.length;i++){
      const f=b.files[i];progress(`Downloading supporting files ${i+1} of ${b.files.length}…`);
      const url=getApiResourceUrl(f.url!);
      if(new URL(url).origin!==new URL(String(api.defaults.baseURL)).origin)throw new Error('A supporting file uses an unsupported external location. The project is not offline-ready.');
      const response=await api.get(url,{responseType:'blob',timeout:60000});const blob=response.data as Blob;
      if(!blob.size||blob.type.includes('text/html'))throw new Error(`Could not verify ${f.name}.`);
      f.mime=blob.type||f.mime;await vaultSave([], [{id:'file/'+f.id,blob}]);
      if(!(await vaultBlob('file/'+f.id,f.mime)).size)throw new Error(`Device copy of ${f.name} could not be verified.`);
    }
    if(owner!==fieldworkSession()?.id)throw new Error('Account changed during download.');
    b.state='Ready';b.downloadedAt=new Date().toISOString();
    await vaultSave([{id:'project/'+id,type:'project',value:b}]);progress('Available Offline');return b;
  }catch(e:any){
    if(!old&&owner===fieldworkSession()?.id)await vaultSave([{id:'project/'+id,type:'project',value:{id,name:id,state:'Failed',error:e.message}}]);
    throw e;
  }
}

export async function queueChange(kind:Operation['kind'],projectId:string,entityId:string,payload:any,baseVersion?:string,files:File[]=[]) {
  if(!navigator.locks)throw new Error('This browser cannot safely coordinate offline saves. Update your browser.');
  return navigator.locks.request('ex-survey-fieldwork-sync',()=>queueChangeLocked(kind,projectId,entityId,payload,baseVersion,files));
}
async function queueChangeLocked(kind:Operation['kind'],projectId:string,entityId:string,payload:any,baseVersion?:string,files:File[]=[]) {
  const b=await vaultGet<Bundle>('project/'+projectId);
  if(b?.state!=='Ready')throw new Error('Download this assigned project before saving fieldwork.');
  const pending=await pendingOperations();
  const dependencies=pending.filter(o=>o.entityId===entityId||o.entityId===payload.equipmentId).map(o=>o.id);
  const previous=pending.filter(o=>o.entityId===entityId&&o.kind===kind).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  const op:Operation={id:stableId(),kind,projectId,entityId,payload,baseVersion,dependsOn:dependencies,createdAt:new Date().toISOString(),status:'Pending',attempts:0,step:0,requests:{},results:{}};
  const attachments=files.map(f=>({id:stableId(),name:f.name,mime:f.type,owner:entityId}));
  op.payload={...payload,photos:[...(payload.photos||[]),...attachments]};
  if(previous&&canConsolidate(previous)) {
    op.id=previous.id;op.createdAt=previous.createdAt;op.dependsOn=previous.dependsOn;op.baseVersion=previous.baseVersion;
    op.payload.photos=mergeEvidence(previous.payload.photos,op.payload.photos);
  } else if(previous) {
    op.baseVersion=undefined;
    op.payload.previousOperationId=previous.id;
  }
  const rows:{id:string;type:string;value:any}[]=[{id:'operation/'+op.id,type:'operation',value:op}];
  if(previous)rows.push({id:'save-history/'+stableId(),type:'save-history',value:{operationId:previous.id,projectId,entityId,savedAt:new Date().toISOString(),payload:previous.payload}});
  if(kind==='equipment') {
    const index=b.equipment.findIndex(e=>e.id===entityId);
    const item={...(index<0?{}:b.equipment[index]),...payload,id:entityId,projectId,
      sequenceNo:index<0?null:b.equipment[index].sequenceNo,
      markingNo:index<0?null:b.equipment[index].markingNo,localPending:true};
    if(index<0)b.equipment.push(item);else b.equipment[index]=item;
    b.points[entityId]??=b.template;
    rows.push({id:'project/'+projectId,type:'project',value:b});
  }
  if(kind==='inspection')rows.push({id:'draft/'+entityId,type:'draft',value:op.payload});
  if(kind==='defect'){const index=b.defects.findIndex(d=>d.id===entityId);const d={...payload,id:entityId,localPending:true};if(index<0)b.defects.push(d);else b.defects[index]=d;rows.push({id:'project/'+projectId,type:'project',value:b});}
  if(kind==='checklist'){
    b.points[entityId]=payload.points;
    b.checklistVersions??={};
    rows.push({id:'project/'+projectId,type:'project',value:b});
  }
  await vaultSave(rows,files.map((blob,i)=>({id:'file/'+attachments[i].id,blob})));
  return op;
}
const saveOp=(op:Operation)=>vaultSave([{id:'operation/'+op.id,type:'operation',value:op}]);

export async function loadConflict(op:Operation) {
  if(!await backendReady())throw new Error('Connect and sign in to review current server values.');
  const id=op.kind==='inspection'?(op.results.open?.result?.id||op.payload.activityId):op.entityId;
  if(!id)throw new Error('This operation could not open a server record. Correct its validation error before retrying.');
  const state=await get(`/fieldwork/projects/${op.projectId}/records/${op.kind==='inspection'?'activity':op.kind}/${id}`);
  if(op.kind==='inspection') {
    const activity=await get(`/v1/inspection-activities/${id}`);
    if(!['Draft','ChangesRequested'].includes(activity.reviewStatus))throw new Error('This inspection is locked. Its QC decision cannot be overwritten. Your local work remains preserved.');
    const answers:InspectionDraft['answers']={};
    for(const p of activity.checkpoints){const r=activity.responses.find((r:any)=>r.checkpointDefinitionSnapshotId===p.id);answers[p.questionCode]={grades:r?.gradeResultsJson?JSON.parse(r.gradeResultsJson):{},remarks:r?.observation||'',comment:r?.inspectionComment||''};}
    return {version:activity.rowVersion,server:{answers,comments:activity.equipmentComments||'',hold:activity.isOnHold},activityId:id};
  }
  if(op.kind==='checklist')
    return {version:String(state.version),server:{points:(state.server.points||[]) as Point[],source:state.server.source},activityId:undefined};
  const server={...state.server};
  if(op.kind==='equipment')server.equipmentId=server.equipmentCode;
  if(op.kind==='defect'){server.date=server.registerDate;server.grade=server.registerGrade;}
  return {version:state.version,server,activityId:undefined};
}

export async function resolveConflict(id:string,reviewed:Awaited<ReturnType<typeof loadConflict>>,choices:Record<string,Choice>) {
  return navigator.locks.request('ex-survey-fieldwork-sync',async()=>{
    const op=await vaultGet<Operation>('operation/'+id);
    if(!op||op.status!=='Conflict')throw new Error('This conflict has already changed. Refresh it.');
    const current=await loadConflict(op);
    if(current.version!==reviewed.version)throw new Error('The server changed again. Reload the comparison before resolving.');
    const original=JSON.parse(JSON.stringify(op));
    // Throws unless every differing field has an explicit choice; both versions are kept in conflict-history.
    op.payload=applyConflictChoices(op.kind,op.payload,current.server,choices);
    op.baseVersion=current.version;
    if(op.kind==='checklist'){op.payload.version=Number(current.version);delete op.payload.previousOperationId;}
    if(op.kind==='inspection'){op.payload.activityId=current.activityId;op.payload.rowVersion=current.version;delete op.payload.previousOperationId;}
    // Keep confirmed upload receipts; new record/checkpoint edits get new request IDs.
    op.requests=Object.fromEntries(Object.entries(op.requests).filter(([k])=>k.startsWith('photo/')&&op.results[k]));
    op.results=Object.fromEntries(Object.entries(op.results).filter(([k])=>k.startsWith('photo/')));
    op.status='Pending';op.error=undefined;op.server=undefined;op.nextAttempt=undefined;
    await vaultSave([{id:'conflict-history/'+stableId(),type:'conflict-history',value:{original,server:current,choices,resolvedAt:new Date().toISOString()}},{id:'operation/'+id,type:'operation',value:op}]);
  });
}

/** Save the exact request BEFORE transmission. A retry always uses the same key and payload. */
async function send(op:Operation,key:string,make:()=>Promise<Omit<WireRequest,'id'>>|Omit<WireRequest,'id'>) {
  if(op.results[key])return op.results[key];
  if(!op.requests[key]){op.requests[key]={...await make(),id:stableId()};await saveOp(op);}
  const r=op.requests[key];let data:any=r.data;
  if(getSessionProfile()?.id!==fieldworkSession()?.id)throw new Error('Account changed. Synchronization paused.');
  if(r.file){const form=new FormData();Object.entries(r.fields||{}).forEach(([k,v])=>form.append(k,v));form.append(r.data.field,await vaultBlob('file/'+r.file.id,r.file.mime),r.file.name);data=form;}
  const response=await api.request({url:r.url,method:r.method,data,timeout:60000,headers:{'X-Fieldwork-Operation':r.id,'X-Fieldwork-Project':op.projectId,...(r.version?{'X-Fieldwork-Version':r.version}:{})}});
  if(!response.data||!Object.prototype.hasOwnProperty.call(response.data,'result'))throw new Error('The API did not confirm durable fieldwork synchronization. Update the backend before retrying.');
  op.results[key]=response.data;op.step++;await saveOp(op);return response.data;
}

async function synchronizeOperation(op:Operation) {
  const b=(await vaultGet<Bundle>('project/'+op.projectId))!;
  const predecessor=op.payload.previousOperationId?await vaultGet<Operation>('operation/'+op.payload.previousOperationId):undefined;
  if(predecessor&&predecessor.status!=='Synced')throw new Error('The previous save must synchronize first.');
  if(op.kind==='equipment'){
    const p=op.payload;const create=!b.versions.equipment[op.entityId];
    const r=await send(op,'equipment',()=>({url:equipmentBase(op.projectId,p.areaId)+(create?'':'/'+op.entityId),method:create?'POST':'PUT',
      data:{...p,clientEquipmentId:create?op.entityId:undefined,photos:undefined,xPercent:p.xPercent??0,yPercent:p.yPercent??0,isPlacedOnLayout:p.isPlacedOnLayout??false},
      version:create?undefined:op.baseVersion||b.versions.equipment[op.entityId]}));
    b.versions.equipment[op.entityId]=r.version;
    const item=b.equipment.find(e=>e.id===op.entityId);if(item){item.sequenceNo=r.result.sequenceNo;item.markingNo=r.result.markingNo;item.localPending=false;}
    await vaultSave([{id:'project/'+b.id,type:'project',value:b}]);
    for(const f of p.photos||[])await send(op,'photo/'+f.id,()=>({url:`${equipmentBase(op.projectId,p.areaId)}/${op.entityId}/photos`,method:'POST',data:{field:'Files'},file:f,fields:{Role:'Overview',ClientPhotoId:f.id}}));
  }
  if(op.kind==='defect'){
    const r=await send(op,'defect',()=>({url:`/defects/register/projects/${op.projectId}/${op.entityId}`,method:'PUT',data:op.payload,version:op.baseVersion||b.versions.defects[op.entityId]||'new'}));
    b.versions.defects[op.entityId]=r.version;await vaultSave([{id:'project/'+b.id,type:'project',value:b}]);
    for(const [i,f] of (op.payload.photos||[]).entries())await send(op,'photo/'+f.id,()=>({url:`/defects/register/${op.entityId}/photos/${i+1}`,method:'PUT',data:{field:'photo'},file:f}));
  }
  if(op.kind==='checklist'){
    b.checklistVersions??={};
    // A successor save is based on the version its synchronized predecessor produced, not the stale download.
    const base=predecessor?b.checklistVersions[op.entityId]??op.payload.version:op.payload.version;
    const r=await send(op,'checklist',()=>({url:`/v1/inspection-activities/category-checklist/projects/${op.projectId}/selection?equipmentId=${op.entityId}`,
      method:'PUT',data:{codes:op.payload.points.map((point:Point)=>point.code),version:base,
        categoryChanges:Object.fromEntries(op.payload.points.map((point:Point)=>[point.code,point.protectionApplicability])),
        descriptionChanges:Object.fromEntries(op.payload.points.map((point:Point)=>[point.code,point.text]))},version:String(base)}));
    b.points[op.entityId]=op.payload.points;b.checklistVersions[op.entityId]=r.result.version;
    await vaultSave([{id:'project/'+b.id,type:'project',value:b}]);
  }
  if(op.kind==='inspection'){
    const draft=op.payload as InspectionDraft;
    let activityId=draft.activityId;
    let version=draft.rowVersion;
    if(predecessor){
      activityId=predecessor.results.open?.result?.id||predecessor.payload.activityId||activityId;
      const responses=Object.values(predecessor.results).filter((r:any)=>r.activityRowVersion);
      version=responses.at(-1)?.activityRowVersion||version;
    }
    if(!activityId){const r=await send(op,'open',()=>({url:categoryBase(op.projectId,draft.equipmentId)+'/open',method:'POST',data:{inspectionDate:draft.date}}));activityId=r.result.id;version=r.activityRowVersion;}
    // Use saved definitions. Fetching them does not replace the downloaded base row version.
    const activity=await get(`/v1/inspection-activities/${activityId}`);
    if(!['Draft','ChangesRequested'].includes(activity.reviewStatus))throw Object.assign(new Error('This inspection is locked by its current review status.'),{response:{status:409,data:{server:activity}}});
    for(const [code,answer] of Object.entries(draft.answers)){
      const definition=activity.checkpoints.find((p:any)=>p.questionCode===code);
      const source=draft.points.find(p=>p.code===code);
      if(!definition||definition.questionText!==source?.text)throw Object.assign(new Error('Checklist content changed. Review the local and current checkpoint definitions.'),{response:{status:409,data:{server:activity.checkpoints}}});
      const r=await send(op,'checkpoint/'+code,()=>({url:`/v1/inspection-activities/${activityId}/checkpoints`,method:'POST',data:{checkpointDefinitionSnapshotId:definition.id,gradeResults:answer.grades,observation:answer.remarks,inspectionComment:answer.comment,activityRowVersion:version}}));
      version=r.activityRowVersion;
    }
    const comments=await send(op,'comments',()=>({url:`/v1/inspection-activities/${activityId}/equipment-comments`,method:'PUT',data:{comments:draft.comments,isOnHold:draft.hold,rowVersion:version}}));version=comments.activityRowVersion;
    for(const f of draft.photos)await send(op,'photo/'+f.id,()=>({url:`/v1/inspection-activities/${activityId}/photos`,method:'POST',data:{field:'photo'},file:f}));
    if(draft.submit)await send(op,'submit',()=>({url:`/v1/inspection-activities/${activityId}/submit`,method:'POST',data:{}}));
    b.activities[activityId!]=await get(`/v1/inspection-activities/${activityId}`);
    await vaultSave([{id:'project/'+b.id,type:'project',value:b},{id:'draft/'+op.entityId,type:'draft',value:{...draft,activityId,rowVersion:b.activities[activityId!].rowVersion,synced:true}}]);
  }
}

let activeRun:Promise<void>|undefined;
export function syncNow(manual=false):Promise<void> {
  if(activeRun)return activeRun;
  const run=async()=>{
    if(!await backendReady()){
      syncState.message=syncState.authRequired?'Session expired. Synchronization is paused; sign in again to resume. All changes remain on this device.'
        :'Offline or server unavailable. Changes remain safely on this device.';
      fieldworkChanged();return;
    }
    const owner=fieldworkSession()!.id;
    const all=await operations();const pending=all.filter(o=>o.status!=='Synced');
    // A successful authenticated probe permits retrying authentication failures only.
    for(const op of pending)if(op.status==='Blocked'&&op.errorStatus===401){op.status='Pending';op.nextAttempt=undefined;await saveOp(op);}
    // Revalidate assignment per project before sending anything. Denied projects are quarantined (never discarded);
    // a restored assignment releases them automatically.
    const denied=new Set<string>();
    for(const projectId of [...new Set(pending.map(o=>o.projectId))]){
      try{await api.get(`/fieldwork/projects/${projectId}/access`,{timeout:15000});}
      catch(e:any){
        const status=e?.response?.status;
        if(status===401){syncState.authRequired=true;syncState.message='Session expired. Synchronization is paused; sign in again to resume.';fieldworkChanged();return;}
        if(status===403||status===404){denied.add(projectId);continue;}
        syncState.message='Server unavailable. Changes remain safely on this device.';fieldworkChanged();return;
      }
    }
    for(const op of pending){
      if(denied.has(op.projectId)&&op.status!=='Blocked'&&op.status!=='Conflict'){op.status='Blocked';op.errorStatus=403;op.error='Project assignment or permission changed. This work is retained for an authorized resolution.';await saveOp(op);}
      else if(!denied.has(op.projectId)&&op.status==='Blocked'&&op.errorStatus===403){op.status='Pending';op.error=undefined;op.nextAttempt=undefined;await saveOp(op);}
    }
    syncState={...syncState,running:true,done:0,total:pending.length,message:'Syncing'};fieldworkChanged();
    try{
      for(const op of pending.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
        if(owner!==fieldworkSession()?.id)break;
        if(op.status==='Conflict'||op.status==='Blocked'||(!manual&&op.nextAttempt&&op.nextAttempt>Date.now()))continue;
        if(op.dependsOn.some(id=>all.find(o=>o.id===id)?.status!=='Synced'))continue;
        op.status='Syncing';op.lastAttempt=new Date().toISOString();op.attempts++;await saveOp(op);
        try{await synchronizeOperation(op);op.status='Synced';op.error=undefined;syncState.done++;}
        catch(e:any){const status=e.response?.status;op.errorStatus=status;op.status=status===409?'Conflict':status===401||status===403?'Blocked':'Failed';op.error=status===401?'Session expired before the server confirmed this change. It will be retried after you sign in again.':e.response?.data?.error||e.message||'Synchronization failed';op.server=e.response?.data?.server;op.nextAttempt=Date.now()+Math.min(300000,1000*2**Math.min(op.attempts,8));if(status===401)syncState.authRequired=true;}
        await saveOp(op);fieldworkChanged();
        if(op.status==='Blocked'&&op.errorStatus===401)break;
      }
      const remaining=await pendingOperations();syncState.message=syncState.authRequired?'Session expired. Synchronization is paused; sign in again to resume. All changes remain on this device.'
        :remaining.length?`${remaining.length} change${remaining.length===1?'':'s'} still need${remaining.length===1?'s':''} synchronization or attention`:'All Changes Synced';
      if(!remaining.length){syncState.lastSuccess=new Date().toISOString();await vaultSave([{id:'sync-status',type:'metadata',value:{lastSuccess:syncState.lastSuccess}}]);}
    }finally{syncState.running=false;fieldworkChanged();}
  };
  activeRun=(navigator.locks?navigator.locks.request('ex-survey-fieldwork-sync',run):Promise.reject(new Error('This browser cannot safely coordinate synchronization. Use a current browser with Web Locks support.'))).finally(()=>{activeRun=undefined;});
  return activeRun;
}
export function startAutomaticSync() {
  const trigger=()=>{if(document.visibilityState==='visible'&&fieldworkSession())void syncNow().catch(()=>{});};
  window.addEventListener('online',trigger);document.addEventListener('visibilitychange',trigger);
  const timer=setInterval(trigger,30000);trigger();
  return ()=>{clearInterval(timer);window.removeEventListener('online',trigger);document.removeEventListener('visibilitychange',trigger);};
}
