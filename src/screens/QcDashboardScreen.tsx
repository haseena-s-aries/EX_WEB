import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {getQcDashboard, getQcProjects} from '../api/projects';

type Props = {userName: string; onProjectPress: (id: string, project?: any) => void; projectsOnly?: boolean; refreshVersion?: number};
const value = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null) return obj[key];
  return undefined;
};
const statusOf = (project: any) => String(value(project, 'qcStatus', 'qcReviewStatus', 'qcInspectionStatus', 'reviewStatus', 'inspectionStatus', 'status') || 'Awaiting QC Review');
const isOverdue = (project: any) => {
  const due = value(project, 'dueDate', 'reviewDueDate', 'qcDueDate');
  return !!due && new Date(due).getTime() < Date.now() && !/approved|complete/i.test(statusOf(project));
};

export default function QcDashboardScreen({userName, onProjectPress, projectsOnly = false, refreshVersion}: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [dash, list] = await Promise.all([getQcDashboard(), getQcProjects()]);
      setSummary(dash.data);
      setProjects(list.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load QC assignments.'));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshVersion]);
  const counts = useMemo(() => {
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
      ['Awaiting QC Review', count(['awaitingQcReview', 'awaitingQCReview', 'awaitingReview'], awaiting), '#fff0d7', '#a75a0b'],
      ['Changes Required', count(['changesRequested', 'changesRequired', 'changeRequired'], changes), '#fdebed', '#bf3441'],
      ['Approved', count(['approved'], approved), '#e5f6ec', '#237348'],
      ['Overdue', count(['overdue'], overdue), '#f1eaf3', '#8053a6'],
    ] as const;
  }, [projects, summary]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <View style={styles.hero}><Text style={styles.eyebrow}>{projectsOnly ? 'QC PROJECTS' : 'QC WORKSPACE'}</Text><Text style={styles.title}>{projectsOnly ? 'Assigned Projects' : `Welcome, ${userName.split(' ')[0]}`}</Text><Text style={styles.subtitle}>{projectsOnly ? 'Projects assigned to you for quality review' : 'Assigned projects and inspection review status'}</Text></View>
    {!projectsOnly&&<View style={styles.counts}>{counts.map(([label, count, bg, color]) => <View key={label} style={styles.countCard}><Text style={[styles.count,{color}]}>{count}</Text><Text style={styles.countLabel}>{label}</Text><View style={[styles.bar,{backgroundColor:bg}]} /></View>)}</View>}
    <View style={styles.heading}><Text style={styles.headingText}>Assigned Projects</Text><TouchableOpacity onPress={() => load()}><Text style={styles.refresh}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color="#3f47d6" style={{margin:32}} /> : error ? <View style={styles.empty}><Text style={styles.projectTitle}>Projects unavailable</Text><Text style={styles.meta}>{error}</Text><TouchableOpacity onPress={() => load()}><Text style={styles.refresh}>Try again</Text></TouchableOpacity></View> : projects.length === 0 ? <View style={styles.empty}><Text style={styles.projectTitle}>No projects assigned</Text><Text style={styles.meta}>QC assignments will appear here.</Text></View> : projects.map((p, i) => {
      const name = value(p, 'projectName', 'name') || 'Project';
      const id = value(p, 'projectId', 'id');
      const status = statusOf(p);
      return <TouchableOpacity key={String(id || i)} onPress={() => id && onProjectPress(String(id), p)} style={styles.project} accessibilityRole="button">
        <View style={styles.projectTop}><View style={{flex:1}}><Text style={styles.projectTitle}>{name}</Text><Text style={styles.meta}>{value(p,'jobNo','jobNumber') || 'No job number'} · {value(p,'location') || 'Location not set'}</Text></View><Text style={[styles.badge,{backgroundColor:isOverdue(p)?'#f1eaf3':/approved/i.test(status)?'#e5f6ec':/change/i.test(status)?'#fdebed':'#fff0d7',color:isOverdue(p)?'#8053a6':/approved/i.test(status)?'#237348':/change/i.test(status)?'#bf3441':'#a75a0b'}]}>{isOverdue(p)?'Overdue':status}</Text></View>
        <Text style={styles.open}>Open project ›</Text>
      </TouchableOpacity>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({screen:{flex:1,backgroundColor:'#f7f9ff'},content:{padding:24,paddingBottom:48,maxWidth:1180,width:'100%',alignSelf:'center'},hero:{backgroundColor:'#242d52',borderRadius:14,padding:24,minHeight:140,justifyContent:'center'},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:'#b8a5f8'},title:{fontSize:25,fontWeight:'800',color:'#fff',marginTop:8},subtitle:{fontSize:13,color:'#d0d4e9',marginTop:6},counts:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:16},countCard:{flexGrow:1,flexBasis:180,minHeight:100,padding:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f6',borderRadius:10},count:{fontSize:26,fontWeight:'800'},countLabel:{fontSize:12,fontWeight:'700',color:'#4b5064',marginTop:4},bar:{height:3,borderRadius:2,marginTop:12},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:26,marginBottom:12},headingText:{fontSize:18,fontWeight:'800',color:'#242d52'},refresh:{color:'#3f47d6',fontWeight:'800',fontSize:12},project:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f6',borderRadius:10,padding:18,marginBottom:10},projectTop:{flexDirection:'row',alignItems:'flex-start',gap:12},projectTitle:{fontSize:15,fontWeight:'800',color:'#242d52'},meta:{fontSize:12,color:'#767b8e',marginTop:5},badge:{overflow:'hidden',borderRadius:20,paddingHorizontal:10,paddingVertical:6,fontSize:10,fontWeight:'800'},open:{alignSelf:'flex-end',marginTop:12,fontSize:12,color:'#3f47d6',fontWeight:'800'},empty:{backgroundColor:'#fff',padding:26,borderRadius:10,alignItems:'center'}});
