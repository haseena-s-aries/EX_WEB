import React,{useState} from 'react';
import {loadConflict,Operation,resolveConflict} from '../offline/fieldwork';
import {Choice,conflictFields} from '../offline/fieldworkConflicts';

const show=(value:unknown)=>{
  if(value&&typeof value==='object'&&'included' in (value as any)){
    const v=value as any;return v.included?`${v.text}\nCategory: ${v.category}`:'Not included on this checklist';
  }
  return JSON.stringify(value??null,null,2);
};

/** Field-by-field (checkpoint-by-checkpoint for checklists) resolution. Nothing is applied until every difference has a choice. */
export default function FieldworkConflict({operation}:{operation:Operation}){
  const [review,setReview]=useState<Awaited<ReturnType<typeof loadConflict>>>();
  const [choices,setChoices]=useState<Record<string,Choice>>({});
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const fields=review?conflictFields(operation.kind,operation.payload,review.server):[];
  const chooseAll=(choice:Choice)=>setChoices(Object.fromEntries(fields.map(f=>[f.key,f.serverOnly?'server':choice])));
  return <div className="fw-conflict">
    <button disabled={busy} onClick={()=>void run(async()=>{setReview(await loadConflict(operation));setChoices({});})}>{review?'Reload current server version':'Load current versions to resolve'}</button>
    {error&&<p role="alert" className="fw-error">{error}</p>}
    {review&&<>
      <p>Server version {review.version}. {fields.length} difference{fields.length===1?'':'s'} to review.{operation.kind==='checklist'?' Checklist choices apply per checkpoint.':''}</p>
      {fields.length>1&&<div className="fw-actions"><button type="button" onClick={()=>chooseAll('local')}>Keep all local</button><button type="button" onClick={()=>chooseAll('server')}>Use all server</button></div>}
      {fields.map(f=><fieldset key={f.key} className="fw-choice"><legend>{f.label}</legend>{f.note&&<p className="fw-note">{f.note}</p>}<div className="fw-form-grid">
        {f.serverOnly?<div className="fw-radio"><span>Your device</span><pre>{show(f.local)}</pre></div>:
        <label className="fw-radio"><span><input type="radio" name={operation.id+f.key} checked={choices[f.key]==='local'} onChange={()=>setChoices({...choices,[f.key]:'local'})}/> Keep local</span><pre>{show(f.local)}</pre></label>}
        <label className="fw-radio"><span><input type="radio" name={operation.id+f.key} checked={choices[f.key]==='server'} onChange={()=>setChoices({...choices,[f.key]:'server'})}/> {f.serverOnly?'Accept server':'Use server'}</span><pre>{show(f.server)}</pre></label>
      </div></fieldset>)}
      <button className="primary" disabled={busy} onClick={()=>void run(async()=>{await resolveConflict(operation.id,review,choices);setReview(undefined);})}>Save resolution for synchronization</button>
    </>}
  </div>;
}
