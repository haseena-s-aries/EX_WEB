import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import type {ClientProject} from '../api/clientDashboard';
import {getClientRemarks} from '../api/clientDashboard';
import {getApiErrorMessage} from '../api/errors';
import {ClientAction, useClientOverviewStyle} from './ClientOverview';
import {ClientProjectMetrics} from './ClientProjects';
import {DashboardLayout, DashboardStatusBadge} from './DashboardPresentation';
import ReportWorkflowPanel from './ReportWorkflowPanel';
import AuthenticatedImage from './AuthenticatedImage';
import HazardousAreaPlanViewer from './HazardousAreaPlanViewer';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE = require('../assets/landing/industry-3.jpg');
const display = (value:unknown) => value === undefined || value === null || value === '' ? '—' : String(value);
const label = (value:string) => value.replace(/([a-z])([A-Z])/g,'$1 $2');

export function ClientProjectDetailsLayout({children, loading, error, onRefresh, refreshing}: React.ComponentProps<typeof DashboardLayout>) {
  const {c} = useClientOverviewStyle(); const {width} = useWindowDimensions();
  return <ScrollView nativeID="ex-client-project-detail" style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:width < 650 ? 16 : 24,gap:16,paddingBottom:36}}
    refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.cyan} />}>
    {loading ? <View style={s.state}><ActivityIndicator color={c.cyan}/><Text style={{color:c.text}}>Loading project details…</Text></View> : error ?
      <View style={s.state}><Text accessibilityRole="alert" style={{color:c.text}}>{error}</Text><ClientAction title="Try again" onPress={onRefresh}/></View> : children}
  </ScrollView>;
}

function Panel({title,icon,children,action}: {title:string;icon:string;children:React.ReactNode;action?:React.ReactNode}) {
  const {c} = useClientOverviewStyle();
  return <View style={[s.panel,{borderColor:c.border,backgroundColor:c.card}]}><View style={[s.panelTitle,{borderColor:c.border}]}>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:18,fontWeight:'800',flex:1}}><Text style={{color:c.cyan}}>{icon}  </Text>{title}</Text>{action}
  </View>{children}</View>;
}

