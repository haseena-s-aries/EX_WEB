import ProjectCompanyLogo from './ProjectCompanyLogo';
import React, {useState} from 'react';
import {ActivityIndicator, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import type {ClientProject} from '../api/clientDashboard';
import {DashboardLayout, DashboardStatusBadge} from './DashboardPresentation';
import {ClientAction, useClientOverviewStyle} from './ClientOverview';
import SearchableOptionPicker from './SearchableOptionPicker';
import {useThemeMode} from '../theme/useThemeMode';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE = require('../assets/landing/industry-3.jpg');
const label = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');
const percent = (count: number, total: number) => total > 0 ? Math.max(0, Math.min(100, count / total * 100)) : 0;
const bounded = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

export function ClientProjectsLayout({heading, loading, error, refreshing, onRefresh, children, accessory}: React.ComponentProps<typeof DashboardLayout>) {
  const {c} = useClientOverviewStyle();
  const {width} = useWindowDimensions();
  const progressView = heading === 'Inspection Progress';
  return <ScrollView nativeID="ex-client-projects" style={{flex:1, backgroundColor:c.bg}}
    contentContainerStyle={{padding:width < 650 ? 16 : 24, gap:22, paddingBottom:36}}
    refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.cyan} />}>
    <View style={[s.hero, {borderColor:c.border}]}>
      <Image accessible={false} source={OFFSHORE} resizeMode="cover" style={s.heroImage} />
      <View nativeID="ex-client-projects-hero-shade" pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor:'#03192C99'}]} />
      <View style={{gap:9, flex:1, minWidth:0}}>
        <Text style={s.eyebrow}>CLIENT PORTAL   /   PROJECT OVERSIGHT</Text>
        <Text accessibilityRole="header" style={[s.title, width < 650 && {fontSize:32}]}>{progressView ? 'Inspection ' : 'My '}<Text style={{color:'#00D9EE'}}>{progressView ? 'Progress' : 'Projects'}</Text></Text>
        <Text style={s.heroDescription}>{progressView ? 'Track area completion, equipment inspections, and QC review across your assigned projects.' : 'View and track your assigned projects, inspection progress, and review status.'}</Text>
      </View>
      {!!accessory && <View style={{alignSelf:'flex-start'}}>{accessory}</View>}
    </View>
    {loading ? <View style={s.state}><ActivityIndicator color={c.cyan} accessibilityLabel="Loading assigned projects" /><Text style={{color:c.secondary}}>Loading your assigned projects…</Text></View> :
      error ? <View style={s.state}><Text accessibilityRole="alert" style={{color:c.text, fontSize:18, fontWeight:'700'}}>Unable to load your projects</Text><Text style={{color:c.secondary}}>{error}</Text><ClientAction title="Try again" onPress={onRefresh} /></View> : children}
  </ScrollView>;
}

