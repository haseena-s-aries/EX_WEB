import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {QcDashboardLayout, QcProjectCard, QcProjectMetadata} from '../components/QcDashboardLayout';
import {getApiErrorMessage} from '../api/errors';
import {getQcActivityQueue, getQcDashboard, getQcProjects} from '../api/projects';

type Props = {userName: string; onProjectPress: (id: string, project?: any) => void; onActivityPress?: (id: string) => void; projectsOnly?: boolean; refreshVersion?: number; pendingWorkspace?: boolean};
const value = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null) return obj[key];
  return undefined;
};
const statusOf = (project: any) => String(value(project, 'qcStatus', 'qcReviewStatus', 'qcInspectionStatus', 'reviewStatus', 'inspectionStatus', 'status') || 'Awaiting QC Review');
const isOverdue = (project: any) => {
  const due = value(project, 'dueDate', 'reviewDueDate', 'qcDueDate');
  return !!due && new Date(due).getTime() < Date.now() && !/approved|complete/i.test(statusOf(project));
};

export default function QcDashboardScreen({userName, onProjectPress, onActivityPress, projectsOnly = false, refreshVersion, pendingWorkspace = false}: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const activityRequest = typeof getQcActivityQueue === 'function'
        ? getQcActivityQueue().catch(() => ({data: []}))
        : Promise.resolve({data: []});
      const [dash, list, activityQueue] = await Promise.all([getQcDashboard(), getQcProjects(pendingWorkspace), activityRequest]);
      setSummary(dash.data);
      setProjects(list.data);
      setActivities(activityQueue.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load QC assignments.'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [pendingWorkspace]);
  useEffect(() => { load(); }, [load, refreshVersion]);
  const counts = useMemo(() => {
    if (pendingWorkspace) return [
      ['Awaiting QC Review', Number(summary.awaitingQcReview) || 0, 'amber'],
      ['Changes Requested', Number(summary.changesRequested) || 0, 'critical'],
      ['Approved', Number(summary.approved) || 0, 'success'],
      ['Overdue', Number(summary.overdue) || 0, 'indigo'],
    ] as const;
    const approved = projects.filter(p => /approved|complete/i.test(statusOf(p))).length;
    const changes = projects.filter(p => /change|revision|rework/i.test(statusOf(p))).length;
    const overdue = projects.filter(isOverdue).length;
    const awaiting = projects.filter(p => !/approved|complete|change|revision|rework/i.test(statusOf(p)) && !isOverdue(p)).length;
    // The assigned-project list is the source of truth for this QC user's work.
    // Keep dashboard aggregates as a floor, so a stale/empty aggregate cannot
    // hide projects that are visibly awaiting review in the same response.
    const count = (keys: string[], fromProjects: number) =>
      Math.max(fromProjects, Number(value(summary, ...keys)) || 0);
    return [
      ['Total Projects', projects.length, 'cyan'],
      ['Awaiting QC Review', count(['awaitingQcReview', 'awaitingQCReview', 'awaitingReview'], awaiting), 'amber'],
      ['Changes Required', count(['changesRequested', 'changesRequired', 'changeRequired'], changes), 'critical'],
      ['Approved', count(['approved'], approved), 'success'],
      ['Overdue', count(['overdue'], overdue), 'indigo'],
    ] as const;
  }, [projects, summary, pendingWorkspace]);
  return <QcDashboardLayout eyebrow={projectsOnly ? 'QC PROJECTS' : 'QC WORKSPACE'}
    title={pendingWorkspace ? 'QC Pending' : projectsOnly ? 'Assigned Projects' : `Welcome, ${userName.split(' ')[0]}`}
    subtitle={pendingWorkspace ? 'QC assignments and inspection review status' : projectsOnly ? 'Projects assigned to you for quality review' : 'Assigned projects and inspection review status'}
    kpis={projectsOnly ? undefined : counts.map(([label, count, tone]) => ({label, count, tone}))}
    heading={pendingWorkspace ? 'QC Projects' : 'Assigned Projects'} loading={loading} error={error} empty={projects.length === 0}
    refreshing={refreshing} onRefresh={() => load(true)} onReload={() => load()}>
    {projects.map((p, i) => {
      const id = value(p, 'projectId', 'id');
      return <QcProjectCard key={String(id || i)} name={value(p, 'projectName', 'name') || 'Project'}
        jobNo={value(p, 'jobNo', 'jobNumber')} location={value(p, 'location')}
        status={statusOf(p)} overdue={isOverdue(p)} onPress={() => id && onProjectPress(String(id), p)}>
        {pendingWorkspace && <QcProjectMetadata fields={[
          ['Surveyor', value(p, 'surveyorName') || 'Not assigned'],
          ['Assigned QC', value(p, 'assignedQcName') || 'Not assigned'],
          ['QC Status', statusOf(p)],
        ]} />}
      </QcProjectCard>;
    })}
    {onActivityPress && activities.length > 0 && <View style={{marginTop: 18, gap: 8}}><Text style={{fontSize: 18, fontWeight: '800', color: '#242d52'}}>New inspection activities</Text>{activities.map(item => <TouchableOpacity key={item.id} onPress={() => onActivityPress(item.id)} style={{backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e9f6'}}><Text style={{fontWeight: '700', color: '#252f50'}}>{item.grade} · {item.projectName}</Text><Text style={{color: '#707589', marginTop: 4}}>{String(item.reviewStatus).replace(/([A-Z])/g, ' $1').trim()} · {item.inspectorNameSnapshot}</Text></TouchableOpacity>)}</View>}
  </QcDashboardLayout>;
}
