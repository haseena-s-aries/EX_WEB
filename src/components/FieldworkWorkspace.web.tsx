import FieldworkConflict from './FieldworkConflict.web';
import React, {useEffect, useRef, useState} from 'react';
import {projectDisplay} from '../utils/projectDisplay';
import {createPortal} from 'react-dom';
import api, {getAuthToken} from '../api/client';
import {useSessionProfile} from '../api/profileState';
import {Attachment, Bundle, bundles, downloadProject, InspectionDraft, Operation, operations, pendingOperations, queueChange, reauthenticate, startAutomaticSync, syncNow, syncState, tokenExpiry} from '../offline/fieldwork';
import {ArchivedVault, archivedVaults, archiveVaultAndStartFresh, fieldworkSession, lockFieldwork, onFieldworkChange, recoverArchivedVault, rekeyRequired, rekeyWithPreviousPassword, stableId, unlockFieldwork, vaultBlob, vaultGet, vaultSave} from '../offline/fieldworkStore';
import {browserFieldworkEnabled} from '../offline/fieldworkConfig';
import {sameChecklist} from '../offline/fieldworkConflicts';

const equipmentFields=[['tagNumber','Item Tag *'],['equipmentId','Equipment ID / Ex-Tag'],['type','Equipment Type *'],['description','Description'],['location','Location / Area'],['hazardousAreaZone','Zone / Division'],['exProtectionType','Protection Type'],['manufacturer','Manufacturer'],['model','Model'],['serialNumber','Manufacturer Serial Number'],['circuitId','Circuit ID'],['certificateNumber','Certificate Number'],['gasGroup','Gas Group'],['temperatureClass','Temperature Class'],['ambientTemperatureRange','Ambient Temperature'],['ipRating','IP Rating'],['notifiedBody','Certificate Issuing Organization'],['specialConditionsOfUse','Special Conditions of Use'],['rfidTagUid','RFID / NFC UID']];
const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
export default function FieldworkLauncher(){
  const profile=useSessionProfile();const [open,setOpen]=useState(false);const [count,setCount]=useState(0);const [tick,setTick]=useState(0);
  const [online,setOnline]=useState(typeof navigator==='undefined'||navigator.onLine);
  const enabled=profile?.role==='Surveyor'&&browserFieldworkEnabled();
  useEffect(()=>onFieldworkChange(()=>setTick(t=>t+1)),[]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  // Account isolation: a vault unlocked for another account is locked as soon as the signed-in profile differs.
  const profileId=profile?.id;
  useEffect(()=>{const s=fieldworkSession();if(s&&profileId&&s.id!==profileId)lockFieldwork();},[profileId]);
  useEffect(()=>{if(fieldworkSession())pendingOperations().then(o=>setCount(o.length)).catch(()=>{});else setCount(0);},[tick,profile?.id]);
  useEffect(()=>enabled?startAutomaticSync():undefined,[profile?.id,enabled]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(count){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[count]);
  // Rollout switch: 'local' in public/config.js enables loopback hosts only; production stays disabled.
  if(!enabled)return null;
  const locked=!fieldworkSession();
  const status=locked?'Device workspace locked':syncState.running?`Syncing ${syncState.done} of ${syncState.total}`:syncState.authRequired?'Sign in to resume sync':!online?`Offline · ${count} saved on device`:count?`${count} Pending Sync`:'All changes synced';
  const short=locked?'Locked':syncState.running?'Syncing…':syncState.authRequired?'Sign in':!online?`Offline · ${count}`:count?`${count} pending`:'Synced';
  return createPortal(<><div className="fw-dock" role="region" aria-label="Fieldwork synchronization">
    <span className={`fw-dot ${!online||syncState.authRequired||locked?'warn':count?'pending':'ok'}`} aria-hidden="true"/>
    <span className="fw-status" role="status" aria-live="polite"><span className="fw-long">{status}</span><span className="fw-short" aria-hidden="true">{short}</span></span>
    <button className="fw-sync-now" disabled={locked||syncState.running||!online} onClick={()=>void syncNow(true).catch(()=>{})} aria-label="Sync Now">↻ <span className="fw-long">Sync Now</span><span className="fw-short">Sync</span></button>
    <button className="fw-launch" onClick={()=>setOpen(true)} aria-label={`Open fieldwork and Sync Center, ${count} pending changes`}>Fieldwork<span className="fw-long"> / Sync</span></button>
  </div>{open&&<Workspace onClose={()=>setOpen(false)}/>}</>,document.body);
}

/** Unlock after refresh/restart, offline unlock, and password-change re-key. Never deletes device data. */
function VaultAccess(){
  const profile=useSessionProfile();const [password,setPassword]=useState('');const [previous,setPrevious]=useState('');
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const rekey=rekeyRequired();
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();setPassword('');setPrevious('');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  if(rekey)return <section className="fw-panel" aria-labelledby="fw-rekey"><h2 id="fw-rekey">Unlock device work saved under your previous password</h2>
    <p>Your account password changed. This device still holds fieldwork encrypted with your previous password, including any unsynchronized records and photos. Nothing has been deleted.</p>
    <form onSubmit={e=>{e.preventDefault();void run(()=>rekeyWithPreviousPassword(previous));}}><label>Previous password<input type="password" autoComplete="current-password" value={previous} onChange={e=>setPrevious(e.target.value)} required/></label>
    <div className="fw-actions"><button className="primary" disabled={busy||!previous}>Unlock and re-key to my new password</button></div></form>
    <details><summary>I do not remember my previous password</summary><p>You can set the existing device data aside. It stays encrypted on this device, is <strong>not</strong> synchronized and is <strong>not</strong> deleted, and can be recovered later from Sync Center with the previous password. A new, empty device workspace is started for new work.</p>
    <button disabled={busy} onClick={()=>{if(window.confirm('Set aside the existing device workspace without synchronizing it? It remains on this device and can be recovered later with the previous password.'))void run(archiveVaultAndStartFresh);}}>Set aside and start a new device workspace</button></details>
    {error&&<p className="fw-error" role="alert">{error}</p>}</section>;
  const online=navigator.onLine&&!!getAuthToken()&&tokenExpiry(getAuthToken())>Date.now();
  return <section className="fw-panel" aria-labelledby="fw-unlock"><h2 id="fw-unlock">Unlock device workspace</h2>
    <p>Offline fieldwork on this device is encrypted. Enter your password to open it{online?'':' (works without a connection within your offline authorization window)'}. Saved drafts, queued changes and photos are retained while locked.</p>
    <form onSubmit={e=>{e.preventDefault();void run(async()=>{
      if(online){await reauthenticate(password);}
      else{if(!profile?.email)throw new Error('Sign in from the login screen.');await unlockFieldwork(profile.email,password);}
    });}}><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
    <div className="fw-actions"><button className="primary" disabled={busy||!password}>Unlock</button></div></form>
    {error&&<p className="fw-error" role="alert">{error}</p>}</section>;
}

/** Shown while the API session is expired. Sync is paused; local work continues and is retained. */
function Reauthenticate({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  return <form className="fw-panel fw-reauth" onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void reauthenticate(password).then(()=>{setPassword('');onDone();}).catch((x:any)=>setError(x.message)).finally(()=>setBusy(false));}}>
    <h2>Session expired — synchronization paused</h2><p>All saved changes remain on this device. Sign in again to resume synchronization; you can keep working meanwhile.</p>
    <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
    <div className="fw-actions"><button className="primary" disabled={busy||!password}>Sign in and resume sync</button></div>
    {error&&<p className="fw-error" role="alert">{error}</p>}</form>;
}

function ArchivedWorkspaces({pending}:{pending:number}){
  const [items,setItems]=useState<ArchivedVault[]>([]);const [old,setOld]=useState('');const [current,setCurrent]=useState('');const [error,setError]=useState('');const [done,setDone]=useState('');
  useEffect(()=>{void archivedVaults().then(setItems).catch(()=>{});},[done]);
  if(!items.length)return null;
  return <section className="fw-panel"><h2>Set-aside device workspaces ({items.length})</h2><p>These were kept after a password change. They are not synchronized until recovered. Recovery requires the password that encrypted them and that the current workspace has no pending changes.</p>
    {items.map(a=><form key={a.key} onSubmit={e=>{e.preventDefault();setError('');void recoverArchivedVault(a.key,old,current,pending>0).then(()=>{setDone(a.key);setOld('');setCurrent('');}).catch((x:any)=>setError(x.message));}}>
      <h3>Set aside {new Date(a.archivedAt).toLocaleString()}</h3>
      <div className="fw-form-grid"><label>Password used for that workspace<input type="password" value={old} onChange={e=>setOld(e.target.value)} required/></label><label>Current password<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} required/></label></div>
      <button disabled={!old||!current}>Recover this workspace</button></form>)}
    {done&&<p role="status">Workspace recovered. Its pending work will synchronize normally.</p>}{error&&<p className="fw-error" role="alert">{error}</p>}</section>;
}

