import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import {visual} from '../theme/visual';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {approveAllocation, approveSampling, configureAllocation, createCampaign, createRecurrence, createWorkPackage, editCampaign, getCampaignAllocation, getCampaignProgress, getCampaigns, getPlanningInspectors, getPlanningProjects, getRecurrences, getSamplingHistory, getWorkPackages, InspectionCampaign, markInspectionTaskInaccessible, previewSampling, reassignInspectionTask, SamplingMethod, saveAnnualList, setCampaignStatus} from '../api/inspectionPlanning';
import {buildInspectorWorkload} from '../planning/workload';

const parseIds = (raw: string) => raw.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');
const day = new Date().toISOString().slice(0, 10);
export default function AdvancedInspectionPlanningScreen({role}: {role: string}) {
  const dark = useThemeMode() === 'dark';
  const c = dark ? OPERATIONS_DARK : LIGHT;
  const [campaigns,setCampaigns]=useState<InspectionCampaign[]>([]);const [projects,setProjects]=useState<any[]>([]);const [inspectors,setInspectors]=useState<any[]>([]);const [selectedId,setSelectedId]=useState('');const [allocation,setAllocation]=useState<any>(null);const [progress,setProgress]=useState<any>(null);const [packages,setPackages]=useState<any[]>([]);const [recurrences,setRecurrences]=useState<any[]>([]);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const [form,setForm]=useState({projectId:'',inspectionLeadUserId:'',name:'',reference:'',startsOn:day,endsOn:day});const [editForm,setEditForm]=useState({name:'',reference:'',startsOn:day,endsOn:day,changeReason:'',inspectionLeadUserId:''});const [rules,setRules]=useState({closePercent:'',detailedPercent:'',minimumDetailedCreditPercent:'',roundingRule:'Nearest' as 'Ceiling'|'Floor'|'Nearest'});const [annual,setAnnual]=useState({year:String(new Date().getFullYear()),ids:'',riskScores:''});const [sampling,setSampling]=useState({method:'Random' as SamplingMethod,seed:String(Date.now()%1000000),justification:'',manualIds:'',listId:''});const [sampleHistory,setSampleHistory]=useState<any[]>([]);const [samplePreview,setSamplePreview]=useState<any>(null);const [recurrenceForm,setRecurrenceForm]=useState({listId:'',grade:'Close' as 'Visual'|'Close'|'Detailed',everyMonths:'12',nextOccurrenceOn:day});const [packageForm,setPackageForm]=useState({reference:'',site:'',area:'',rotation:'',grade:'Close' as 'Visual'|'Close'|'Detailed',ids:'',inspectorId:'',plannedStart:day,plannedEnd:day,priorityCode:'Normal',requiredPermits:'',isolationPrerequisites:'',checklistVersionId:''});const [taskReason,setTaskReason]=useState('');
  const manager=['Admin','Manager'].includes(role);const lead=['Admin','Qc'].includes(role);const selected=campaigns.find(x=>x.id===selectedId);
  const refresh=useCallback(async()=>{setLoading(true);try{const [c,p,u]=await Promise.all([getCampaigns(),getPlanningProjects(),manager?getPlanningInspectors():Promise.resolve({data:[]})]);setCampaigns(c.data);setProjects(p.data);setInspectors(u.data as any[]);}catch(e){setError(getApiErrorMessage(e,'Could not load planning data.'));}finally{setLoading(false);}},[manager]);
  useEffect(()=>{void refresh();},[refresh]);
  const loadSelected=useCallback(async(id:string)=>{if(!id)return;try{const [a,p,w,s,r]=await Promise.all([getCampaignAllocation(id),getCampaignProgress(id),getWorkPackages(id),['Admin','Manager','Qc'].includes(role)?getSamplingHistory(id):Promise.resolve({data:[]}),getRecurrences(id)]);setAllocation(a.data);setProgress(p.data);setPackages(w.data);setSampleHistory(s.data);setRecurrences(r.data);if(a.data.closePercent!=null)setRules({closePercent:String(a.data.closePercent),detailedPercent:String(a.data.detailedPercent),minimumDetailedCreditPercent:String(a.data.minimumDetailedCreditPercent),roundingRule:a.data.roundingRule});}catch(e){setError(getApiErrorMessage(e,'Could not load campaign details.'));}},[role]);
  useEffect(()=>{void loadSelected(selectedId);},[selectedId,loadSelected]);
  useEffect(()=>{if(selected)setEditForm({name:selected.name,reference:selected.reference,startsOn:selected.startsOn,endsOn:selected.endsOn,changeReason:'',inspectionLeadUserId:selected.inspectionLeadUserId||''});},[selectedId,campaigns]);
  const act=async(fn:()=>Promise<any>,ok:string)=>{setBusy(true);setError('');setMessage('');try{await fn();setMessage(ok);await refresh();if(selectedId)await loadSelected(selectedId);}catch(e){setError(getApiErrorMessage(e,'Planning action failed.'));}finally{setBusy(false);}};
  const field=(label:string,value:string,onChange:(v:string)=>void,placeholder?:string,multiline=false)=>(
    <TextInput accessibilityLabel={label} placeholder={placeholder||label} placeholderTextColor={c.muted}
      value={value} onChangeText={onChange} multiline={multiline}
      style={[styles.field,{color:c.text,borderColor:c.border,backgroundColor:c.elevated,minHeight:multiline?78:42,
        textAlignVertical:multiline?'top':'center'}]} />
  );
  const button=(label:string,onPress:()=>void,disabled=false,primary=false,selected=false)=>(
    <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{disabled,selected}} disabled={disabled}
      onPress={onPress} style={[styles.button,{borderColor:selected?c.cyan:c.border,
        backgroundColor:primary?'#00D9EE':selected?c.border:c.elevated,opacity:disabled?.5:1}]}>
      <Text style={{color:primary?'#03192C':c.text,fontWeight:'800'}}>{label}</Text>
    </TouchableOpacity>
  );
  const card=[styles.card,{backgroundColor:c.card,borderColor:c.border}];
  const panelTitle=(title:string)=>(
    <View style={styles.panelTitle}>
      <Text accessible={false} style={[styles.panelIcon,{color:c.cyan,backgroundColor:c.elevated}]}>{'\u25A6'}</Text>
      <Text accessibilityRole="header" style={[styles.heading,{color:c.text}]}>{title}</Text>
    </View>
  );
  const annualLists=allocation?.annual||[];
  const create=()=>act(()=>createCampaign({...form}), 'Campaign created. Add annual equipment lists and configure the allocation rules.');
  const saveCampaign=()=>act(()=>editCampaign(selectedId,editForm),'Campaign planning revision saved. Previous approvals were invalidated.');
  const saveRules=()=>act(()=>configureAllocation(selectedId,{closePercent:Number(rules.closePercent),detailedPercent:Number(rules.detailedPercent),minimumDetailedCreditPercent:Number(rules.minimumDetailedCreditPercent),roundingRule:rules.roundingRule}),'Allocation rules saved.');
  const addAnnual=()=>act(()=>saveAnnualList(selectedId,Number(annual.year),parseIds(annual.ids),annual.riskScores?JSON.parse(annual.riskScores):undefined),'Annual equipment list added.');
  const doSample=async()=>{if(!sampling.listId)return;await act(async()=>{const response=await previewSampling(selectedId,sampling.listId,{method:sampling.method,ruleVersion:1,randomSeed:sampling.method==='Random'?Number(sampling.seed):undefined,justification:sampling.justification||undefined,selectedEquipmentIds:sampling.method==='Manual'?parseIds(sampling.manualIds):undefined});setSamplePreview(response.data);},'Sampling preview created. Review the equipment list before approval.');};
  const approveSample=(id:string)=>act(()=>approveSampling(id,'Approved by Inspection Lead'),'Sampling selection approved and frozen.');
  const addRecurrence=()=>act(()=>createRecurrence(selectedId,{annualListId:recurrenceForm.listId,grade:recurrenceForm.grade,everyMonths:Number(recurrenceForm.everyMonths),nextOccurrenceOn:recurrenceForm.nextOccurrenceOn}),'Recurring schedule saved. Future tasks still require approved campaign allocation and package generation.');
  const buildPackage=()=>act(()=>createWorkPackage(selectedId,{reference:packageForm.reference,site:packageForm.site,area:packageForm.area||undefined,rotation:packageForm.rotation||undefined,plannedStart:packageForm.plannedStart,plannedEnd:packageForm.plannedEnd,equipment:parseIds(packageForm.ids).map((equipmentId,i)=>({equipmentId,grade:packageForm.grade,assignedUserId:packageForm.inspectorId||undefined,routeOrder:i+1,priorityCode:packageForm.priorityCode,requiredPermits:packageForm.requiredPermits||undefined,isolationPrerequisites:packageForm.isolationPrerequisites||undefined,checklistVersionId:packageForm.checklistVersionId||undefined,scheduledAt:packageForm.plannedStart?`${packageForm.plannedStart}T00:00:00Z`:undefined,dueAt:packageForm.plannedEnd?`${packageForm.plannedEnd}T23:59:59Z`:undefined}))}),'Work package created and tasks assigned.');
  const reassign=(taskId:string)=>{if(!packageForm.inspectorId)return;void act(()=>reassignInspectionTask(taskId,packageForm.inspectorId,taskReason||'Planning reassignment'),'Inspector reassigned.');};
  const carryForward=(taskId:string)=>{if(!taskReason.trim())return;void act(()=>markInspectionTaskInaccessible(taskId,taskReason),'Task recorded as inaccessible and carried forward.');};
  const totals=useMemo(()=>({equipment:progress?.totalEquipment??0,planned:progress?.planned??0,completed:progress?.completed??0,submitted:progress?.submitted??0,approved:progress?.qcApproved??0,pending:progress?.pending??0,overdue:progress?.overdue??0,inaccessible:progress?.inaccessible??0}),[progress]);
  const workload=useMemo(()=>buildInspectorWorkload(packages,inspectors),[packages,inspectors]);
  return <ScrollView nativeID="ex-planning" style={{flex:1,backgroundColor:c.bg}}
    contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <View nativeID="ex-planning-hero" style={styles.hero}>
      <Image source={OFFSHORE_ART} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
      <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
        style={[StyleSheet.absoluteFill,Platform.OS!=='web'&&styles.nativeOverlay]} />
      <Text style={styles.eyebrow}>OPERATIONS  /  CAMPAIGNS</Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>
        Inspection planning &amp; <Text style={styles.accent}>campaign progress</Text>
      </Text>
      <Text style={styles.heroDescription}>Plan equipment lists, review grade allocation, freeze detailed samples and build inspector work packages.</Text>
    </View>
    {!!error&&<Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
    {!!message&&<Text accessibilityLiveRegion="polite" style={{color:c.success}}>{message}</Text>}
    {loading&&<ActivityIndicator color={c.cyan} accessibilityLabel="Loading planning data"/>}
    {manager&&<View nativeID="ex-planning-create" style={card}>
      {panelTitle('Create campaign')}
      <Text style={{color:c.secondary}}>Project · client and site follow the existing project record</Text>
      <View style={styles.row}>{projects.map(p=><React.Fragment key={p.id}>
        {button(`${p.projectName} · ${p.clientName||'Client company not specified'} · ${p.vesselOrSiteName}`,
          ()=>setForm(x=>({...x,projectId:p.id,inspectionLeadUserId:p.assignedQcId||''})),false,false,form.projectId===p.id)}
      </React.Fragment>)}</View>
      <Text style={{color:c.text,fontWeight:'700'}}>Inspection Lead · active approved QC user</Text>
      <View style={styles.row}>{inspectors.filter(u=>String(u.role).toLowerCase()==='qc').map(u=><React.Fragment key={u.id}>
        {button(u.displayName,()=>setForm(x=>({...x,inspectionLeadUserId:u.id})),false,false,form.inspectionLeadUserId===u.id)}
      </React.Fragment>)}</View>
      <View style={styles.row}>
        {field('Campaign name',form.name,v=>setForm(x=>({...x,name:v})))}
        {field('Campaign reference',form.reference,v=>setForm(x=>({...x,reference:v})))}
        {field('Start date',form.startsOn,v=>setForm(x=>({...x,startsOn:v})))}
        {field('End date',form.endsOn,v=>setForm(x=>({...x,endsOn:v})))}
      </View>
      {button('Create campaign',create,busy||!form.projectId||!form.name||!form.reference||!form.inspectionLeadUserId,true)}
    </View>}
    <View nativeID="ex-planning-campaigns" style={card}>
      {panelTitle('Campaigns')}
      <View style={styles.row}>{campaigns.map(campaign=>(
        <TouchableOpacity key={campaign.id} accessibilityRole="button" accessibilityState={{selected:campaign.id===selectedId}}
          onPress={()=>{setSelectedId(campaign.id);setMessage('');setError('');}}
          style={[styles.campaign,{backgroundColor:c.elevated,borderColor:campaign.id===selectedId?c.cyan:c.border}]}>
          <Text style={{color:c.text,fontWeight:'800'}}>{campaign.name} · {campaign.reference}</Text>
          <Text style={{color:c.secondary}}>{campaign.projectName} · {campaign.site} · {campaign.status}</Text>
        </TouchableOpacity>
      ))}
      {campaigns.length===0&&!loading&&<Text style={{color:c.secondary}}>
        {manager?'No campaigns yet. Admins and Managers can create one above.':'No campaigns are available to your account.'}
      </Text>}</View>
    </View>
    {selected&&<>
      {manager&&<View style={card}><Text style={{fontSize:17,fontWeight:'800',color:c.text}}>Campaign details & revision</Text><Text style={{fontWeight:'700',color:c.text}}>Inspection Lead</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{inspectors.filter(u=>String(u.role).toLowerCase()==='qc').map(u=><React.Fragment key={u.id}>{button(`${editForm.inspectionLeadUserId===u.id?'✓ ':''}${u.displayName}`,()=>setEditForm(x=>({...x,inspectionLeadUserId:u.id})))}</React.Fragment>)}</View><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{field('Campaign name',editForm.name,v=>setEditForm(x=>({...x,name:v})))}{field('Reference',editForm.reference,v=>setEditForm(x=>({...x,reference:v})))}{field('Start date',editForm.startsOn,v=>setEditForm(x=>({...x,startsOn:v})))}{field('End date',editForm.endsOn,v=>setEditForm(x=>({...x,endsOn:v})))}{field('Revision reason',editForm.changeReason,v=>setEditForm(x=>({...x,changeReason:v})))}</View>{button('Save planning revision',saveCampaign,busy||!editForm.changeReason||!editForm.inspectionLeadUserId)}<Text style={{fontWeight:'700',color:c.text}}>Campaign status · every change is audited</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(['Planned','InProgress','OnHold','Completed','Archived'] as const).map(s=>button(`Set ${s}`,()=>act(()=>setCampaignStatus(selected.id,s,'Updated from planning screen'),`Campaign status changed to ${s}.`),busy||selected.status===s))}</View></View>}
      <View style={card}><Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Annual allocation · {selected.name}</Text><Text style={{color:c.secondary}}>Enter the approved client rules. Rounding choice is explicit; KAS3 figures are not automatically populated.</Text>{manager&&<><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{field('Close %',rules.closePercent,v=>setRules(x=>({...x,closePercent:v})))}{field('Detailed %',rules.detailedPercent,v=>setRules(x=>({...x,detailedPercent:v})))}{field('Minimum detailed credit %',rules.minimumDetailedCreditPercent,v=>setRules(x=>({...x,minimumDetailedCreditPercent:v})))}</View><View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}><Text style={{color:c.text}}>Rounding rule:</Text>{(['Ceiling','Floor','Nearest'] as const).map(v=>button(`${rules.roundingRule===v?'✓ ':''}${v}`,()=>setRules(x=>({...x,roundingRule:v}))))}{button('Save allocation rules',saveRules,busy||!selectedId)}</View></>}
        <Text style={{fontWeight:'700',color:c.text}}>Add annual list. Paste the existing equipment IDs from the project register.</Text>{manager&&<><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{field('Year',annual.year,v=>setAnnual(x=>({...x,year:v})))}{field('Equipment IDs (comma, space or line separated)',annual.ids,v=>setAnnual(x=>({...x,ids:v})),undefined,true)}{field('Optional risk scores JSON keyed by equipment ID',annual.riskScores,v=>setAnnual(x=>({...x,riskScores:v})),undefined,true)}{button('Add annual list',addAnnual,busy||!annual.ids)}</View></>}
        {lead&&annualLists.length>0&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{button('Approve allocation',()=>act(()=>approveAllocation(selectedId,'Approved by Inspection Lead'),'Allocation approved.'),busy||selected.allocationApproved)}</View>}
        {annualLists.map((x:any)=><View key={x.id} style={{padding:10,backgroundColor:c.elevated,borderRadius:7}}><Text style={{fontWeight:'700',color:c.text}}>{x.year} · {x.equipmentCount} equipment · Planned Close {x.plannedCloseCount??'—'} · Detailed {x.plannedDetailedCount??'—'} · Actual Close {progress?.annual?.find((a:any)=>a.year===x.year)?.closeCompleted??0} · Detailed {progress?.annual?.find((a:any)=>a.year===x.year)?.detailedCompleted??0}</Text><Text style={{color:c.secondary}}>Detailed credit: {progress?.annual?.find((a:any)=>a.year===x.year)?.detailedCreditAchievedPercent??0}% achieved. Counts use unique equipment with completed activities.</Text></View>)}
      </View>
      {annualLists.length>0&&<View style={card}>
        <Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Detailed inspection sampling</Text>
        <Text style={{color:c.secondary}}>Risk sampling requires a score for every item. Manual selection requires a reason. Approval freezes the chosen equipment IDs.</Text>
        {manager&&<>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{annualLists.map((x:any)=><React.Fragment key={x.id}>{button(`${sampling.listId===x.id?'✓ ':''}${x.year} · ${x.equipmentCount} equipment`,()=>setSampling(s=>({...s,listId:x.id})))}</React.Fragment>)}</View>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {(['Random','RiskBased','EquipmentType','Manual'] as SamplingMethod[]).map(v=><React.Fragment key={v}>{button(`${sampling.method===v?'✓ ':''}${v}`,()=>setSampling(x=>({...x,method:v})))}</React.Fragment>)}
            {sampling.method==='Random'&&field('Recorded random seed',sampling.seed,v=>setSampling(x=>({...x,seed:v})))}
            {sampling.method==='Manual'&&<>{field('Justification',sampling.justification,v=>setSampling(x=>({...x,justification:v})))}{field('Selected equipment IDs',sampling.manualIds,v=>setSampling(x=>({...x,manualIds:v})),undefined,true)}</>}
            {button('Create sampling preview',()=>void doSample(),busy||!sampling.listId||!manager)}
          </View>
          {samplePreview&&<View style={{padding:10,backgroundColor:c.elevated,borderRadius:7,gap:5}}><Text style={{fontWeight:'700',color:c.text}}>Preview · campaign revision {samplePreview.campaignRevision} · {samplePreview.method} · sampling rule v{samplePreview.ruleVersion} · {samplePreview.equipmentIds?.length||0} selected</Text><Text selectable style={{color:c.text}}>{(samplePreview.equipmentIds||[]).join(', ')}</Text>{lead&&button('Approve and freeze this sample',()=>approveSample(samplePreview.id),busy)}</View>}
          {sampleHistory.filter(x=>!x.isFrozen).map(x=><View key={x.id} style={{padding:10,backgroundColor:c.elevated,borderRadius:7,gap:5}}><Text style={{fontWeight:'700',color:c.text}}>Pending review · campaign revision {x.campaignRevision} · {x.method} · sampling rule v{x.ruleVersion} · {x.selectedEquipmentIdsJson?JSON.parse(x.selectedEquipmentIdsJson).length:0} selected</Text><Text selectable style={{color:c.text}}>{x.selectedEquipmentIdsJson?JSON.parse(x.selectedEquipmentIdsJson).join(', '):''}</Text>{lead&&button('Approve and freeze',()=>approveSample(x.id),busy)}</View>)}
          {sampleHistory.filter(x=>x.isFrozen).map(x=><View key={x.id} style={{padding:10,backgroundColor:c.elevated,borderRadius:7,gap:5}}><Text style={{fontWeight:'700',color:c.text}}>Frozen · campaign revision {x.campaignRevision} · {x.method} · approved {x.approvedAt||'—'} · {x.selectedEquipmentIdsJson?JSON.parse(x.selectedEquipmentIdsJson).length:0} selected</Text></View>)}
        </>}
      </View>}
      {manager&&selectedId&&<View style={card}>
        <Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Inspector workload & schedule</Text>
        <Text style={{color:c.secondary}}>Counts come from this campaign’s assigned tasks. Completed means task status only; it is not QC acceptance or equipment compliance.</Text>
        {workload.inspectors.map(x=><View key={x.userId} accessibilityLabel={`Workload ${x.name}`} style={{padding:10,backgroundColor:c.elevated,borderRadius:7}}><Text style={{fontWeight:'700',color:c.text}}>{x.name}</Text><Text style={{color:c.text}}>{x.open} open · {x.overdue} overdue · {x.inaccessible} inaccessible · {x.completed} completed · {x.total} total tasks</Text></View>)}
        {!workload.inspectors.length&&<Text style={{color:c.secondary}}>No tasks are assigned in this campaign yet.</Text>}
        <Text style={{fontWeight:'700',color:c.text}}>Planned inspection agenda</Text>
        {workload.agenda.slice(0,50).map(task=><View key={task.id} accessibilityLabel={`Scheduled task ${task.id}`} style={{padding:10,backgroundColor:c.elevated,borderRadius:7}}>
          <Text style={{fontWeight:'700',color:c.text}}>{task.scheduledAt?new Date(task.scheduledAt).toLocaleString():'Date not set'} · {task.packageReference} · {task.plannedGrade||'Grade not set'}</Text>
          <Text style={{color:c.text}}>{task.site||'Site not set'}{task.area?` / ${task.area}`:''} · Equipment {task.areaEquipmentId||'—'} · {task.inspectorName}</Text>
          <Text style={{color:c.text}}>Due {task.dueAt?new Date(task.dueAt).toLocaleString():'Not set'} · {task.isInaccessible?'Inaccessible / carry forward':task.overdue?'Overdue':task.statusCode||'Planned'}</Text>
        </View>)}
        {workload.agenda.length>50&&<Text style={{color:c.secondary}}>Showing the first 50 scheduled tasks. Narrow the campaign or work package to review the rest.</Text>}
      </View>}
      <View style={card}>
        <Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Recurring inspection schedules</Text>
        <Text style={{color:c.secondary}}>Set future contract intervals. A schedule does not silently create tasks; each occurrence still goes through campaign allocation and work package review.</Text>
        {manager&&<>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{annualLists.map((x:any)=><TouchableOpacity key={x.id} accessibilityRole="button" onPress={()=>setRecurrenceForm(s=>({...s,listId:x.id}))} style={{padding:9,borderRadius:7,backgroundColor:recurrenceForm.listId===x.id?c.border:c.elevated}}><Text style={{color:recurrenceForm.listId===x.id?c.text:c.secondary}}>{x.year} annual list</Text></TouchableOpacity>)}{field('Repeat every months',recurrenceForm.everyMonths,v=>setRecurrenceForm(x=>({...x,everyMonths:v})))}{field('Next occurrence',recurrenceForm.nextOccurrenceOn,v=>setRecurrenceForm(x=>({...x,nextOccurrenceOn:v})))}</View>
          <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{(['Visual','Close','Detailed'] as const).map(v=><React.Fragment key={v}>{button(`${recurrenceForm.grade===v?'✓ ':''}${v}`,()=>setRecurrenceForm(x=>({...x,grade:v})))}</React.Fragment>)}{button('Save recurring schedule',addRecurrence,busy||!recurrenceForm.listId)}</View>
        </>}
        {recurrences.map(x=><View key={x.id} style={{padding:9,backgroundColor:c.elevated,borderRadius:7}}><Text style={{color:c.text}}>{x.grade} · every {x.everyMonths} months · next {x.nextOccurrenceOn} · {x.enabled?'Enabled':'Paused'}</Text></View>)}
      </View>
      <View style={card}>
        <Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Work packages & inspector assignment</Text>
        <Text style={{color:c.secondary}}>Every item must belong to an approved annual list. Detailed tasks must be in a frozen approved sample. Active duplicate tasks are rejected.</Text>
        {manager&&<>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {field('Package reference',packageForm.reference,v=>setPackageForm(x=>({...x,reference:v})))}
            {field('Site',packageForm.site,v=>setPackageForm(x=>({...x,site:v})))}
            {field('Area',packageForm.area,v=>setPackageForm(x=>({...x,area:v})))}
            {field('Rotation',packageForm.rotation,v=>setPackageForm(x=>({...x,rotation:v})))}
            {field('Equipment IDs',packageForm.ids,v=>setPackageForm(x=>({...x,ids:v})),undefined,true)}
            {field('Planned start',packageForm.plannedStart,v=>setPackageForm(x=>({...x,plannedStart:v})))}
            {field('Due date',packageForm.plannedEnd,v=>setPackageForm(x=>({...x,plannedEnd:v})))}
            {field('Priority',packageForm.priorityCode,v=>setPackageForm(x=>({...x,priorityCode:v})))}
            {field('Required permits',packageForm.requiredPermits,v=>setPackageForm(x=>({...x,requiredPermits:v})))}
            {field('Isolation prerequisites',packageForm.isolationPrerequisites,v=>setPackageForm(x=>({...x,isolationPrerequisites:v})))}
            {field('Approved checklist version ID',packageForm.checklistVersionId,v=>setPackageForm(x=>({...x,checklistVersionId:v})))}
          </View>
          <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{(['Visual','Close','Detailed'] as const).map(v=><React.Fragment key={v}>{button(`${packageForm.grade===v?'✓ ':''}${v}`,()=>setPackageForm(x=>({...x,grade:v})))}</React.Fragment>)}</View>
          <Text style={{fontWeight:'700',color:c.text}}>Inspector assignment · leave empty to use the project assigned Surveyor</Text>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{inspectors.filter(u=>String(u.role).toLowerCase()==='surveyor').map(u=><React.Fragment key={u.id}>{button(`${packageForm.inspectorId===u.id?'✓ ':''}${u.displayName}`,()=>setPackageForm(x=>({...x,inspectorId:u.id})))}</React.Fragment>)}</View>
          {button('Clear inspector override',()=>setPackageForm(x=>({...x,inspectorId:''})))}
          {button('Create work package',buildPackage,busy||!packageForm.reference||!packageForm.site||!packageForm.ids)}
        </>}
        {(manager||role==='Surveyor')&&field('Reassignment / carry-forward reason',taskReason,v=>setTaskReason(v))}
        {packages.map((p:any)=><View key={p.id} style={{padding:10,backgroundColor:c.elevated,borderRadius:7,gap:7}}><Text style={{fontWeight:'700',color:c.text}}>{p.reference} · {p.site}{p.area?` / ${p.area}`:''} · {p.rotation||'No rotation'} · {p.status}</Text><Text style={{color:c.text}}>{p.tasks?.length||0} tasks · {p.completed} completed · {p.assigned} assigned · {p.plannedStart||'Start TBD'} to {p.plannedEnd||'Due TBD'}</Text>{p.tasks?.map((t:any)=><View key={t.id} style={{padding:9,backgroundColor:c.elevated,borderWidth:1,borderColor:c.border,borderRadius:7,gap:4}}><Text style={{fontWeight:'700',color:c.text}}>Route {t.routeOrder??'—'} · {t.areaEquipmentId} · {t.plannedGrade||'Grade not set'} · {t.statusCode}{t.isInaccessible?' · Carry forward':''}</Text><Text style={{color:c.secondary}}>Inspector {t.assignedUserId||'unassigned'} · Planned {t.scheduledAt||'not set'} · Due {t.dueAt||'not set'} · Priority {t.priorityCode||'Normal'}</Text>{!!t.requiredPermits&&<Text style={{color:c.text}}>Permit: {t.requiredPermits}</Text>}{!!t.isolationPrerequisites&&<Text style={{color:c.text}}>Isolation: {t.isolationPrerequisites}</Text>}{!!t.carryForwardReason&&<Text style={{color:c.text}}>Reason: {t.carryForwardReason}</Text>}<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{manager&&packageForm.inspectorId&&button('Reassign to selected inspector',()=>reassign(t.id),busy)}{!t.isInaccessible&&t.statusCode!=='Completed'&&button('Mark inaccessible / carry forward',()=>carryForward(t.id),busy||!taskReason.trim())}</View></View>)}</View>)}
        {packages.length===0&&<Text style={{color:c.secondary}}>No packages created.</Text>}
      </View>
      <View style={card}><Text style={{fontSize:18,fontWeight:'800',color:c.text}}>Campaign progress</Text><View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}>{Object.entries({Equipment:totals.equipment,Planned:totals.planned,Completed:totals.completed,Submitted:totals.submitted,'QC approved':totals.approved,Pending:totals.pending,Overdue:totals.overdue,Inaccessible:totals.inaccessible}).map(([k,v])=><View key={k} style={{padding:12,minWidth:120,backgroundColor:c.elevated,borderRadius:8}}><Text style={{color:c.secondary}}>{k}</Text><Text style={{fontSize:22,fontWeight:'800',color:c.text}}>{v}</Text></View>)}</View><Text style={{color:c.secondary}}>Compliant: not calculated; QC approval is not treated as compliance.</Text>{(progress?.rotationProgress||[]).map((x:any)=><Text key={x.rotation} style={{color:c.secondary}}>Rotation {x.rotation}: {x.completed} / {x.total} complete</Text>)}{(progress?.openDefectsByCategory||[]).map((x:any)=><Text key={x.category} style={{color:c.secondary}}>Open defects · {x.category}: {x.count}</Text>)}</View>
    </>}
  </ScrollView>;
}

