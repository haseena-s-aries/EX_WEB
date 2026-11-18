/** Pure conflict-comparison rules for browser fieldwork. No storage or network access here. */
export type ChecklistPoint = {code:string;section:string;itemNumber:number;text:string;protectionApplicability:string};
export type ConflictKind = 'equipment'|'inspection'|'defect'|'checklist'|'photo';
export type Choice = 'local'|'server';
export type ConflictField = {key:string;label:string;local:unknown;server:unknown};

/** Fields the server controls or that are not user-editable never take part in a field choice. */
const PROTECTED = ['id','projectId','areaId','clientEquipmentId','photos','previousOperationId','sequenceNo','markingNo','registrationStatus','status',
  'createdByUserId','updatedByUserId','createdAt','updatedAt','rowVersion','localPending','isNew','version'];
const same = (a:unknown,b:unknown) => JSON.stringify(a??null)===JSON.stringify(b??null);
const pointKey = (code:string) => 'checkpoint:'+code;
const pointView = (p?:ChecklistPoint) => p ? {included:true,text:p.text,category:p.protectionApplicability} : {included:false};

/** Every field whose local and server values differ and therefore needs an explicit choice. */
export function conflictFields(kind:ConflictKind,local:any,server:any):ConflictField[] {
  if(kind==='checklist') {
    const mine=new Map<string,ChecklistPoint>((local?.points||[]).map((p:ChecklistPoint)=>[p.code,p]));
    const theirs=new Map<string,ChecklistPoint>((server?.points||[]).map((p:ChecklistPoint)=>[p.code,p]));
    const codes=[...new Set([...mine.keys(),...theirs.keys()])];
    return codes.map(code=>({key:pointKey(code),label:`Checkpoint ${code}`,local:pointView(mine.get(code)),server:pointView(theirs.get(code))}))
      .filter(f=>!same(f.local,f.server));
  }
  const keys=kind==='inspection'?['answers','comments','hold']
    // Only fields the server record actually stores can conflict; display-only keys merged into the
    // device copy (area names, counts, etc.) are not persisted by the save and are ignored.
    :Object.keys(local||{}).filter(k=>!PROTECTED.includes(k)&&!(kind==='defect'&&k==='equipmentId')&&!!server&&Object.prototype.hasOwnProperty.call(server,k));
  return keys.map(key=>({key,label:key,local:local?.[key]??null,server:server?.[key]??null})).filter(f=>!same(f.local,f.server));
}

/**
 * Build the payload to resubmit. Throws if any differing field lacks a choice, so nothing is silently
 * overwritten. Checklist points keep the local order, then any server-only checkpoints the user kept.
 */
export function applyConflictChoices(kind:ConflictKind,local:any,server:any,choices:Record<string,Choice>) {
  const fields=conflictFields(kind,local,server);
  const missing=fields.filter(f=>!choices[f.key]);
  if(missing.length)throw new Error(`Choose local or server values for ${missing.map(f=>f.label).join(', ')}.`);
  if(kind==='checklist') {
    const theirs=new Map<string,ChecklistPoint>((server?.points||[]).map((p:ChecklistPoint)=>[p.code,p]));
    const mine=new Map<string,ChecklistPoint>((local?.points||[]).map((p:ChecklistPoint)=>[p.code,p]));
    // An explicit choice takes exactly that side, including "not on the checklist"; unchanged points are identical on both.
    const pick=(code:string)=>{const c=choices[pointKey(code)];return c==='server'?theirs.get(code):c==='local'?mine.get(code):mine.get(code)??theirs.get(code);};
    const order=[...mine.keys(),...[...theirs.keys()].filter(c=>!mine.has(c))];
    const points=order.map(pick).filter(Boolean) as ChecklistPoint[];
    if(!points.length)throw new Error('A checklist needs at least one checkpoint. Keep at least one checkpoint.');
    return {...local,points};
  }
  const next={...local};
  for(const f of fields)if(choices[f.key]==='server')next[f.key]=server?.[f.key]??null;
  return next;
}

/** True when a proposed checklist is identical to the saved device copy (no new version needed). */
export function sameChecklist(a:ChecklistPoint[]=[],b:ChecklistPoint[]=[]) {
  const norm=(p:ChecklistPoint[])=>p.map(x=>[x.code,x.text,x.protectionApplicability]);
  return same(norm(a),norm(b));
}