export function ClientProjectsContent({projects, query, onQuery, onProject, onRefresh, refreshing, progressView = false}: {
  projects: ClientProject[]; query: string; onQuery: (value: string) => void; onProject: (id: string) => void; onRefresh: () => void; refreshing: boolean;
  progressView?: boolean;
}) {
  const {c} = useClientOverviewStyle();
  const dark = useThemeMode() === 'dark';
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const term = query.trim().toLowerCase();
  const shown = projects.filter(p => (!status || p.projectStatus === status) &&
    `${p.projectName} ${p.jobNumber} ${p.location} ${p.projectStatus} ${label(p.projectStatus)}`.toLowerCase().includes(term));
  return <>
    <View style={s.toolbar}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}><Text style={{color:c.cyan}}>{progressView ? '▥' : '▤'}  </Text>{progressView ? 'Inspection Progress' : 'My Projects'} ({projects.length})</Text>
      <View style={s.tools}><ClientAction title={refreshing ? 'Refreshing…' : '↻ Refresh'} onPress={onRefresh} disabled={refreshing} />
        {(['grid','list'] as const).map(mode => <TouchableOpacity key={mode} accessibilityRole="button" accessibilityLabel={`${mode === 'grid' ? 'Grid' : 'List'} view`}
          accessibilityState={{selected:view === mode}} onPress={() => setView(mode)} style={[s.toggle,{borderColor:c.border,backgroundColor:view === mode ? c.cyan : c.card}]}>
          <Text style={{fontSize:22,color:view === mode ? '#03192C' : c.cyan}}>{mode === 'grid' ? '▦' : '☷'}</Text></TouchableOpacity>)}
      </View>
    </View>
    <View style={s.filters}>
      <View style={[s.search,{borderColor:c.border,backgroundColor:c.card}]}><Text accessible={false} style={{color:c.cyan,fontSize:24}}>⌕</Text>
        <TextInput accessibilityLabel="Search my projects" placeholder="Search project, job number, location or status…" placeholderTextColor={c.secondary} value={query} onChangeText={onQuery}
          style={{flex:1,minWidth:0,minHeight:46,color:c.text,fontSize:15}} /></View>
      <View style={{flexGrow:1,flexBasis:220,minWidth:0}}><SearchableOptionPicker dark={dark} label="Project status" value={status} placeholder="All statuses"
        options={[{label:'All statuses',value:''}, ...[...new Set(projects.map(p => p.projectStatus))].map(value => ({label:label(value),value}))]} onChange={setStatus} /></View>
      <ClientAction title="✕ Clear Filters" onPress={() => {onQuery(''); setStatus('');}} />
    </View>
    {!!(query || status) && <Text accessibilityLiveRegion="polite" style={{color:c.secondary}}>{shown.length} of {projects.length} projects</Text>}
    {progressView && <Text style={{color:c.secondary,fontSize:13,lineHeight:20}}>Survey completion and QC approval are tracked separately. Open a project to view its areas and saved inspections.</Text>}
    {!shown.length ? <View style={[s.state,{borderWidth:1,borderColor:c.border,borderRadius:16,backgroundColor:c.card}]}>
      <Text style={{color:c.cyan,fontSize:38}}>▱</Text><Text style={[s.heading,{color:c.text}]}>{projects.length ? 'No matching projects' : 'No projects assigned'}</Text>
      <Text style={{color:c.secondary,textAlign:'center'}}>{projects.length ? 'Clear the filters or try another search.' : 'Projects assigned to your Client account will appear here.'}</Text>
      <ClientAction title={projects.length ? 'Clear Filters' : 'Refresh Projects'} onPress={projects.length ? () => {onQuery(''); setStatus('');} : onRefresh} disabled={refreshing} />
    </View> : shown.map(project => <ClientProjectOverview key={project.projectId} project={project} compact={view === 'list'} onPress={() => onProject(project.projectId)} />)}
  </>;
}

function SurveyRing({value, color, track, background, textColor}: {value:number; color:string; track:string; background:string; textColor:string}) {
  const progress = bounded(value);
  return <View accessibilityRole="progressbar" accessibilityLabel="Overall survey progress" accessibilityValue={{min:0,max:100,now:progress}}
    style={[s.ring,{backgroundColor:track}, Platform.OS === 'web' && {backgroundImage:`conic-gradient(${color} ${progress}%, ${track} 0)`} as any]}>
    {Platform.OS !== 'web' && Array.from({length:72},(_,i) => <View key={i} style={{position:'absolute',left:70 + 64*Math.sin(i*Math.PI/36),top:70 - 64*Math.cos(i*Math.PI/36),width:6,height:6,borderRadius:3,backgroundColor:i/72*100 < progress ? color : track}} />)}
    <View style={[s.ringInner,{backgroundColor:background}]}><Text style={{color:textColor,fontSize:28,fontWeight:'900'}}>{progress}%</Text><Text style={{color:textColor,fontSize:11}}>Survey Progress</Text></View>
  </View>;
}

