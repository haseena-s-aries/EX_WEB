import React, {useState} from 'react';
import {ActivityIndicator,Image,RefreshControl,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,useWindowDimensions,View} from 'react-native';
import type {ClientNotice,ClientProject} from '../api/clientDashboard';
import {DashboardLayout,DashboardStatusBadge} from './DashboardPresentation';
import {ClientAction,useClientOverviewStyle} from './ClientOverview';
import SearchableOptionPicker from './SearchableOptionPicker';
import {useThemeMode} from '../theme/useThemeMode';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE=require('../assets/landing/industry-3.jpg');
const date=(value?:string)=>value && Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'Not generated yet';
type LayoutProps=React.ComponentProps<typeof DashboardLayout>;
export function ClientReportsLayout(props:LayoutProps) {return <ClientLibraryLayout {...props} kind="reports"/>;}
export function ClientNotificationsLayout(props:LayoutProps) {return <ClientLibraryLayout {...props} kind="notifications"/>;}
function ClientLibraryLayout({kind,accessory,children,loading,error,refreshing,onRefresh}:LayoutProps & {kind:'reports'|'notifications'}) {
  const {c}=useClientOverviewStyle();const {width}=useWindowDimensions();const reports=kind==='reports';
  return <ScrollView nativeID="ex-client-library" style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:width<650?16:24,gap:20,paddingBottom:36}}
    refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.cyan}/>}>
    <View style={[s.hero,{borderColor:c.border}]}><Image accessible={false} source={OFFSHORE} resizeMode="cover" style={s.heroImage}/><View nativeID="ex-client-library-shade" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#03192CA8'}]}/>
      <View style={{flex:1,minWidth:0,gap:10}}><Text style={s.eyebrow}>CLIENT PORTAL   /   {reports?'REPORT LIBRARY':'PROJECT UPDATES'}</Text>
        <Text accessibilityRole="header" style={[s.title,width<650&&{fontSize:30}]}>{reports?'Reports & ':''}<Text style={{color:'#00D9EE'}}>{reports?'Documents':'Notifications'}</Text></Text>
        <Text style={s.subtitle}>{reports?'View project reports, preview PDFs, and download the documents available to your Client account.':'Stay up to date with survey submissions, QC decisions, defect updates, and report activity.'}</Text>
      </View>{accessory&&<View style={{alignSelf:'flex-start'}}>{accessory}</View>}
    </View>
    {loading?<View style={s.empty}><ActivityIndicator color={c.cyan}/><Text style={{color:c.text}}>Loading {reports?'reports':'notifications'}…</Text></View>:error?<View style={s.empty}><Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text><ClientAction title="Try again" onPress={onRefresh}/></View>:children}
  </ScrollView>;
}

function Metric({title,value,color}: {title:string;value:number;color:string}) {const {c}=useClientOverviewStyle();return <View style={[s.metric,{backgroundColor:c.card,borderColor:c.border}]}><Text style={{color:c.secondary,fontSize:13}}>{title}</Text><Text style={{color,fontWeight:'800',fontSize:28}}>{value}</Text></View>;}
function Empty({title,message}: {title:string;message:string}) {const {c}=useClientOverviewStyle();return <View style={[s.empty,{backgroundColor:c.card,borderColor:c.border,borderWidth:1,borderRadius:14}]}><Text style={{color:c.cyan,fontSize:36}}>▤</Text><Text style={{color:c.text,fontSize:19,fontWeight:'800'}}>{title}</Text><Text style={{color:c.secondary,textAlign:'center',lineHeight:22}}>{message}</Text></View>;}
function ProjectPicker({projects,value,onChange}: {projects:ClientProject[];value:string;onChange:(value:string)=>void}) {
  return <SearchableOptionPicker label="Filter by project" placeholder="All Projects" value={value} dark={useThemeMode()==='dark'} options={[{label:'All Projects',value:''},...projects.map(p=>({label:`${projectDisplay(p.projectName)} · ${projectDisplay(p.jobNumber)}`,value:p.projectId}))]} onChange={onChange}/>;
}