export default function ClientProjectDetails({detail,defects,userName,remarksVersion,onBack,onRefresh,refreshing,onArea,onRemark,renderDefect}: {
  detail:{project:ClientProject;report:any}; defects:any[]; userName:string;remarksVersion:number;onBack:()=>void;onRefresh:()=>void;refreshing:boolean;
  onArea:(id:string)=>void;onRemark:()=>void;renderDefect:(defect:any)=>React.ReactNode;
}) {
  const {c} = useClientOverviewStyle(); const {width} = useWindowDimensions();
  const columns = width >= 1300 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const stacked = width < 1000;
  const p = detail.project, report = detail.report;
  const company = report.ourCompany;
  const companyLogo = report.ourCompanyLogo?.url || company?.logoUrl;
  const plan = report.hazardousAreaPlan;
  const [viewPlan,setViewPlan] = useState(false);
  const projectDefects = defects.filter(d => d.projectId === p.projectId);
  const fields:Array<[string,unknown]> = [['Job Number',p.jobNumber],['Location',p.location],['Vessel / Site Name',p.vesselOrSiteName],['UID Number',report.uidNumber],
    ['Document Number',report.documentNumber],['Revision',report.revision],['Description',report.description],['Surveyor',p.surveyorName],['Assigned QC',p.assignedQcName],['Project Status',label(p.projectStatus)]];
  const pair = (left:React.ReactNode,right:React.ReactNode) => <View style={[s.pair,stacked && {flexDirection:'column'}]}><View style={s.half}>{left}</View><View style={s.half}>{right}</View></View>;
  return <>
    <View style={[s.hero,{borderColor:c.cyan}]}>
      <Image accessible={false} source={OFFSHORE} resizeMode="cover" style={s.heroImage}/><View nativeID="ex-client-project-detail-shade" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#03192CA8'}]}/>
      <Text style={s.eyebrow}>CLIENT PORTAL   /   PROJECT OVERSIGHT   /   PROJECT DETAILS</Text>
      <Text accessibilityRole="header" style={[s.title,width < 650 && {fontSize:28}]}>{projectDisplay(p.projectName)}</Text>
      <View style={s.heroMetadata}>{[['▣','Job No',projectDisplay(p.jobNumber)],['♧','Vessel / Site',projectDisplay(p.vesselOrSiteName)],['⌖','Location',projectDisplay(p.location)]].map(([icon,title,value]) =>
        <Text key={title} style={s.heroValue}><Text style={{color:'#00D9EE'}}>{icon}  </Text>{title}: {display(value)}</Text>)}</View>
    </View>
    <View style={s.actions}><ClientAction primary title="← Back to My Projects" onPress={onBack}/><ClientAction title={refreshing ? 'Refreshing…' : '↻ Refresh'} disabled={refreshing} onPress={onRefresh}/></View>
    {pair(<ReportWorkflowPanel key={p.projectId} projectId={p.projectId} readOnly compact/>,
      <View style={[s.status,{borderColor:c.border,backgroundColor:c.card}]}><Text style={{color:c.cyan,fontSize:24}}>▱</Text><Text style={{color:c.text,fontWeight:'800',fontSize:16}}>Project Status</Text><DashboardStatusBadge status={label(p.projectStatus)}/></View>)}
    <Panel title="Project Information" icon="ⓘ"><View style={s.information}>
      {fields.map(([title,value]) => <View key={title} style={{flexBasis:columns === 1 ? '100%' : columns === 2 ? '47%' : columns === 3 ? '31%' : '23%',minWidth:0,gap:5}}>
        <Text style={{color:c.secondary,fontSize:12}}>{title}</Text><Text style={{color:c.text,fontSize:14,lineHeight:21,fontWeight:'600',flexShrink:1}}>{display(value)}</Text></View>)}
      <View style={{gap:5}}><Text style={{color:c.secondary,fontSize:12}}>QC Status</Text><DashboardStatusBadge status={label(p.qcStatus)}/></View>
    </View></Panel>
    {pair(<Panel title="Our Company Details" icon="▥"><View style={s.company}>
      {companyLogo ? <AuthenticatedImage path={companyLogo} resizeMode="contain" style={s.logo}/> : <View style={[s.logo,s.placeholder,{backgroundColor:c.elevated}]}><Text style={{color:c.secondary}}>No logo</Text></View>}
      <View style={{flex:1,minWidth:0,gap:8}}><Text style={{color:c.secondary,fontSize:12}}>Company Name</Text><Text style={{color:c.text,fontWeight:'800',fontSize:15}}>{display(company?.displayName || company?.companyName)}</Text>
        {company?.companyName && company.companyName !== company.displayName && <Text style={{color:c.text,fontSize:13}}>{company.companyName}</Text>}
        {([['Email',company?.email],['Address',company?.address],['Telephone',company?.telephone],['Fax',company?.fax],['Website',company?.website]] as const).map(([title,value]) =>
          <Text key={title} style={{color:c.text,fontSize:13,lineHeight:20,flexShrink:1}}><Text style={{color:c.secondary}}>{title}: </Text>{display(value)}</Text>)}
      </View>
    </View></Panel>,<Panel title="Client Company Details" icon="♧"><View style={s.company}>
      {report.clientLogo?.url ? <AuthenticatedImage path={report.clientLogo.url} resizeMode="contain" style={s.logo}/> : <View style={[s.logo,s.placeholder,{backgroundColor:c.elevated}]}><Text style={{color:c.secondary}}>No logo</Text></View>}
      <View style={{flex:1,minWidth:0,gap:10}}><Text style={{color:c.secondary,fontSize:12}}>Client Company Name</Text><Text style={{color:c.text,fontWeight:'800',fontSize:16}}>{display(report.clientName || report.client)}</Text>
        <Text style={{color:c.secondary,fontSize:12}}>Assigned Client</Text><Text style={{color:c.text,fontSize:14}}>{display(report.client)}</Text>
      </View>
    </View></Panel>)}
    <ClientProjectMetrics project={p}/>
    {pair(<Panel title="Hazardous Area Plan" icon="▥">
      {plan?.url ? <View style={s.file}><Text style={{color:c.cyan,fontSize:28}}>▤</Text><View style={{flex:1,minWidth:0,gap:6}}><Text style={{color:c.text,fontWeight:'700'}}>{plan.fileName || 'Project hazardous area plan'}</Text><Text style={{color:c.secondary,fontSize:12}}>{display(plan.contentType)}</Text></View><ClientAction title="View Plan" onPress={() => setViewPlan(true)}/></View> : <Text style={{color:c.secondary}}>No hazardous area plan uploaded.</Text>}
    </Panel>,<Panel title="Project Remarks" icon="☷" action={<ClientAction title="Add Project Remark" primary onPress={onRemark}/>}>
      <SavedProjectRemarks projectId={p.projectId} userName={userName} refreshKey={remarksVersion}/>
    </Panel>)}
    <Panel title={`Project Areas (${report.areas?.length || 0})`} icon="▦"><View style={s.areaGrid}>
      {(report.areas || []).map((area:any) => {
        const equipment = area.equipment || [];
        // Retain the existing Client area completion mapping.
        const inspected = equipment.filter((e:any) => /completed|pendingqcreview|approved/i.test(e.inspectionStatus)).length;
        const complete = equipment.length > 0 && inspected === equipment.length;
        const percentage = equipment.length ? Math.round(inspected/equipment.length*100) : 0;
        return <View key={area.id} style={[s.area,{borderColor:c.border,backgroundColor:c.bg,flexBasis:width >= 1500 ? '48%' : '100%'}]}>
          {area.layout?.url && area.layout.contentType?.startsWith('image/') ? <AuthenticatedImage path={area.layout.url} style={s.areaPhoto} resizeMode="cover"/> : <View style={[s.areaPhoto,s.placeholder,{backgroundColor:c.elevated}]}><Text style={{color:c.secondary}}>Area layout</Text></View>}
          <View style={{flex:1,minWidth:0,gap:10}}><Text style={{color:c.text,fontSize:16,fontWeight:'800'}}>{area.name}</Text><View style={s.areaMetadata}>
            <Text style={{color:c.secondary}}>Total Equipment: <Text style={{color:c.text,fontWeight:'700'}}>{equipment.length}</Text></Text><Text style={{color:c.secondary}}>Inspected: <Text style={{color:c.text,fontWeight:'700'}}>{inspected}</Text></Text>
            <DashboardStatusBadge status={complete ? 'Completed' : equipment.length ? 'In Progress' : 'Not Started'}/>
          </View><Text style={{color:c.secondary,fontSize:12}}>Progress: {percentage}%</Text><View accessibilityRole="progressbar" accessibilityLabel={`${area.name} progress`} accessibilityValue={{min:0,max:100,now:percentage}} style={[s.track,{backgroundColor:c.elevated}]}><View style={{height:'100%',width:`${percentage}%`,backgroundColor:c.success}}/></View></View>
          <ClientAction title="View Area" onPress={() => onArea(area.id)}/>
        </View>;
      })}
      {!report.areas?.length && <Text style={{color:c.secondary}}>No areas added yet.</Text>}
    </View></Panel>
    <Panel title="Project Defects" icon="⚠" action={<View style={s.areaMetadata}><Text style={{color:c.cyan}}>Open: {p.progress.openDefects}</Text><Text style={{color:c.success}}>Closed: {p.progress.closedDefects}</Text></View>}>
      {projectDefects.length ? projectDefects.map(d => <View key={d.id} style={[s.defect,{borderColor:c.border}]}><View style={s.areaMetadata}>
        <Text style={{color:c.text,fontWeight:'800'}}>Item: {display(d.equipmentCode || d.tagNumber)}</Text><Text style={{color:c.secondary}}>Equipment / Type: {display(d.equipmentName || d.type)}</Text><Text style={{color:c.secondary}}>Fault Category: {display(d.faultCategory)}</Text>
      </View>{renderDefect(d)}</View>) : <View style={s.state}><Text style={{fontSize:40,color:c.cyan}}>☷</Text><Text style={{color:c.text,fontWeight:'700'}}>No defects recorded for this project.</Text></View>}
    </Panel>
    {viewPlan && plan?.url && <HazardousAreaPlanViewer title="Hazardous Area Plan" path={plan.url} fileName={plan.fileName} contentType={plan.contentType} onClose={() => setViewPlan(false)}/>}
  </>;
}

