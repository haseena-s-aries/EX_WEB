import React, {useEffect, useState} from 'react';
import {ActivityIndicator,Image,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ClientProject} from '../api/clientDashboard';
import {DashboardLayout,DashboardStatusBadge} from './DashboardPresentation';
import {ClientAction,useClientOverviewStyle} from './ClientOverview';
import SearchableOptionPicker from './SearchableOptionPicker';
import HaerGrid from './HaerGrid';
import AuthenticatedImage from './AuthenticatedImage';
import HazardousAreaPlanViewer from './HazardousAreaPlanViewer';
import {useThemeMode} from '../theme/useThemeMode';
import {clientDefectRows,ClientDefectRow} from './clientDefectRows';
import {projectDisplay} from '../utils/projectDisplay';
const OFFSHORE=require('../assets/landing/industry-3.jpg');
const human=(v:string)=>v.replace(/([a-z])([A-Z])/g,'$1 $2');
const columns=[['Action No',130],['Date',115],['Project Name',180],['Item #',110],['Equipment Description',190],['Area',140],['Fault Cat.',90],['Fault Code',105],['Observation',230],['Recommendation',230],['Status',170],['Actions',115]].map(([label,width])=>({label:String(label),width:Number(width)}));

export function ClientDefectsLayout({children,accessory,onRefresh,refreshing,loading,error}:React.ComponentProps<typeof DashboardLayout>) {
  const {c}=useClientOverviewStyle();
  return <ScrollView nativeID="ex-client-defects" style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:20,gap:18,paddingBottom:36}} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.cyan}/>}>
    <View style={[s.hero,{borderColor:c.border}]}><Image accessible={false} source={OFFSHORE} resizeMode="cover" style={s.heroImage}/><View pointerEvents="none" nativeID="ex-client-defects-shade" style={[StyleSheet.absoluteFill,{backgroundColor:'#03192CA8'}]}/>
      <View style={{flex:1,minWidth:0,gap:10}}><Text style={s.eyebrow}>CLIENT PORTAL   /   DEFECT MONITORING</Text><Text accessibilityRole="header" style={s.title}>Defect <Text style={{color:'#00D9EE'}}>Register</Text></Text><Text style={s.subtitle}>Monitor equipment defects, inspection findings, corrective actions, and rectification progress.</Text></View>{accessory}
    </View>
    {loading?<View style={s.empty}><ActivityIndicator color={c.cyan}/><Text style={{color:c.text}}>Loading authorized defects…</Text></View>:error?<View style={s.empty}><Text style={{color:c.text,fontSize:18,fontWeight:'800'}}>{error.startsWith('Access denied')?'Access denied':'Unable to load defects'}</Text><Text accessibilityRole="alert" style={{color:c.critical,fontSize:17}}>{error}</Text><ClientAction title="Retry loading defects" onPress={onRefresh}/></View>:children}
  </ScrollView>;
}

