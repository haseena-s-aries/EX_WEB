import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {QcDashboardLayout, QcProjectCard, QcProjectMetadata} from '../components/QcDashboardLayout';
import {getApiErrorMessage} from '../api/errors';
import {getQcDashboard, getQcProjects} from '../api/projects';

type Props = {userName: string; onProjectPress: (id: string, project?: any) => void; projectsOnly?: boolean; refreshVersion?: number; pendingWorkspace?: boolean};
const value = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null) return obj[key];
  return undefined;
};
const statusOf = (project: any) => String(value(project, 'qcStatus', 'qcReviewStatus', 'qcInspectionStatus', 'reviewStatus', 'inspectionStatus', 'status') || 'Awaiting QC Review');
const isOverdue = (project: any) => {
  const due = value(project, 'dueDate', 'reviewDueDate', 'qcDueDate');
  return !!due && new Date(due).getTime() < Date.now() && !/approved|complete/i.test(statusOf(project));
};

export default function QcDashboardScreen({userName, onProjectPress, projectsOnly = false, refreshVersion, pendingWorkspace = false}: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [dash, list] = await Promise.all([getQcDashboard(), getQcProjects(pendingWorkspace)]);
      setSummary(dash.data);
      setProjects(list.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load QC assignments.'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [pendingWorkspace]);
  useEffect(() => { load(); }, [load, refreshVersion]);
  const counts = useMemo(() => {
    if (pendingWorkspace) return [
      ['Awaiting QC Review', Number(summary.awaitingQcReview) || 0, '#fff0d7', '#a75a0b'],
      ['Changes Requested', Number(summary.changesRequested) || 0, '#fdebed', '#bf3441'],
      ['Approved', Number(summary.approved) || 0, '#e5f6ec', '#237348'],
      ['Overdue', Number(summary.overdue) || 0, '#f1eaf3', '#8053a6'],
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
      ['Total Projects', projects.length, '#eceeff', '#3f47d6'],
      ['Awaiting QC Review', count(['awaitingQcReview', 'awaitingQCReview', 'awaitingReview'], awaiting), '#fff0d7', '#a75a0b'],
      ['Changes Required', count(['changesRequested', 'changesRequired', 'changeRequired'], changes), '#fdebed', '#bf3441'],
      ['Approved', count(['approved'], approved), '#e5f6ec', '#237348'],
      ['Overdue', count(['overdue'], overdue), '#f1eaf3', '#8053a6'],
    ] as const;
  }, [projects, summary, pendingWorkspace]);
  return <QcDashboardLayout eyebrow={projectsOnly ? 'QC PROJECTS' : 'QC WORKSPACE'}
    title={pendingWorkspace ? 'QC Pending' : projectsOnly ? 'Assigned Projects' : `Welcome, ${userName.split(' ')[0]}`}
    subtitle={pendingWorkspace ? 'QC assignments and inspection review status' : projectsOnly ? 'Projects assigned to you for quality review' : 'Assigned projects and inspection review status'}
    kpis={projectsOnly ? undefined : counts.map(([label, count, background, color]) => ({label, count, background, color}))}
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
  </QcDashboardLayout>;
}