export function ClientReportsContent({reports,projects,pdfBusy,onPdf,onRemark,onRefresh,refreshing}: {
  reports:any[];projects:ClientProject[];pdfBusy:string;onPdf:(id:string,download:boolean)=>void;onRemark:(id:string)=>void;onRefresh:()=>void;refreshing:boolean;
}) {
  const {c}=useClientOverviewStyle();const [query,setQuery]=useState(''),[project,setProject]=useState(''),[status,setStatus]=useState('');
  const allowed=new Map(projects.map(p=>[p.projectId,p]));
  const available=reports.filter(r=>allowed.has(r.projectId));
  const term=query.trim().toLowerCase();
  const shown=available.filter(r=>(!project||r.projectId===project)&&(!status||r.reportStatus===status)&&`${r.projectName} ${allowed.get(r.projectId)?.jobNumber||''} ${r.documentNumber||''} ${r.revision||''}`.toLowerCase().includes(term));
  return <>
    <View style={s.metrics}><Metric title="Available Project Reports" value={available.length} color={c.cyan}/><Metric title="Previously Generated" value={available.filter(r=>r.generatedDate).length} color={c.success}/><Metric title="Not Yet Generated" value={available.filter(r=>!r.generatedDate).length} color={c.amber}/></View>
    <View style={s.toolbar}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}>▤ Report Library ({shown.length})</Text><ClientAction title={refreshing?'Refreshing…':'↻ Refresh'} onPress={onRefresh} disabled={refreshing}/></View>
    <View style={[s.filters,{backgroundColor:c.card,borderColor:c.border}]}>
      <TextInput accessibilityLabel="Search client reports" placeholder="Search project, job number, document or revision…" value={query} onChangeText={setQuery} placeholderTextColor={c.secondary} style={[s.search,{color:c.text,borderColor:c.border,backgroundColor:c.bg}]}/>
      <View style={s.picker}><ProjectPicker projects={projects} value={project} onChange={setProject}/></View>
      <View style={s.picker}><SearchableOptionPicker label="Report status filter" placeholder="All report statuses" value={status} onChange={setStatus} dark={useThemeMode()==='dark'} options={[{label:'All report statuses',value:''},...[...new Set(available.map(r=>r.reportStatus).filter(Boolean))].map(value=>({label:String(value),value:String(value)}))]}/></View>
      <ClientAction title="Clear Filters" onPress={()=>{setQuery('');setProject('');setStatus('');}}/>
    </View>
    <Text style={{color:c.secondary,fontSize:13,lineHeight:21}}>Reports reflect saved project data. PDF preview and download use the existing report workflow; downloading does not submit a report.</Text>
    {shown.map(r=><View key={r.projectId} style={[s.report,{borderColor:c.border,backgroundColor:c.card}]}>
      <View style={[s.fileIcon,{backgroundColor:c.elevated,borderColor:c.border}]}><Text style={{color:c.cyan,fontSize:28}}>▤</Text><Text style={{color:c.cyan,fontWeight:'800',fontSize:11}}>PDF</Text></View>
      <View style={{flex:1,minWidth:0,gap:12}}><View style={s.toolbar}><View style={{flex:1,minWidth:0,gap:4}}><Text accessibilityRole="header" style={{color:c.text,fontSize:19,fontWeight:'800'}}>{projectDisplay(r.projectName)}</Text><Text style={{color:c.secondary,fontSize:13}}>Job: {projectDisplay(allowed.get(r.projectId)?.jobNumber)||'—'} · Project inspection report</Text></View><DashboardStatusBadge status={r.reportStatus||'Unspecified'}/></View>
        <View style={s.fields}>{[['Document Number',r.documentNumber||'—'],['Revision',r.revision||'—'],['Generated Date',date(r.generatedDate)]].map(([title,value])=><View key={title} style={s.field}><Text style={{color:c.secondary,fontSize:12}}>{title}</Text><Text style={{color:c.text,fontSize:14,lineHeight:21}}>{value}</Text></View>)}</View>
        <View style={s.actions}><ClientAction primary title={pdfBusy===r.projectId?'Loading PDF…':'View PDF'} disabled={!!pdfBusy} onPress={()=>onPdf(r.projectId,false)}/><ClientAction title="Download PDF" disabled={!!pdfBusy} onPress={()=>onPdf(r.projectId,true)}/><ClientAction title="Add Report Remark" onPress={()=>onRemark(r.projectId)}/></View>
      </View>
    </View>)}
    {!shown.length&&<Empty title={available.length?'No matching reports':'No reports available'} message={available.length?'Clear the filters or try a different search.':'Reports for your assigned projects will appear here.'}/>}
  </>;
}