function ClientProjectOverview({project:p, compact, onPress, metricsOnly = false}: {project:ClientProject; compact:boolean; onPress:() => void; metricsOnly?: boolean}) {
  const {c} = useClientOverviewStyle(); const {width} = useWindowDimensions();
  const wide = width >= 1100; const mobile = width < 650;
  const progress = p.progress;
  const stat = (icon:string, title:string, value:React.ReactNode) => <View key={title} style={[s.metadata, {borderColor:c.border}, !wide && {flexBasis:mobile ? '100%' : '42%',borderLeftWidth:0}]}>
    <Text accessible={false} style={{color:c.cyan,fontSize:23}}>{icon}</Text><View style={{gap:7,flex:1,minWidth:0}}><Text style={{color:c.secondary,fontSize:13}}>{title}</Text>{typeof value === 'string' ? <Text style={[s.value,{color:c.text}]}>{value || '—'}</Text> : value}</View>
  </View>;
  const bar = (title:string,count:number,total:number) => {
    const percentage = percent(count,total);
    return <View key={title} style={{gap:7}}><View style={s.barLabels}><Text style={{color:c.text,fontSize:14,flexShrink:1}}>{title}</Text><Text style={{color:c.text,fontSize:13}}>{count} / {total} ({Number(percentage.toFixed(1))}%)</Text></View>
      <View accessibilityRole="progressbar" accessibilityLabel={`${p.projectName}: ${title}`} accessibilityValue={{min:0,max:100,now:percentage}} style={[s.track,{backgroundColor:c.elevated}]}><View style={{height:'100%',width:`${percentage}%`,backgroundColor:c.success,borderRadius:6}} /></View></View>;
  };
  const stats = [
    ['☷','Open Defects',progress.openDefects,c.cyan], ['◷','Pending Review',progress.awaitingQc,c.amber], ['✓','Closed Defects',progress.closedDefects,c.success],
    ['↻','In Review',progress.inReview,c.cyan], ['⚠','Changes Requested',progress.changesRequested,c.critical],
  ] as const;
  const metrics = <View style={[s.panels,(!wide || compact) && {flexDirection:'column'}]}>
      <View style={[s.panel,{borderColor:c.border,backgroundColor:c.bg}]}>
        <Text style={[s.panelHeading,{color:c.text}]}><Text style={{color:c.cyan}}>▥  </Text>{metricsOnly ? 'Survey Progress' : 'Project Progress'}</Text>
        <View style={[s.progressBody,mobile && {flexDirection:'column',alignItems:'stretch'}]}>
          <View style={{alignItems:'center'}}><SurveyRing value={progress.surveyProgress} color={c.success} track={c.elevated} background={c.bg} textColor={c.text} /></View>
          <View style={{flex:1,minWidth:0,gap:17}}>
            {bar('Areas Completed',progress.areasCompleted,progress.totalAreas)}
            {bar('Equipment Inspected',progress.equipmentInspected,progress.totalEquipment)}
            {bar('QC Approved',progress.qcApproved,progress.totalSubmitted)}
          </View>
        </View>
      </View>
      <View style={[s.panel,{borderColor:c.border,backgroundColor:c.bg}]}>
        <Text style={[s.panelHeading,{color:c.text}]}><Text style={{color:c.cyan}}>▱  </Text>{metricsOnly ? 'QC & Defect Status Overview' : 'Project Status Overview'}</Text>
        <View style={s.stats}>{stats.map(([icon,title,value,color]) => <View key={title} style={[s.stat,{borderColor:color+'66',backgroundColor:color+'12'},mobile && {flexBasis:'100%'}]}>
          <Text accessible={false} style={{color,fontSize:27}}>{icon}</Text><View style={{flex:1,minWidth:0,gap:4}}><Text style={{color:c.text,fontSize:13}}>{title}</Text><Text style={{color,fontSize:24,fontWeight:'800'}}>{value}</Text></View>
        </View>)}</View>
      </View>
    </View>;
  if (metricsOnly) return metrics;
  return <View testID={`client-project-${p.projectId}`} style={[s.card,{backgroundColor:c.card,borderColor:c.cyan}]}>
    <View style={[s.projectHeader,compact && wide && {gap:10}]}>
      <View style={[s.identity,{flexBasis:wide ? 340 : '100%'}]}>
        <ProjectCompanyLogo projectId={p.projectId} version={p} style={[s.placeholder, compact && {width:66,height:66}]} />
        <View style={{flex:1,minWidth:0,gap:7}}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}>{projectDisplay(p.projectName)}</Text>
          <Text style={{color:c.secondary,fontSize:14}}>Job No: <Text style={{color:c.cyan,fontWeight:'700'}}>{projectDisplay(p.jobNumber) || '—'}</Text></Text>
          <DashboardStatusBadge status={label(p.projectStatus)} />
          <Text style={{color:c.secondary,fontSize:12}}>{projectDisplay(p.location) || 'Location not specified'}</Text>
        </View>
      </View>
      {stat('♧','Vessel / Site',projectDisplay(p.vesselOrSiteName))}{stat('♙','Surveyor',p.surveyorName)}{stat('♧','Assigned QC',p.assignedQcName)}{stat('▣','QC Status',<DashboardStatusBadge status={label(p.qcStatus)} />)}
    </View>
    {metrics}
    <View style={s.footer}><Text style={{color:c.text,fontSize:15,fontWeight:'700'}}><Text style={{color:c.cyan}}>▣  </Text>Survey Progress: {bounded(progress.surveyProgress)}%</Text><ClientAction primary title="View Project →" onPress={onPress} /></View>
  </View>;
}

