import type {ClientProject} from '../api/clientDashboard';

export type ClientDefectRow = {id:string;source:'legacy'|'activity';projectId:string;projectName:string;area:string;action:string;date:string;item:string;tag:string;description:string;category:string;code:string;observation:string;recommendation:string;status:string;closed:boolean;inProgress:boolean;overdue:boolean;raw:any};
export function clientDefectRows(projects:ClientProject[], legacy:any[], activities:any[], now=Date.now()):ClientDefectRow[] {
  const allowed = new Map(projects.map(p=>[p.projectId,p.projectName]));
  const rows = new Map<string,ClientDefectRow>();
  for (const [source,items] of [['legacy',legacy],['activity',activities]] as const) for (const r of items) {
    if (!r.id || !allowed.has(r.projectId)) continue;
    const status = String(source === 'activity' ? r.actionStatus || r.statusCode || '' : r.status || '');
    const closed = source === 'activity' ? status === 'ClientClosed' : ['Closed','Verified'].includes(status);
    const inProgress = source === 'activity' ? ['Assigned','InProgress','SubmittedForVerification','Verified'].includes(status) : status === 'RectificationSubmitted';
    const due = r.dueAt || r.inspectionDueDate;
    rows.set(r.id,{id:r.id,source,projectId:r.projectId,projectName:allowed.get(r.projectId)!,area:r.areaName || '',action:r.actionReference || r.actionNumber || r.id,
      date:r.registerDate || r.inspectionDate || r.reportedAt || '',item:r.itemNumber || r.equipmentCode || '',tag:r.equipmentTag || r.tagNumber || '',
      description:r.equipmentDescription || r.equipmentName || r.type || '',category:r.faultCategory || '',code:r.faultCode || '',observation:r.observation || '',
      recommendation:r.recommendation || r.proposedAction || '',status,closed,inProgress,overdue:!closed && (r.isOverdue === true || !!due && Number.isFinite(Date.parse(due)) && Date.parse(due)<now),raw:r});
  }
  return [...rows.values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0) || a.id.localeCompare(b.id));
}