function FilePreview({file}:{file:Attachment}){
  const [url,setUrl]=useState('');const [error,setError]=useState('');
  useEffect(()=>{let alive=true;let objectUrl='';vaultBlob('file/'+file.id,file.mime).then(b=>{objectUrl=URL.createObjectURL(b);if(alive)setUrl(objectUrl);}).catch(e=>setError(e.message));return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[file.id,file.mime]);
  return <div className="fw-photo">{url&&file.mime.startsWith('image/')&&<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={file.name}/></a>}{url?<a href={url} target="_blank" rel="noreferrer">View {file.name}</a>:<span>{error||'Loading local file…'}</span>}</div>;
}
function OfflineMarkingCanvas({file,markers,equipment,onPlace}:{file:Attachment;markers:any[];equipment:any;onPlace:(x:number,y:number)=>void}){
  const [url,setUrl]=useState('');
  useEffect(()=>{let active=true;let objectUrl='';void vaultBlob('file/'+file.id,file.mime).then(blob=>{objectUrl=URL.createObjectURL(blob);if(active)setUrl(objectUrl);});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[file.id,file.mime]);
  if(!url)return <p>Loading downloaded image…</p>;
  return <div role="group" aria-label={`Mark equipment on ${file.name}`} onClick={event=>{const box=event.currentTarget.getBoundingClientRect();if(box.width&&box.height)onPlace(Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100)),Math.max(0,Math.min(100,(event.clientY-box.top)/box.height*100)));}}
    style={{position:'relative',width:'100%',cursor:'crosshair',touchAction:'manipulation',background:'#101820',borderRadius:8}}>
    <img src={url} alt={file.name} style={{display:'block',width:'100%',height:'auto',objectFit:'contain',margin:'0 auto'}} />
    {[...markers,equipment.isPlacedOnLayout&&equipment.layoutImageKey===file.layoutImageKey?equipment:null].filter(Boolean).map((pin:any,index:number)=><span key={pin.id||`pending-${index}`} title={pin.tagNumber} style={{position:'absolute',left:`${pin.xPercent}%`,top:`${pin.yPercent}%`,transform:'translate(-50%,-50%)',border:'2px solid #fff',borderRadius:20,minWidth:28,height:28,display:'grid',placeItems:'center',background:'#0891b2',color:'#fff',fontWeight:800,pointerEvents:'none'}}>{pin.markingNo??pin.sequenceNo??index+1}</span>)}
  </div>;
}
function Workspace({onClose}:{onClose:()=>void}){
  const [projects,setProjects]=useState<any[]>([]);const [saved,setSaved]=useState<Bundle[]>([]);const [queue,setQueue]=useState<Operation[]>([]);
  const [project,setProject]=useState<Bundle>();const [area,setArea]=useState('');const [equipment,setEquipment]=useState<any>();
  const [markingKey,setMarkingKey]=useState<string|null>(null);
  const [inspection,setInspection]=useState<InspectionDraft>();const [defect,setDefect]=useState<any>();const [files,setFiles]=useState<File[]>([]);
  const [notice,setNotice]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [view,setView]=useState<'projects'|'work'|'sync'>('projects');
  const [grade,setGrade]=useState('V');const [search,setSearch]=useState('');const [history,setHistory]=useState<any>();
  const dirty=useRef(false);const [localSaved,setLocalSaved]=useState('');const panel=useRef<HTMLDivElement>(null);
  const [recovered,setRecovered]=useState(false);
  const autosaves=useRef<Promise<void>>(Promise.resolve());
  const fileIds=useRef(new WeakMap<File,string>());
  const sessionId=fieldworkSession()?.id;
  useEffect(()=>{
    // Recover only once the device vault is unlocked (after refresh/restart the user unlocks first).
    if(!sessionId)return;
    let active=true;
    void (async()=>{
      const draft=await vaultGet<any>('workspace-draft');
      if(draft){
        const downloaded=await vaultGet<Bundle>('project/'+draft.projectId);
        if(downloaded?.state==='Ready'&&active){
          const restored=await Promise.all((draft.files||[]).map(async(f:Attachment)=>{
            const file=new File([await vaultBlob('file/'+f.id,f.mime)],f.name,{type:f.mime});fileIds.current.set(file,f.id);return file;
          }));
          if(active){setProject(downloaded);setArea(draft.area||'');setEquipment(draft.equipment);setInspection(draft.inspection);setDefect(draft.defect);setFiles(restored);setView('work');setLocalSaved('Recovered saved device draft');}
        }
      }
    })().catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setRecovered(true);});
    return()=>{active=false;};
  },[sessionId]);
  useEffect(()=>{
    if(!recovered||!project)return;
    const attachments=files.map(file=>{
      let id=fileIds.current.get(file);if(!id){id=stableId();fileIds.current.set(file,id);}
      return {id,name:file.name,mime:file.type,owner:equipment?.id||defect?.id||inspection?.id||project.id};
    });
    const snapshot={projectId:project.id,area,equipment,inspection,defect,files:attachments};
    const owner=fieldworkSession()?.id;
    setLocalSaved('Unsaved changes — saving on device…');
    // Serialize saves so slower encryption of an older draft cannot overwrite newer edits.
    autosaves.current=autosaves.current.catch(()=>{}).then(async()=>{
      if(!owner||fieldworkSession()?.id!==owner)throw new Error('Account changed. Draft save paused to protect your data.');
      await vaultSave([{id:'workspace-draft',type:'workspace-draft',value:snapshot}],files.map((blob,i)=>({id:'file/'+attachments[i].id,blob})));
      setLocalSaved('Saved locally');
    }).catch(e=>setError(e.message));
  },[recovered,project?.id,area,equipment,inspection,defect,files]);
  const refresh=async()=>{if(!fieldworkSession())return;const [p,q]=await Promise.all([bundles(),operations()]);setSaved(p);setQueue(q);setProject(current=>current?p.find(b=>b.id===current.id)||current:undefined);};
  useEffect(()=>{if(sessionId){setError('');void refresh().catch(e=>setError(e.message));}},[sessionId]);
  useEffect(()=>{panel.current?.focus();void refresh().catch(e=>setError(e.message));api.get('/surveyor/projects').then(r=>setProjects(r.data)).catch(()=>{});return onFieldworkChange(()=>{void refresh().catch(()=>{});});},[]);
  useEffect(()=>{if(!inspection||!dirty.current)return;const draft=inspection;const timer=setTimeout(()=>{vaultSave([{id:'draft/'+draft.id,type:'draft',value:draft}]).then(()=>{dirty.current=false;setLocalSaved('Draft saved on device');}).catch(e=>setError(e.message));},300);return()=>clearTimeout(timer);},[inspection]);
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch(e:any){setError(e.message||'Please retry. Your saved device data is retained.');}finally{setBusy(false);}};
  async function leave(){if(inspection&&dirty.current){await vaultSave([{id:'draft/'+inspection.id,type:'draft',value:inspection}]);dirty.current=false;}onClose();}
  const closeEditor=async()=>{if(inspection&&dirty.current){await vaultSave([{id:'draft/'+inspection.id,type:'draft',value:inspection}]);dirty.current=false;}setInspection(undefined);setEquipment(undefined);setDefect(undefined);setFiles([]);setHistory(undefined);};
  async function openInspection(e:any,existing?:any){
    const date=existing?.startedAt?.slice(0,10)||localDate();const id=`${e.id}/${date}`;
    const cached=await vaultGet<InspectionDraft>('draft/'+id);
    if(cached){setInspection(cached);return;}
    const a=existing?project!.activities[existing.id]:Object.values(project!.activities).find((a:any)=>a.grade==null&&project!.histories[e.id]?.some(h=>h.id===a.id)&&a.startedAt?.slice(0,10)===date);
    if(a&&!['Draft','ChangesRequested'].includes(a.reviewStatus)){setHistory(a);return;}
    const points=a?a.checkpoints.map((p:any)=>({code:p.questionCode,text:p.questionText,section:p.sectionCode,itemNumber:Number(p.questionCode.split('/')[1]),protectionApplicability:p.applicabilityCode})):project!.points[e.id]||project!.template;
    const answers:InspectionDraft['answers']={};
    for(const p of a?.checkpoints||[]){const r=a.responses.find((r:any)=>r.checkpointDefinitionSnapshotId===p.id);if(r)answers[p.questionCode]={grades:r.gradeResultsJson?JSON.parse(r.gradeResultsJson):{},remarks:r.observation||'',comment:r.inspectionComment||''};}
    setInspection({id,projectId:project!.id,equipmentId:e.id,date,activityId:a?.id,rowVersion:a?.rowVersion,points,answers,comments:a?.equipmentComments||'',hold:a?.isOnHold||false,submit:false,photos:[]});setLocalSaved('');
  }
  /** Queue the equipment-specific checklist only when it differs from the device copy. Returns whether it was queued. */
  async function queueChecklist(){
    if(!project||!inspection)return false;
    const saved=project.points[inspection.equipmentId]||project.template;
    if(sameChecklist(saved,inspection.points))return false;
    await queueChange('checklist',project.id,inspection.equipmentId,{points:inspection.points,version:project.checklistVersions?.[inspection.equipmentId]??0});
    return true;
  }
  function updateInspection(next:InspectionDraft){dirty.current=true;setInspection(next);setLocalSaved('Saving draft on device…');}
  async function capture(list:FileList|null){
    if(!list||!inspection)return;const photos=Array.from(list);
    if(photos.some(f=>!['image/jpeg','image/png','application/pdf'].includes(f.type)||f.size>10*1024*1024))throw new Error('Choose JPG, JPEG, PNG or PDF files up to 10 MB each.');
    const added=photos.map(f=>({id:stableId(),name:f.name,mime:f.type,owner:inspection.id}));
    const next={...inspection,photos:[...inspection.photos,...added]};
    await vaultSave([{id:'draft/'+next.id,type:'draft',value:next}],photos.map((blob,i)=>({id:'file/'+added[i].id,blob})));setInspection(next);setLocalSaved('Photos and draft saved on device');
  }
  const pending=queue.filter(o=>o.status!=='Synced');
  const markingFiles=equipment&&project?project.files.filter(file=>!!file.layoutImageKey&&file.mime.startsWith('image/')&&(file.owner===project.id||file.owner===equipment.areaId)):[];
  const markingFile=markingFiles.find(file=>file.layoutImageKey===markingKey);
  const areaDefaultLayout=(areaId:string)=>project?.areas.find((item:any)=>(item.areaId||item.id)===areaId)?.layoutImagePath;
  const savedMarkers=markingFile?project!.equipment.filter(item=>item.id!==equipment?.id&&item.isPlacedOnLayout!==false&&
    (item.layoutImageKey===markingFile.layoutImageKey||(!item.layoutImageKey&&item.areaId===markingFile.owner&&markingFile.url===areaDefaultLayout(item.areaId)))):[];
  return <div className="fw-root" role="dialog" aria-modal="true" aria-label="Offline fieldwork" tabIndex={-1} ref={panel}>
    <header className="fw-header"><div><small>EX-SURVEY • FIELD OPERATIONS</small><h1>Fieldwork & Sync</h1></div><button onClick={()=>void run(leave)}>Back to workspace</button></header>
    <nav className="fw-tabs" aria-label="Fieldwork navigation"><button aria-pressed={view==='projects'} onClick={()=>setView('projects')}>Downloaded projects</button><button aria-pressed={view==='work'} disabled={!project} onClick={()=>setView('work')}>Fieldwork</button><button aria-pressed={view==='sync'} onClick={()=>setView('sync')}>Sync Center ({pending.length})</button><button className="primary" disabled={busy||syncState.running} onClick={()=>void run(async()=>{await syncNow(true);setNotice(syncState.message);})}>↻ Sync Now</button></nav>
    <div className="fw-message" role="status">{syncState.running?`Syncing ${syncState.done} of ${syncState.total}`:navigator.onLine?syncState.message||`${pending.length} pending change${pending.length===1?'':'s'}`:'Offline'} {notice!==syncState.message&&notice} {localSaved}</div>
    {error&&<div className="fw-error" role="alert">{error}</div>}
    {fieldworkSession()&&syncState.authRequired&&<Reauthenticate onDone={()=>void syncNow(true).then(()=>setNotice(syncState.message)).catch(()=>{})}/>}
    {!fieldworkSession()?<VaultAccess/>:<>
    {view==='projects'&&<><section className="fw-panel"><h2>Download assigned work</h2><p>Download while online, then open Fieldwork here to work without a connection. Downloads include the current checklist, history, layouts and evidence. Updates require connectivity.</p><p>Keep this device’s browser data. Clearing it or losing the device can remove unsynchronized work. Offline access expires with your authorized session.</p></section>
    {[...projects,...saved.filter(s=>!projects.some(p=>p.projectId===s.id)).map(s=>({projectId:s.id,projectName:s.name}))].map(p=>{const b=saved.find(s=>s.id===p.projectId);return <section className="fw-panel" key={p.projectId}><h2>{projectDisplay(p.projectName)}</h2><p>{b?.state==='Ready'?`Available Offline · downloaded ${new Date(b.downloadedAt).toLocaleString()}`:b?.state==='Failed'?`Download Failed: ${b.error}`:'Not Downloaded'}</p><div className="fw-actions"><button disabled={busy} onClick={()=>void run(async()=>{const downloaded=await downloadProject(p.projectId,setNotice);setProject(downloaded);setArea('');})}>{b?.state==='Ready'?'Update offline copy':'Download for Offline Use'}</button>{b?.state==='Ready'&&<button className="primary" onClick={()=>{setProject(b);setArea('');setView('work');}}>Open offline fieldwork</button>}</div></section>;})}
    {!projects.length&&!saved.length&&<section className="fw-panel">No downloaded projects. Connect to load your assigned projects.</section>}</>}
    {view==='work'&&project&&<>
      <section className="fw-panel"><h2>{projectDisplay(project.name)}</h2><p>{projectDisplay(project.project.jobNo)} · {projectDisplay(project.project.location)}</p><label>Area<select value={area} onChange={e=>{setArea(e.target.value);void closeEditor();}}><option value="">All areas</option>{project.areas.map(a=><option key={a.areaId||a.id} value={a.areaId||a.id}>{projectDisplay(a.areaName)}</option>)}</select></label>
      <div className="fw-actions"><button disabled={!area} onClick={()=>{setEquipment({id:stableId(),areaId:area,tagNumber:'',type:'',isNew:true});setMarkingKey(null);setFiles([]);}}>+ Add Equipment</button><label className="fw-search">Find equipment<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Item tag, Ex-Tag, RFID or description"/></label></div></section>
      {!equipment&&!inspection&&!defect&&!history&&<>{project.equipment.filter(e=>(!area||e.areaId===area)&&`${e.tagNumber} ${e.equipmentId} ${e.rfidTagUid} ${e.description}`.toLowerCase().includes(search.toLowerCase())).map(e=><section className="fw-panel" key={e.id}><h3>{e.markingNo??e.sequenceNo??'Pending marking'} · {e.tagNumber}</h3><p>{e.equipmentId} · {e.type} · {e.description}</p><p>RFID: {e.rfidTagUid||'—'} · Zone: {e.hazardousAreaZone||'—'} {e.localPending?' · Saved on Device – Pending Sync':''}</p><div className="fw-actions"><button onClick={()=>{setEquipment({...e});setMarkingKey(e.layoutImageKey||project.files.find(f=>f.owner===e.areaId&&f.url===areaDefaultLayout(e.areaId))?.layoutImageKey||null);setFiles([]);}}>View / Edit Equipment</button><button className="primary" onClick={()=>void run(()=>openInspection(e))}>Inspection Checklist</button><button onClick={()=>{setDefect({id:stableId(),equipmentId:e.id,date:localDate(),grade:'Visual',faultCategory:'',observation:'',recommendation:'',remarks:''});setFiles([]);}}>+ Defect Draft</button></div><details><summary>Inspection history ({project.histories[e.id]?.length||0})</summary>{project.histories[e.id]?.map(h=><button key={h.id} onClick={()=>setHistory(project.activities[h.id])}>{new Date(h.startedAt).toLocaleDateString()} · {h.grade||'D/C/V'} · {h.reviewStatus}</button>)}</details></section>)}
      <section className="fw-panel"><h2>Layouts and supporting files</h2><div className="fw-gallery">{project.files.filter(f=>f.owner===project.id||f.owner===area).map(f=><FilePreview key={f.id} file={f}/>)}</div></section>
      <section className="fw-panel"><h2>Defects ({project.defects.length})</h2>{project.defects.map(d=><details key={d.id}><summary>{d.observation||d.description} · {d.status||'Local draft'}</summary><p>{d.recommendation}</p><p>{d.remarks}</p>{d.canEdit&&<button onClick={()=>setDefect({...d,date:d.registerDate,grade:d.grade})}>Edit defect draft</button>}</details>)}</section></>}
      {equipment&&<form className="fw-panel" onSubmit={e=>{e.preventDefault();void run(async()=>{if(!equipment.tagNumber?.trim()||!equipment.type?.trim())throw new Error('Item Tag and Equipment Type are required.');await queueChange('equipment',project.id,equipment.id,equipment,project.versions.equipment[equipment.id],files);setEquipment(undefined);setFiles([]);setNotice('Saved on Device – Pending Sync');});}}><h2>{equipment.isNew?'Add':'Edit'} Equipment</h2><p>Register Sl. No: {equipment.sequenceNo??'Assigned by the server during sync'}</p>
      <section className="fw-panel" aria-label="Inspection marking"><h3>Select image for marking</h3><p>Only images saved in this offline download can be marked. Connect and update the offline project to include images uploaded later.</p><div className="fw-actions">{markingFiles.map(file=><button key={file.layoutImageKey} type="button" aria-pressed={markingKey===file.layoutImageKey} onClick={()=>setMarkingKey(file.layoutImageKey||null)}>{file.name} · {file.owner===project.id?'GA / Project Layout':/machinery|machine/i.test(file.name)?'Machinery Layout':'Area Image'}{file.uploadedAt?` · ${new Date(file.uploadedAt).toLocaleDateString()}`:''}</button>)}</div>{markingFile?<><p>Tap or click the image to set this equipment marker. Existing pins stay on their saved image.</p><OfflineMarkingCanvas file={markingFile} markers={savedMarkers} equipment={{...equipment,layoutImageKey:markingKey}} onPlace={(xPercent,yPercent)=>setEquipment({...equipment,xPercent:Number(xPercent.toFixed(2)),yPercent:Number(yPercent.toFixed(2)),layoutImageKey:markingKey,isPlacedOnLayout:true})}/></>:<p>No downloaded image is selected. This equipment can still be saved without a layout marker.</p>}</section>
      <div className="fw-form-grid">{equipmentFields.map(([key,label])=><label key={key}>{label}<input required={['tagNumber','type'].includes(key)} value={equipment[key]??''} onChange={e=>setEquipment({...equipment,[key]:e.target.value})}/></label>)}</div><label>RFID type<select value={equipment.rfidIdentificationMethod||'HF_RFID'} onChange={e=>setEquipment({...equipment,rfidIdentificationMethod:e.target.value})}><option>HF_RFID</option><option>NFC</option></select></label><label>Equipment evidence<input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><SelectedFiles files={files}/><div className="fw-gallery">{project.files.filter(f=>f.owner===equipment.id).map(f=><FilePreview key={f.id} file={f}/>)}</div><div className="fw-actions"><button disabled={busy} type="submit" className="primary">Save on device</button><button type="button" onClick={()=>void closeEditor()}>Cancel</button></div></form>}
      {inspection&&<section className="fw-panel"><h2>Inspection Checklist</h2><p>{inspection.date} · {localSaved}</p><p>{Object.values(inspection.answers).reduce((n,a)=>n+Object.values(a.grades).filter(v=>v==='Pass'||v==='Fail').length,0)} answered · unanswered checkpoints are Blank</p><div className="fw-actions" role="group" aria-label="Inspection grade">{['D','C','V'].map(g=><button key={g} aria-pressed={grade===g} onClick={()=>setGrade(g)}>{g==='D'?'Detailed':g==='C'?'Close':'Visual'}</button>)}</div>
      {['Apparatus','Installation','Environment','Unclassified'].map(section=>{const points=inspection.points.filter(p=>(p.section||'Unclassified')===section);return points.length?<div key={section}><h3>{section}</h3>{points.map(p=>{const answer=inspection.answers[p.code]||{grades:{},remarks:''};const update=(next:any)=>updateInspection({...inspection,answers:{...inspection.answers,[p.code]:next}});const updatePoint=(change:Partial<typeof p>)=>updateInspection({...inspection,points:inspection.points.map(row=>row.code===p.code?{...row,...change}:row)});return <article className="fw-checkpoint" key={p.code}><strong>{p.itemNumber}</strong><label>Items to Be Checked<textarea value={p.text} onChange={e=>updatePoint({text:e.target.value})}/></label><label>Checkpoint Category<select value={p.protectionApplicability} onChange={e=>updatePoint({protectionApplicability:e.target.value})}>{(project.catalog?.categories||[]).map((category:any)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="fw-actions" role="group" aria-label={`${p.code} ${grade} result`}>{[['Pass','P — Pass'],['Fail','F — Fail'],['','Blank']].map(([value,label])=><button key={label} aria-pressed={(answer.grades[grade]||'')===value} onClick={()=>update({...answer,grades:{...answer.grades,[grade]:value||null}})}>{label}</button>)}</div><label>Remarks<textarea value={answer.remarks} onChange={e=>update({...answer,remarks:e.target.value})}/></label></article>;})}</div>:null;})}
      <label>Overall comments<textarea value={inspection.comments} onChange={e=>updateInspection({...inspection,comments:e.target.value})}/></label><label>Inspection status<select value={inspection.hold?'Hold':'Ongoing'} onChange={e=>updateInspection({...inspection,hold:e.target.value==='Hold'})}><option>Ongoing</option><option>Hold</option></select></label><label>Photographs / evidence<input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={e=>void run(()=>capture(e.target.files))}/></label><label>Take a photograph<input type="file" accept="image/*" capture="environment" onChange={e=>void run(()=>capture(e.target.files))}/></label><div className="fw-gallery">{inspection.photos.map(f=><div key={f.id}><FilePreview file={f}/><button onClick={()=>updateInspection({...inspection,photos:inspection.photos.filter(p=>p.id!==f.id)})}>Remove from draft</button></div>)}</div><div className="fw-actions fw-sticky"><button disabled={busy} onClick={()=>void run(async()=>{setNotice(await queueChecklist()?'Equipment checklist changes saved on device – Pending Sync':'No checklist changes to save');})}>Save Checklist Changes</button><button disabled={busy} className="primary" onClick={()=>void run(async()=>{await queueChecklist();await queueChange('inspection',project.id,inspection.id,{...inspection,submit:false});dirty.current=false;setNotice('Saved on Device – Pending Sync');})}>Save Draft</button><button disabled={busy||inspection.hold} onClick={()=>{if(window.confirm('Queue this inspection for submission? The server will validate it before QC review.'))void run(async()=>{await queueChecklist();await queueChange('inspection',project.id,inspection.id,{...inspection,submit:true});dirty.current=false;setNotice('Submission saved on device. Awaiting server validation.');});}}>Submit Inspection</button><button onClick={()=>void run(closeEditor)}>Back</button></div></section>}
      {defect&&<form className="fw-panel" onSubmit={e=>{e.preventDefault();void run(async()=>{if(files.length>2)throw new Error('The existing defect register supports two photographs per defect.');await queueChange('defect',project.id,defect.id,defect,project.versions.defects[defect.id],files);setDefect(undefined);setFiles([]);setNotice('Defect saved on device – Pending Sync');});}}><h2>Defect draft</h2><label>Date<input type="date" required value={defect.date||''} onChange={e=>setDefect({...defect,date:e.target.value})}/></label><label>Inspection grade<select value={defect.grade} onChange={e=>setDefect({...defect,grade:e.target.value})}>{['Visual','Close','Detailed'].map(g=><option key={g}>{g}</option>)}</select></label><label>Fault Category<select value={defect.faultCategory||''} onChange={e=>setDefect({...defect,faultCategory:e.target.value})}><option value="">Not specified</option>{['A','B','C'].map(g=><option key={g}>{g}</option>)}</select></label>{['faultCode','observation','recommendation','remarks'].map(k=><label key={k}>{k}<textarea required={k==='observation'} value={defect[k]||''} onChange={e=>setDefect({...defect,[k]:e.target.value})}/></label>)}<label>Evidence (up to two files)<input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><SelectedFiles files={files}/><div className="fw-actions"><button disabled={busy} className="primary">Save defect on device</button><button type="button" onClick={()=>void closeEditor()}>Cancel</button></div></form>}
      {history&&<section className="fw-panel"><h2>Saved inspection · {history.reviewStatus}</h2><p>{history.startedAt} · {history.grade||'D/C/V'}</p>{history.checkpoints?.map((p:any)=>{const r=history.responses?.find((r:any)=>r.checkpointDefinitionSnapshotId===p.id);return <article className="fw-checkpoint" key={p.id}><strong>{p.questionText}</strong><p>{r?.gradeResultsJson||r?.responseCode||'Blank'}</p><p>{r?.observation}</p></article>;})}<div className="fw-gallery">{project.files.filter(f=>f.owner===history.id).map(f=><FilePreview key={f.id} file={f}/>)}</div><button onClick={()=>setHistory(undefined)}>Back</button></section>}
    </>}
    {view==='sync'&&<><section className="fw-panel"><h2>Sync Center</h2><p>{navigator.onLine?'Network available — API and session checked before sync':'Offline'} · Last successful sync: {syncState.lastSuccess||'Not yet in this session'}</p><div className="fw-form-grid">{['equipment','checklist','inspection','defect'].map(k=><div key={k}>{k}: {pending.filter(o=>o.kind===k).length} pending</div>)}<div>Photographs: {pending.reduce((n,o)=>n+(o.payload.photos?.length||0),0)} pending</div></div><p>Keep the app open during synchronization. If your browser is suspended or closed, synchronization resumes when you next open and unlock it.</p></section>{pending.map(o=><section className="fw-panel" key={o.id}><h3>{o.kind} · {o.status}</h3><p>{o.error||'Waiting to synchronize'}</p><p>{o.createdAt} · Attempts: {o.attempts}</p>{o.status==='Conflict'&&<><FieldworkConflict operation={o}/><p>Local work is preserved. Compare the versions below. Refreshing the project is blocked until this work is resolved.</p><details><summary>Your saved changes</summary><pre>{JSON.stringify(o.payload,null,2)}</pre></details><details><summary>Server values</summary><pre>{JSON.stringify(o.server,null,2)}</pre></details></>}<button disabled={busy||o.status==='Conflict'||o.status==='Blocked'} onClick={()=>void run(async()=>{await syncNow(true);})}>Retry synchronization</button></section>)}{!pending.length&&<section className="fw-panel">All saved changes have server confirmation.</section>}<ArchivedWorkspaces pending={pending.length}/></>}
    </>}
  </div>;
}
function SelectedFiles({files}:{files:File[]}){
  const [urls,setUrls]=useState<string[]>([]);useEffect(()=>{const next=files.map(f=>URL.createObjectURL(f));setUrls(next);return()=>next.forEach(u=>URL.revokeObjectURL(u));},[files]);
  return <div className="fw-gallery">{files.map((f,i)=><a key={i} href={urls[i]} target="_blank" rel="noreferrer">{f.type.startsWith('image/')&&<img alt={f.name} src={urls[i]}/>}View {f.name}</a>)}</div>;
}
