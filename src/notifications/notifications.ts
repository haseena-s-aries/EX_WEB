import apiClient from '../api/client';
import {getAccessNotices} from '../api/userAccess';
import {getClientNotifications} from '../api/clientDashboard';
import {
  getAssignmentOptions,
  getProjectDelayAlerts,
  getProject,
  getProjects,
  getQcProjects,
  getSurveyorDashboard,
  getSurveyorProjects,
} from '../api/projects';

export type NotificationType =
  | 'submitted'
  | 'assigned'
  | 'overdue'
  | 'users'
  | 'approved'
  | 'hold'
  | 'notStarted'
  | 'comments';

export type NotificationTarget =
  | {kind: 'qcProject'; projectId: string; summary?: any}
  | {kind: 'project'; projectId: string}
  | {kind: 'surveyorProject'; projectId: string}
  | {kind: 'surveyorEquipment'; projectId: string; areaId: string; equipmentId: string}
  | {kind: 'inspectionActivity'; activityId: string}
  | {kind: 'clientProject'; projectId: string}
  | {kind: 'users'; userId?:string; roleRequestId?:string};

export type AppNotification = {
  id: string; // stable id: the read/unread state is stored against it
  type: NotificationType;
  title: string;
  message: string;
  time?: string | null;
  serverId?:string;
  readAt?:string;
  target?: NotificationTarget;
};

const norm = (value: unknown) => String(value ?? '').replace(/[\s_-]+/g, '').toLowerCase();
const first = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null && obj[key] !== '') return obj[key];
  return undefined;
};
const shortDate = (value: any) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, {day: '2-digit', month: 'short', year: 'numeric'});
};
const timeValue = (value?: string | null) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};
const newestFirst = (items: AppNotification[]) =>
  items
    .map((item, index) => ({item, index}))
    .sort((a, b) => timeValue(b.item.time) - timeValue(a.item.time) || a.index - b.index)
    .map(entry => entry.item);

// ---------------------------------------------------------------- QC
async function buildQcNotifications(): Promise<AppNotification[]> {
  const projects: any[] = (await getQcProjects()).data || [];
  const now = Date.now();
  const list: AppNotification[] = [];
  for (const project of projects) {
    const projectId = String(project.projectId);
    const name = project.projectName || project.jobNo || 'Project';
    const status = norm(project.qcReviewStatus);
    const approved = status === 'approved';
    const target = {kind: 'qcProject', projectId, summary: project} as const;

    // 2. new project assigned to this QC
    list.push({
      id: `qc-assigned:${projectId}`,
      type: 'assigned',
      title: 'New project assigned to you',
      message: `${name}${project.jobNo ? ` (${project.jobNo})` : ''}${project.location ? ` · ${project.location}` : ''}`,
      target,
    });

    // 1. surveyor finished the survey / submitted to QC
    if (project.submissionDate && (status === 'pendingreview' || status === 'inreview')) {
      list.push({
        id: `qc-submitted:${projectId}:${project.submissionDate}`,
        type: 'submitted',
        title: 'Survey completed',
        message: `${project.surveyorName || 'The surveyor'} completed the survey for ${name}. It is ready for your review.`,
        time: project.submissionDate,
        target,
      });
    }

    // 3. overdue
    if (project.dueDate && !approved && timeValue(project.dueDate) && timeValue(project.dueDate) < now) {
      list.push({
        id: `qc-overdue:${projectId}:${project.dueDate}`,
        type: 'overdue',
        title: 'Project overdue',
        message: `${name} was due on ${shortDate(project.dueDate)} and is not approved yet.`,
        time: project.dueDate,
        target,
      });
    }
  }
  return newestFirst(list);
}