export default function ClientDefects({projects,legacy,activities,activityError,onRefresh,refreshing,renderLegacy,renderActivity}:{
  projects:ClientProject[];legacy:any[];activities:any[];activityError:string;onRefresh:()=>void;refreshing:boolean;renderLegacy:(r:any)=>React.ReactNode;renderActivity:(r:any)=>React.ReactNode;
}) {
  const {c}=useClientOverviewStyle();const dark=useThemeMode()==='dark';
  const [project,setProject]=useState(''),[area,setArea]=useState(''),[status,setStatus]=useState(''),[category,setCategory]=useState(''),[query,setQuery]=useState(''),[overdue,setOverdue]=useState(false),[page,setPage]=useState(1),[size,setSize]=useState(10),[selected,setSelected]=useState<string|null>(null),[evidence,setEvidence]=useState<{path:string;fileName?:string}|null>(null);
  const all=clientDefectRows(projects,legacy,activities);
  const scoped=all.filter(r=>!project||r.projectId===project);
  const term=query.trim().toLowerCase();
  const filtered=scoped.filter(r=>(!area||r.area===area)&&(!status||r.status===status)&&(!category||r.category===category)&&(!overdue||r.overdue)&&`${r.item} ${r.tag} ${r.description} ${r.code} ${r.observation} ${r.projectName}`.toLowerCase().includes(term));
  const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.min(page,pages),shown=filtered.slice((current-1)*size,current*size);
  const active=all.find(r=>r.id===selected);
  useEffect(()=>{setPage(1);},[project,area,status,category,query,overdue,size]);
  useEffect(()=>{if(project&&!projects.some(p=>p.projectId===project)){setProject('');setSelected(null);}},[projects,project]);
  const clear=()=>{setArea('');setStatus('');setCategory('');setQuery('');setOverdue(false);};
  const text=(value:unknown)=><Text style={{color:c.text,fontSize:13,lineHeight:20}}>{value===null||value===undefined||value===''?'—':String(value)}</Text>;
  const picker=(label:string,value:string,options:{value:string;label:string}[],change:(value:string)=>void)=><View style={s.filter}><SearchableOptionPicker label={label} placeholder={`All ${label.toLowerCase()}`} value={value} options={[{value:'',label:`All ${label.toLowerCase()}`},...options]} onChange={change} dark={dark}/></View>;
  const metric=(title:string,count:number,color:string)=><View key={title} style={[s.metric,{borderColor:color+'77',backgroundColor:c.card}]}><Text style={{color:c.text,fontSize:13}}>{title}</Text><Text style={{color,fontSize:27,fontWeight:'800'}}>{count}</Text></View>;
  if(active) {
    const r=active.raw;
    const photoRows=active.source==='activity' ? r.photos||[] : [...r.beforePhotos||[],...r.afterPhotos||[]];
    return <>
      <View style={s.toolbar}><ClientAction title="← Back to Defect Register" onPress={()=>setSelected(null)}/><DashboardStatusBadge status={human(active.status)}/></View>
      <View style={[s.panel,{borderColor:c.border,backgroundColor:c.card}]}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}>Defect Details</Text><View style={s.fields}>
        {([['Project Name',projectDisplay(active.projectName)],['Action Number',active.action],['Date',active.date],['Item Number',active.item],['Equipment Description',active.description],['Ex-Tag',active.tag],['AOSD ID',r.aosdId],['Area',projectDisplay(active.area)],['Inspection Type',r.grade||r.failedGrades],['Fault Category',active.category],['Fault Code',active.code],['Observation',active.observation],['Recommendation',active.recommendation],['Status',human(active.status)],['Remarks',r.remarks||r.registerRemarks],['Additional Remarks',r.additionalRemarks||r.followUpRemarks]] as [string,unknown][]).map(([label,value])=><View key={label} style={s.detailField}><Text style={{color:c.secondary,fontSize:12}}>{label}</Text>{text(value)}</View>)}
      </View></View>
      <View style={[s.panel,{borderColor:c.border,backgroundColor:c.card}]}><Text style={[s.heading,{color:c.text}]}>Recorded Photos / Documents</Text><View style={s.fields}>{photoRows.map((p:any,i:number)=><View key={p.id||i} style={{gap:8}}><AuthenticatedImage path={p.url||p.downloadUrl} fileName={p.fileName} style={{width:160,height:120}} resizeMode="contain"/><ClientAction title={`View evidence ${i+1}`} onPress={()=>setEvidence({path:p.url||p.downloadUrl,fileName:p.fileName})}/>{text(p.fileName)}</View>)}{!photoRows.length&&text('No photos recorded.')}</View></View>
      {active.source==='activity'?renderActivity(r):renderLegacy(r)}
      {evidence&&<HazardousAreaPlanViewer title="Defect evidence" path={evidence.path} fileName={evidence.fileName} onClose={()=>setEvidence(null)}/>}
    </>;
  }
  return <>
    {!!activityError&&<View style={[s.panel,{borderColor:c.amber,backgroundColor:c.card}]}><Text accessibilityRole="alert" style={{color:c.amber}}>{activityError}</Text><Text style={{color:c.secondary}}>The list and counts may be incomplete until all sources load.</Text><ClientAction title="Retry defect sources" onPress={onRefresh} disabled={refreshing}/></View>}
    <View style={s.summary}><View style={{flexGrow:1,flexBasis:260,gap:6,minWidth:0}}><Text style={{color:c.text,fontWeight:'700'}}>Project</Text><SearchableOptionPicker label="Defect project" placeholder="All Projects" value={project} dark={dark}
      options={[{value:'',label:'All Projects'},...projects.map(p=>({value:p.projectId,label:`${projectDisplay(p.projectName)} · ${projectDisplay(p.jobNumber)}`}))]} onChange={value=>{setProject(value);clear();}}/></View>
      {metric('Total Defects',scoped.length,c.cyan)}{metric('Open Defects',scoped.filter(r=>!r.closed&&!r.inProgress).length,c.cyan)}{metric('In Progress',scoped.filter(r=>r.inProgress).length,c.amber)}{metric('Closed Defects',scoped.filter(r=>r.closed).length,c.success)}{metric('Overdue Defects',scoped.filter(r=>r.overdue).length,c.critical)}
    </View>
    <View style={[s.filters,{borderColor:c.border,backgroundColor:c.card}]}>
      <TextInput accessibilityLabel="Search client defects" placeholder="Search item, Ex-Tag, equipment or fault code…" placeholderTextColor={c.secondary} value={query} onChangeText={setQuery} style={[s.search,{color:c.text,borderColor:c.border,backgroundColor:c.bg}]}/>
      {picker('Areas',area,[...new Set(scoped.map(r=>r.area).filter(Boolean))].map(value=>({value,label:value})),setArea)}
      {picker('Statuses',status,[...new Set(scoped.map(r=>r.status).filter(Boolean))].map(value=>({value,label:human(value)})),setStatus)}
      {picker('Fault Categories',category,[...new Set(scoped.map(r=>r.category).filter(Boolean))].map(value=>({value,label:value})),setCategory)}
      <ClientAction title={overdue?'✓ Overdue Only':'Overdue Only'} onPress={()=>setOverdue(v=>!v)}/><ClientAction title="Clear Filters" onPress={clear}/><ClientAction title={refreshing?'Refreshing…':'↻ Refresh'} disabled={refreshing} onPress={onRefresh}/>
    </View>
    <View style={[s.panel,{borderColor:c.border,backgroundColor:c.card}]}><Text accessibilityRole="header" style={[s.heading,{color:c.text}]}>⚠ Defect Records ({filtered.length})</Text>
      {filtered.length?<HaerGrid label="Client defect register" colors={c} columns={columns} rows={shown.map(row=>({id:row.id,cells:[text(row.action),text(row.date?row.date.slice(0,10):''),text(row.projectName),text(row.item),text(row.description),text(row.area),text(row.category),text(row.code),text(row.observation),text(row.recommendation),<View style={{gap:8}}><DashboardStatusBadge status={human(row.status)}/>{row.overdue&&<Text style={{color:c.critical}}>Overdue</Text>}</View>,<ClientAction title="View Defect" onPress={()=>setSelected(row.id)}/>]}))}/>:
        <View style={s.empty}><Text style={{color:c.cyan,fontSize:36}}>☷</Text><Text style={{color:c.text,fontSize:17,fontWeight:'700'}}>{activityError?'Unable to load all defects':scoped.length?'No matching defects':'No defects recorded'}</Text><Text style={{color:c.secondary,textAlign:'center'}}>{activityError?'Retry the unavailable source to confirm the complete register.':scoped.length?'Records exist. Clear filters to see them.':project?'No saved defects are recorded for this authorized project.':'No saved defects are recorded for your assigned projects.'}</Text></View>}
      <View style={s.toolbar}><Text style={{color:c.secondary}}>{filtered.length?`Showing ${(current-1)*size+1}–${Math.min(current*size,filtered.length)} of ${filtered.length} records`:'Showing 0 records'}</Text><View style={s.controls}>
        <ClientAction title="Previous" disabled={current<=1} onPress={()=>setPage(current-1)}/><Text style={{color:c.text}}>Page {current} of {pages}</Text><ClientAction title="Next" disabled={current>=pages} onPress={()=>setPage(current+1)}/>
        <View style={{width:140}}><SearchableOptionPicker label="Defects per page" placeholder="10 / page" value={String(size)} options={[6,10,20,50].map(v=>({value:String(v),label:`${v} / page`}))} onChange={v=>setSize(Number(v))} dark={dark}/></View>
      </View></View>
    </View>
  </>;
}
const s=StyleSheet.create({hero:{minHeight:156,padding:24,borderWidth:1,borderRadius:16,overflow:'hidden',backgroundColor:'#03192C',flexDirection:'row',gap:12},heroImage:{position:'absolute',right:0,top:0,width:'64%',height:'100%'},eyebrow:{color:'#00D9EE',fontWeight:'800',fontSize:11,letterSpacing:1.2},title:{color:'#F5FAFF',fontSize:34,fontWeight:'900'},subtitle:{color:'#EDF7FF',fontSize:15,lineHeight:23},summary:{flexDirection:'row',flexWrap:'wrap',gap:12},metric:{flexGrow:1,flexBasis:140,padding:14,gap:5,borderWidth:1,borderRadius:12},filters:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10,padding:14,borderWidth:1,borderRadius:12},search:{flexBasis:300,flexGrow:2,flexShrink:1,minWidth:0,borderWidth:1,borderRadius:8,padding:12,minHeight:44},filter:{flexBasis:150,flexGrow:1,minWidth:0},panel:{borderWidth:1,borderRadius:14,padding:16,gap:16,minWidth:0},heading:{fontSize:19,fontWeight:'800'},empty:{minHeight:160,padding:24,gap:12,alignItems:'center',justifyContent:'center'},toolbar:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12},controls:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},fields:{flexDirection:'row',flexWrap:'wrap',gap:18},detailField:{flexBasis:240,flexGrow:1,minWidth:0,gap:6}});
