import React,{useState} from 'react';
import {loadConflict,Operation,resolveConflict} from '../offline/fieldwork';
export default function FieldworkConflict({operation}:{operation:Operation}){
  const [review,setReview]=useState<Awaited<ReturnType<typeof loadConflict>>>();
  const [choices,setChoices]=useState<Record<string,'local'|'server'>>({});
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const keys=operation.kind==='inspection'?['answers','comments','hold']:Object.keys(operation.payload).filter(k=>!['id','projectId','areaId','clientEquipmentId','photos','previousOperationId','sequenceNo','registrationStatus','status','createdByUserId',...(operation.kind==='defect'?['equipmentId']:[])].includes(k));
  return <div><button disabled={busy} onClick={()=>void run(async()=>{setReview(await loadConflict(operation));setChoices({});})}>Load current versions to resolve</button>{error&&<p role="alert">{error}</p>}{review&&<>{keys.filter(k=>JSON.stringify(operation.payload[k]??null)!==JSON.stringify(review.server[k]??null)).map(k=><fieldset key={k}><legend>{k}</legend><div className="fw-form-grid"><label><input type="radio" name={operation.id+k} checked={choices[k]==='local'} onChange={()=>setChoices({...choices,[k]:'local'})}/>Keep local<pre>{JSON.stringify(operation.payload[k]??null,null,2)}</pre></label><label><input type="radio" name={operation.id+k} checked={choices[k]==='server'} onChange={()=>setChoices({...choices,[k]:'server'})}/>Use server<pre>{JSON.stringify(review.server[k]??null,null,2)}</pre></label></div></fieldset>)}<button disabled={busy} onClick={()=>void run(async()=>{await resolveConflict(operation.id,review,choices);setReview(undefined);})}>Save resolution for synchronization</button></>}</div>;
}