// ---------------------------------------------------------------- Admin / Manager
async function buildManagerNotifications(): Promise<AppNotification[]> {
  const [projectsResult, optionsResult, delaysResult] = await Promise.allSettled([getProjects(), getAssignmentOptions(), getProjectDelayAlerts()]);
  const list: AppNotification[] = [];

  if (delaysResult.status === 'fulfilled') {
    for (const alert of delaysResult.value.data) {
      list.push({
        id: `project-delay:${alert.id}`, type: 'overdue', title: `Project Delay Alert – ${alert.projectName}`,
        message: [alert.jobNo, alert.kind === 'Overdue' ? 'Overdue' : 'Delay reported', alert.surveyorName,
          `Target ${alert.targetDate}`, alert.expectedWorkEndDate && `Expected ${alert.expectedWorkEndDate}`,
          `${alert.delayDays} calendar days delayed`, alert.delayReason || 'Awaiting Surveyor reason',
          `Email: ${alert.emailStatus === 'Accepted' ? 'Accepted by SMTP' : alert.emailStatus === 'Sending' ? 'Awaiting confirmation' : alert.emailStatus}`]
          .filter(Boolean).join(' · '),
        time: alert.occurredAt, target: {kind: 'project', projectId: alert.projectId},
      });
    }
  }

  if (projectsResult.status !== 'fulfilled') return newestFirst(list);
  const projects: any[] = projectsResult.value.data || [];
  const people: Record<string, string> = {};
  if (optionsResult.status === 'fulfilled') for (const user of optionsResult.value.data || []) people[String(user.id)] = user.displayName;
  const surveyorName = (project: any) => people[String(project.assignedSurveyorId)] || 'the surveyor';
  const label = (project: any) => project.projectName || project.jobNo || 'Project';

  // 3. projects on hold
  for (const project of projects) {
    if (norm(project.status) === 'onhold') {
      list.push({
        id: `hold:${project.id}:${project.updatedAt || ''}`,
        type: 'hold',
        title: 'Project on hold',
        message: `${label(project)}${project.jobNo ? ` (${project.jobNo})` : ''} has been put on hold.`,
        time: project.updatedAt || null,
        target: {kind: 'project', projectId: String(project.id)},
      });
    }
  }

  // 2, 4, 5, 6: need each project's equipment inspection statuses
  const open = projects.filter(project => !['onhold', 'completed'].includes(norm(project.status))).slice(0, 40);
  const details = await Promise.allSettled(open.map(project => getProject(String(project.id))));
  details.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const project = open[index];
    const projectId = String(project.id);
    const target = {kind: 'project', projectId} as const;
    const areas: any[] = result.value.data?.areas || [];
    const equipment: any[] = areas.flatMap(area => (area.equipment || []).map((item: any) => ({...item, areaName: area.areaName})));
    const statuses = equipment.map(item => norm(item.inspectionStatus));

    // 2. QC approved every inspection
    if (equipment.length > 0 && statuses.every(status => status === 'qcapproved' || status === 'approved')) {
      list.push({
        id: `approved:${projectId}:${equipment.length}`,
        type: 'approved',
        title: 'QC approved all inspections',
        message: `All ${equipment.length} inspection${equipment.length === 1 ? '' : 's'} in ${label(project)} have been approved by QC.`,
        time: project.updatedAt || null,
        target,
      });
      return;
    }

    // 4. survey not started yet
    const started = statuses.some(status => status && status !== 'notstarted');
    if (!started && ['pending', 'active'].includes(norm(project.status)) && project.assignedSurveyorId) {
      list.push({
        id: `notstarted:${projectId}`,
        type: 'notStarted',
        title: 'Survey not started',
        message: `${label(project)} is assigned to ${surveyorName(project)}, but the survey has not started yet.`,
        time: project.createdAt || null,
        target,
      });
    }

    for (const item of equipment) {
      const status = norm(item.inspectionStatus);
      const tag = item.tagNumber || `Equipment ${item.sequenceNo ?? ''}`.trim();
      // 5. QC gave comments / requested changes
      if (status === 'changesrequested') {
        list.push({
          id: `comments:${item.id}`,
          type: 'comments',
          title: 'QC added comments',
          message: `QC requested changes on ${tag} in ${label(project)} (${item.areaName || 'area'}).`,
          time: project.updatedAt || null,
          target,
        });
      }
      // 6. surveyor submitted to QC
      if (status === 'completed' || status === 'submitted' || status === 'pendingreview') {
        list.push({
          id: `submitted:${item.id}`,
          type: 'submitted',
          title: 'Surveyor submitted to QC',
          message: `${surveyorName(project)} submitted ${tag} in ${label(project)} for QC review.`,
          time: project.updatedAt || null,
          target,
        });
      }
    }
  });
  return newestFirst(list);
}

// ---------------------------------------------------------------- Surveyor
async function buildSurveyorNotifications(): Promise<AppNotification[]> {
  const [dashboardResult, projectsResult] = await Promise.allSettled([getSurveyorDashboard(), getSurveyorProjects()]);
  const list: AppNotification[] = [];
  if (dashboardResult.status === 'fulfilled') {
    for (const feedback of dashboardResult.value.data?.qcFeedback || []) {
      list.push({
        id: `sv-changes:${feedback.equipmentId}:${feedback.reviewedDate || ''}`,
        type: 'comments',
        title: 'QC requested changes',
        message: `${feedback.tagNumber || 'Equipment'} in ${feedback.projectName}${feedback.qcComments ? `: ${feedback.qcComments}` : ''}`,
        time: feedback.reviewedDate || null,
        target: {kind: 'surveyorEquipment', projectId: String(feedback.projectId), areaId: String(feedback.areaId), equipmentId: String(feedback.equipmentId)},
      });
    }
  }
  if (projectsResult.status === 'fulfilled') {
    for (const project of projectsResult.value.data || []) {
      list.push({
        id: `sv-assigned:${project.projectId}${project.isTransferred ? ":handover" : ""}`,
        type: 'assigned',
        title: project.isTransferred ? 'Project handed over to you' : 'New project assigned to you',
        message: `${project.projectName}${project.jobNo ? ` (${project.jobNo})` : ''}${project.location ? ` · ${project.location}` : ''}`,
        time: project.createdDate || null,
        target: {kind: 'surveyorProject', projectId: String(project.projectId)},
      });
    }
  }
  return newestFirst(list);
}