const styles=StyleSheet.create({
  page:{padding:16,gap:16,width:'100%',alignSelf:'center',paddingBottom:28},
  hero:{minHeight:162,padding:22,justifyContent:'center',gap:7,overflow:'hidden',borderRadius:17,
    borderWidth:1,borderColor:'#126078',backgroundColor:'#03192C'},
  heroPhoto:{position:'absolute',right:0,width:'72%',height:'100%'},
  nativeOverlay:{backgroundColor:'#03192C88'},
  eyebrow:{color:'#00D9EE',fontFamily:visual.mono,fontSize:11,fontWeight:'800',letterSpacing:1.8},
  heroTitle:{fontFamily:visual.display,fontSize:32,fontWeight:'900',color:'#F5FAFF'},
  accent:{color:'#00D9EE'},
  heroDescription:{fontSize:14,lineHeight:20,color:'#F5FAFF',maxWidth:680},
  card:{padding:16,gap:10,borderWidth:1,borderRadius:16,minWidth:0},
  panelTitle:{flexDirection:'row',alignItems:'center',gap:11},
  panelIcon:{fontSize:23,fontWeight:'900',textAlign:'center',width:43,lineHeight:43,borderRadius:10,overflow:'hidden'},
  heading:{fontSize:19,fontWeight:'900'},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},
  field:{paddingHorizontal:11,paddingVertical:8,borderWidth:1,borderRadius:9,minWidth:135,flexBasis:165,flexGrow:1},
  button:{minHeight:40,justifyContent:'center',alignSelf:'flex-start',paddingVertical:8,paddingHorizontal:13,borderWidth:1,borderRadius:10},
  campaign:{padding:11,gap:4,borderWidth:1,borderRadius:10},
});