export function ClientNotificationsContent({notices,projects,readIds,onNotice,onMarkRead,onReadAll,onRefresh,refreshing}: {
  notices:ClientNotice[];projects:ClientProject[];readIds:Set<string>;onNotice:(notice:ClientNotice)=>void;onMarkRead:(id:string)=>void;onReadAll:()=>void;onRefresh:()=>void;refreshing:boolean;
}) {
  const {c}=useClientOverviewStyle();const [query,setQuery]=useState(''),[project,setProject]=useState(''),[filter,setFilter]=useState<'all'|'unread'|'read'>('all');
  const names=new Map(projects.map(p=>[p.projectId,p.projectName]));
  const available=notices.filter(n=>names.has(n.projectId));const unread=available.filter(n=>!readIds.has(n.id)).length;
  const term=query.trim().toLowerCase();
  const shown=available.filter(n=>(!project||n.projectId===project)&&(filter==='all'||(filter==='read')===readIds.has(n.id))&&`${n.title} ${n.message} ${names.get(n.projectId)}`.toLowerCase().includes(term)).sort((a,b)=>(Date.parse(b.time)||0)-(Date.parse(a.time)||0));
  return <>
    <View style={s.metrics}><Metric title="Total Updates" value={available.length} color={c.cyan}/><Metric title="Unread" value={unread} color={c.amber}/><Metric title="Read" value={available.length-unread} color={c.success}/></View>
    <View style={s.toolbar}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}>♧ Project Notifications ({shown.length})</Text><View style={s.actions}><ClientAction title="Mark all read" onPress={onReadAll} disabled={!unread}/><ClientAction title={refreshing?'Refreshing…':'↻ Refresh'} onPress={onRefresh} disabled={refreshing}/></View></View>
    <View style={[s.filters,{backgroundColor:c.card,borderColor:c.border}]}><TextInput accessibilityLabel="Search client notifications" placeholder="Search updates, messages or projects…" value={query} onChangeText={setQuery} placeholderTextColor={c.secondary} style={[s.search,{color:c.text,borderColor:c.border,backgroundColor:c.bg}]}/>
      <View style={s.picker}><ProjectPicker projects={projects} value={project} onChange={setProject}/></View><ClientAction title="Clear Filters" onPress={()=>{setQuery('');setProject('');setFilter('all');}}/>
    </View>
    <View style={s.actions}>{(['all','unread','read'] as const).map(value=><TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={`${value[0].toUpperCase()+value.slice(1)} notifications`} accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)}
      style={[s.tab,{borderColor:filter===value?c.cyan:c.border,backgroundColor:filter===value?c.elevated:c.card}]}><Text style={{color:filter===value?c.cyan:c.text,fontWeight:'700'}}>{value[0].toUpperCase()+value.slice(1)} {value==='all'?available.length:value==='unread'?unread:available.length-unread}</Text></TouchableOpacity>)}</View>
    {shown.map(n=>{const read=readIds.has(n.id);return <View key={n.id} style={[s.notification,{borderColor:read?c.border:c.cyan,backgroundColor:c.card}]}>
      <View style={[s.noticeIcon,{backgroundColor:c.elevated}]}><Text style={{color:read?c.secondary:c.cyan,fontSize:24}}>{read?'✓':'♧'}</Text></View>
      <View style={{flex:1,minWidth:0,gap:9}}><View style={s.toolbar}><Text style={{color:c.text,fontWeight:'800',fontSize:17,flex:1,minWidth:0}}>{n.title}</Text><Text style={{color:read?c.secondary:c.cyan,fontSize:12,fontWeight:'700'}}>{read?'Read':'● Unread'}</Text></View>
        <Text style={{color:c.text,fontSize:14,lineHeight:22}}>{n.message}</Text><View style={s.actions}><Text style={{color:c.cyan,fontSize:12}}>{names.get(n.projectId)}</Text><Text style={{color:c.secondary,fontSize:12}}>{Number.isFinite(Date.parse(n.time))?new Date(n.time).toLocaleString():'Date unavailable'}</Text></View>
        <View style={s.actions}><ClientAction title="Open Project" onPress={()=>onNotice(n)}/>{!read&&<ClientAction title="Mark as read" onPress={()=>onMarkRead(n.id)}/>}</View>
      </View>
    </View>;})}
    {!shown.length&&<Empty title={available.length?'No matching notifications':'No notifications yet'} message={available.length?'Change the read filter or clear your search to see other updates.':'Updates for your assigned projects will appear here.'}/>}
  </>;
}

const s=StyleSheet.create({hero:{minHeight:158,padding:24,borderWidth:1,borderRadius:16,overflow:'hidden',backgroundColor:'#03192C',flexDirection:'row',gap:12},heroImage:{position:'absolute',right:0,top:0,width:'64%',height:'100%'},eyebrow:{color:'#00D9EE',fontSize:11,fontWeight:'800',letterSpacing:1.2},title:{color:'#F5FAFF',fontSize:34,fontWeight:'900'},subtitle:{color:'#EDF7FF',fontSize:15,lineHeight:23,maxWidth:730},metrics:{flexDirection:'row',flexWrap:'wrap',gap:14},metric:{flex:1,flexBasis:180,padding:18,borderWidth:1,borderRadius:12,gap:7,minWidth:0},toolbar:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12},heading:{fontSize:20,fontWeight:'800'},filters:{flexDirection:'row',flexWrap:'wrap',gap:12,padding:14,borderWidth:1,borderRadius:12,alignItems:'center'},search:{flexGrow:2,flexShrink:1,flexBasis:340,minWidth:0,minHeight:46,padding:12,borderWidth:1,borderRadius:8,fontSize:14},picker:{flexGrow:1,flexBasis:200,minWidth:0},actions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},report:{borderWidth:1,borderRadius:14,padding:20,flexDirection:'row',flexWrap:'wrap',gap:18,minWidth:0},fileIcon:{width:62,height:76,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center',gap:5},fields:{flexDirection:'row',flexWrap:'wrap',gap:14},field:{flexGrow:1,flexBasis:180,minWidth:0,gap:5},empty:{padding:28,minHeight:180,gap:14,alignItems:'center',justifyContent:'center'},notification:{flexDirection:'row',gap:14,padding:20,borderWidth:1,borderRadius:14,minWidth:0},noticeIcon:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},tab:{minHeight:44,paddingHorizontal:18,paddingVertical:12,borderWidth:1,borderRadius:22}});