const buildDerivedNotifications = (role: string): Promise<AppNotification[]> => {
  const key = role.toLowerCase();
  if (key === 'client') return getClientNotifications().then(res => newestFirst(res.data.map(n => ({id: n.id, type: /approved/i.test(n.title) ? 'approved' : /report|assigned/i.test(n.title) ? 'assigned' : /defect/i.test(n.title) ? 'comments' : 'submitted', title: n.title, message: n.message, time: n.time, target: {kind: 'clientProject', projectId: n.projectId}}))));
  if (key === 'qc') return buildQcNotifications();
  if (key === 'surveyor') return buildSurveyorNotifications();
  if (key === 'admin' || key === 'manager') return buildManagerNotifications();
  return Promise.resolve([]);
};

export const buildNotifications = async (role:string):Promise<AppNotification[]> => {
  const [derived,persistent,assignments]=await Promise.allSettled([Promise.resolve().then(()=>buildDerivedNotifications(role)),Promise.resolve().then(()=>getAccessNotices()), role.toLowerCase() === "client" ? Promise.resolve({data: []}) : apiClient.get<any[]>("/projects/assignment-notifications")]);
  let existing=derived.status==='fulfilled'?derived.value:[];
  if (assignments.status === 'fulfilled' && Array.isArray(assignments.value.data)) {
    const notices: AppNotification[] = assignments.value.data.map(n => ({id: `assignment:${n.id}`, type: 'assigned', title: n.title, message: n.message, time: n.time,
      target: role.toLowerCase() === 'surveyor' ? {kind: 'surveyorProject', projectId:n.projectId} : role.toLowerCase() === 'qc' ? {kind:'qcProject', projectId:n.projectId} : {kind:'project',projectId:n.projectId}}));
    const assignedProjects = new Set(notices.map(n => n.target && 'projectId' in n.target ? n.target.projectId : ''));
    existing = [...existing.filter(n => !(n.type === 'assigned' && n.target && 'projectId' in n.target && assignedProjects.has(n.target.projectId))), ...notices];
  }
  if(persistent.status!=='fulfilled') {if(derived.status==='rejected')throw derived.reason;return existing;}
  const notices:AppNotification[]=(persistent.value?.data||[]).map(n=>({id:`access:${n.id}`,serverId:n.id,readAt:n.readAt,
    type:n.kind==='Decision'||(n.kind==='InspectionReview'&&/approved/i.test(n.title))?'approved':n.kind==='InspectionReview'?'comments':'users',title:n.title,message:n.message,time:n.createdAt,
    target:n.kind==='Registration'||n.kind==='RoleRequest'?{kind:'users',userId:n.targetUserId,roleRequestId:n.roleRequestId}:
      n.kind==='InspectionReview'&&n.inspectionActivityId?{kind:'inspectionActivity',activityId:n.inspectionActivityId}:
      n.kind==='InspectionReview'&&n.projectId&&n.areaId&&n.equipmentId?{kind:'surveyorEquipment',projectId:n.projectId,areaId:n.areaId,equipmentId:n.equipmentId}:undefined}));
  return newestFirst([...existing,...notices]);
};

// ---------------------------------------------------------------- read state (per user, kept on this device)
const memoryStore: Record<string, string> = {};
const storage = {
  get(key: string): string | null {
    try {
      const ls = (globalThis as any).localStorage;
      if (ls) return ls.getItem(key);
    } catch { /* storage blocked */ }
    return memoryStore[key] ?? null;
  },
  set(key: string, value: string) {
    try {
      const ls = (globalThis as any).localStorage;
      if (ls) { ls.setItem(key, value); return; }
    } catch { /* storage blocked */ }
    memoryStore[key] = value;
  },
};
const readKey = (userKey: string) => `exsurvey.notifications.read.${userKey}`;
export const loadReadIds = (userKey: string): Set<string> => {
  try { return new Set<string>(JSON.parse(storage.get(readKey(userKey)) || '[]')); } catch { return new Set(); }
};
export const saveReadIds = (userKey: string, ids: Set<string>) => storage.set(readKey(userKey), JSON.stringify(Array.from(ids).slice(-500)));
const dismissedKey = (userKey: string) => `exsurvey.notifications.dismissed.${userKey}`;
export const loadDismissedIds = (userKey: string): Set<string> => {
  try { return new Set<string>(JSON.parse(storage.get(dismissedKey(userKey)) || '[]')); } catch { return new Set<string>(); }
};
export const saveDismissedIds = (userKey: string, ids: Set<string>) => storage.set(dismissedKey(userKey), JSON.stringify(Array.from(ids).slice(-500)));