export function ClientProjectMetrics({project}: {project: ClientProject}) {
  return <ClientProjectOverview project={project} compact={false} onPress={() => {}} metricsOnly />;
}

const s = StyleSheet.create({
  hero:{minHeight:160,borderWidth:1,borderRadius:18,overflow:'hidden',backgroundColor:'#03192C',padding:24,flexDirection:'row',gap:12,alignItems:'center'},
  heroImage:{position:'absolute',right:0,top:0,width:'65%',height:'100%'},eyebrow:{color:'#00D9EE',fontSize:11,fontWeight:'800',letterSpacing:1.3},
  title:{color:'#F5FAFF',fontSize:38,fontWeight:'900'},heroDescription:{color:'#E5F2FA',fontSize:15,lineHeight:23,maxWidth:650},
  toolbar:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center',justifyContent:'space-between'},tools:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
  heading:{fontSize:21,fontWeight:'800',flexShrink:1},toggle:{minWidth:48,minHeight:46,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'flex-start'},search:{flexGrow:3,flexShrink:1,flexBasis:380,minWidth:0,minHeight:46,borderWidth:1,borderRadius:10,paddingHorizontal:12,gap:10,flexDirection:'row',alignItems:'center'},
  card:{borderWidth:1,borderRadius:16,padding:20,gap:20,minWidth:0},projectHeader:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:16},identity:{flexDirection:'row',alignItems:'center',gap:16,minWidth:0,flexGrow:1},
  placeholder:{width:104,height:94,borderWidth:1,borderRadius:12,alignItems:'center',justifyContent:'center'},metadata:{flexGrow:1,flexBasis:125,flexDirection:'row',alignItems:'flex-start',gap:10,paddingLeft:16,borderLeftWidth:1,minWidth:0},value:{fontSize:14,fontWeight:'700'},
  panels:{flexDirection:'row',gap:16},panel:{flex:1,minWidth:0,padding:18,gap:16,borderWidth:1,borderRadius:12},panelHeading:{fontSize:17,fontWeight:'800'},progressBody:{flexDirection:'row',alignItems:'center',gap:22},
  ring:{width:146,height:146,borderRadius:73,alignItems:'center',justifyContent:'center'},ringInner:{width:118,height:118,borderRadius:59,alignItems:'center',justifyContent:'center',gap:4},
  track:{height:10,borderRadius:6,overflow:'hidden'},barLabels:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6},stats:{flexDirection:'row',flexWrap:'wrap',gap:10},stat:{flexGrow:1,flexBasis:'29%',minWidth:0,borderWidth:1,borderRadius:10,padding:12,flexDirection:'row',alignItems:'center',gap:12},
  footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14},state:{padding:28,gap:14,alignItems:'center',justifyContent:'center',minHeight:180},
});