function SavedProjectRemarks({projectId,userName,refreshKey}: {projectId:string;userName:string;refreshKey:number}) {
  const {c} = useClientOverviewStyle(); const [items,setItems] = useState<any[]>([]);const [loading,setLoading] = useState(true);const [error,setError] = useState('');const [retry,setRetry] = useState(0);
  useEffect(() => {let active = true;setLoading(true);setError('');getClientRemarks(projectId).then(r => {if(active)setItems(r.data.filter((r:any)=>!r.equipmentId && !r.findingId && !r.againstReport && !r.reportId));}).catch(e=>{if(active)setError(getApiErrorMessage(e,'Could not load project remarks.'));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[projectId,refreshKey,retry]);
  return loading ? <ActivityIndicator color={c.cyan}/> : error ? <View style={{gap:8}}><Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text><ClientAction title="Retry remarks" onPress={()=>setRetry(r=>r+1)}/></View> : <View style={{gap:12}}>
    <Text style={{color:c.secondary,fontSize:12}}>Your project remarks</Text>
    {items.length ? items.map(r=><View key={r.id} style={[s.remark,{borderColor:c.cyan}]}><Text style={{color:c.text,fontSize:14,lineHeight:21}}>{r.remark}</Text><Text style={{color:c.secondary,fontSize:12}}>{r.authorName || userName}{r.createdAt ? ` · ${new Date(r.createdAt).toLocaleString()}` : ''}</Text></View>) : <Text style={{color:c.secondary}}>No project remarks added yet.</Text>}
  </View>;
}
const s=StyleSheet.create({
  hero:{minHeight:142,padding:22,gap:10,borderWidth:1,borderRadius:16,overflow:'hidden',backgroundColor:'#03192C'},heroImage:{position:'absolute',right:0,top:0,width:'62%',height:'100%'},eyebrow:{color:'#00D9EE',fontSize:10,fontWeight:'800',letterSpacing:1},title:{color:'#F5FAFF',fontSize:32,fontWeight:'900'},heroMetadata:{flexDirection:'row',flexWrap:'wrap',gap:20},heroValue:{color:'#EDF7FF',fontSize:13,lineHeight:20},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'space-between'},pair:{flexDirection:'row',gap:16,alignItems:'stretch'},half:{flex:1,minWidth:0},panel:{borderWidth:1,borderRadius:14,padding:16,gap:14,flexGrow:1,minWidth:0},panelTitle:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,borderBottomWidth:1,paddingBottom:10},status:{borderWidth:1,borderRadius:12,padding:14,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:14,flexGrow:1},information:{flexDirection:'row',flexWrap:'wrap',gap:18},company:{flexDirection:'row',flexWrap:'wrap',gap:18,alignItems:'flex-start'},logo:{width:112,height:106,borderRadius:10},placeholder:{alignItems:'center',justifyContent:'center'},file:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center'},areaGrid:{flexDirection:'row',flexWrap:'wrap',gap:14},area:{padding:12,borderWidth:1,borderRadius:12,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:16,minWidth:0,flexShrink:1},areaPhoto:{width:104,height:80,borderRadius:8},areaMetadata:{flexDirection:'row',flexWrap:'wrap',gap:14,alignItems:'center'},track:{height:9,borderRadius:5,overflow:'hidden'},state:{padding:24,gap:14,alignItems:'center',justifyContent:'center',minHeight:110},remark:{paddingLeft:12,borderLeftWidth:3,gap:7},defect:{borderTopWidth:1,paddingTop:12,gap:8},
});
