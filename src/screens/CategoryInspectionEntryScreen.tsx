import React, {useEffect, useState} from 'react';
import {Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import apiClient from '../api/client';
import {allCheckpoints, ChecklistCategory, getChecklistCatalog} from '../api/equipmentChecklistCatalog';
import {getApiErrorMessage} from '../api/errors';
import {addInspectionFinding, getInspectionActivity, getInspectionActivityHistory, InspectionPhotoFile, saveActivityCheckpoint, submitInspectionActivity, uploadActivityPhoto} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import HaerGrid from '../components/HaerGrid';
import InspectionPhotoPicker from '../components/InspectionPhotoPicker';
import RegisterDateInput from '../components/RegisterDateInput';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

const sections = [['Apparatus', 'A – APPARATUS'], ['Installation', 'B – INSTALLATION'], ['Environment', 'C – ENVIRONMENT']];
const inspectionError = (error:unknown, fallback:string) => {
  if ((error as {code?:string})?.code === 'ERR_NETWORK')
    return `Could not connect to the inspection API at ${apiClient.defaults.baseURL}. Check that the backend is running, then retry. Unsaved entries stay on this page.`;
  return getApiErrorMessage(error,fallback);
};

const grades = ['D','C','V'] as const;
type Grade = typeof grades[number];
type Result = 'Pass'|'Fail'|null;
type GradeResults = Partial<Record<Grade,Result>>;
const columns = [
  {label:'No.',width:70}, {label:'Items to Be Checked',width:400}, {label:'Check points / protection type',width:180},
  ...grades.map(label=>({label,width:60})), {label:'Remarks',width:220},
];
type Point = {section:string; itemNumber:number; text:string; code:string; protectionApplicability:string};
type Draft = {grades?:GradeResults; remarks?:string; comment?:string; photos?:InspectionPhotoFile[]};
type Activity = {
  id:string; rowVersion:string; reviewStatus:string; equipmentComments?:string;
  checkpoints:{id:string; questionCode:string; questionText:string; sectionCode:string; applicabilityCode:string}[];
  responses:{id:string; checkpointDefinitionSnapshotId:string; responseCode:string|null; gradeResultsJson?:string|null; inspectionComment?:string; observation?:string}[];
  evidence:{id:string; url:string; checkpointResponseRevisionId?:string; checkpointDefinitionSnapshotId?:string}[];
};

export default function CategoryInspectionEntryScreen({project, item, onBack, onSaved, onLegacy}: {project:string; item:string; onBack:()=>void; onSaved:()=>void; onLegacy:()=>void}) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [categories,setCategories] = useState<ChecklistCategory[]>([]);
  useEffect(() => {
    let active = true;
    getChecklistCatalog().then(({data})=>{if(active)setCategories(data.categories);})
      .catch(e=>{if(active)setError(inspectionError(e,'Could not load checklist categories.'));});
    return ()=>{active=false;};
  }, []);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [points, setPoints] = useState<Point[]>([]);
  const [activity, setActivity] = useState<Activity>();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [picker, setPicker] = useState<'history'>();
  const [history, setHistory] = useState<{id:string;startedAt:string;reviewStatus:string}[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [equipmentComments,setEquipmentComments] = useState<string>();
  const [equipmentPhotos,setEquipmentPhotos] = useState<InspectionPhotoFile[]>([]);
  const [submitStatus,setSubmitStatus] = useState(false);
  const [statusPicker,setStatusPicker] = useState(false);
  const [notice, setNotice] = useState('');
  const [gradePicker,setGradePicker] = useState<{code:string; grade:Grade}>();
  const [attachmentPicker,setAttachmentPicker] = useState(false);
  const [attachmentSearch,setAttachmentSearch] = useState('');
  const [attachmentCode,setAttachmentCode] = useState('');
  const [preview, setPreview] = useState('');
  const [openedKey, setOpenedKey] = useState('');
  const base = `/v1/inspection-activities/category-checklist/projects/${project}/equipment/${item}`;
  const key = `${project}/${item}/${date}`;
  const editable = !activity || activity.reviewStatus === 'Draft' || activity?.reviewStatus === 'ChangesRequested';
  useEffect(() => {
    let active = true;
    if (item)
      apiClient.get<Point[]>(base, {params:{category:allCheckpoints,activityId:activity?.id}}).then(r => {if (active) setPoints(r.data);})
        .catch(e => {if (active) setError(inspectionError(e, 'Could not load checkpoints.'));});
    return () => {active = false;};
  }, [activity?.id, base, item]);

  useEffect(() => {
    let active = true;
    if (item && date) getInspectionActivityHistory(item, true).then(async ({data}) => {
      const existing = data.find((row:{startedAt:string})=>row.startedAt.slice(0,10)===date);
      if (existing && active) {
        const loaded = (await getInspectionActivity(existing.id)).data as Activity;
        if (active) setActivity(current=>current ?? loaded);
      }
    }).catch(e=>{if(active)setError(inspectionError(e,'Could not load previous inspection details. You can still enter a draft and retry saving.'));});
    return ()=>{active=false;};
  }, [date,item]);

  async function loadOrCreateInspection(): Promise<Activity> {
    if (activity) return (await getInspectionActivity(activity.id)).data;
    const {data} = await apiClient.post<{id:string}>(`${base}/open`,{inspectionDate:date});
    return (await getInspectionActivity(data.id)).data;
  }

  async function open() {
    if (openedKey === key && activity) return;
    setBusy(true); setError('');
    try {
      setActivity(await loadOrCreateInspection());
      setOpenedKey(key);
    } catch (e) {setError(inspectionError(e, 'Could not open the inspection.'));}
    finally {setBusy(false);}
  }
  async function openHistory() {
    setBusy(true); setError('');
    try {
      setHistory((await getInspectionActivityHistory(item, true)).data);
      setSearch(''); setPicker('history');
    } catch (e) {setError(inspectionError(e, 'Could not load previous inspections.'));}
    finally {setBusy(false);}
  }
  function resetSelection() {
    setActivity(undefined); setOpenedKey(''); setAttachmentCode(''); setEquipmentComments(undefined); setEquipmentPhotos([]); setSubmitStatus(false); setError(''); setNotice('');
  }
  const readGrades = (json?:string|null): GradeResults => json ? JSON.parse(json) as GradeResults : {};
  const patch = (code:string, value:Draft) => setDrafts(old => ({...old,[code]:{...old[code],...value}}));
  const storedFor = (current:Activity, code:string) => {
    const definition = current.checkpoints.find(cp => cp.questionCode === code);
    return {definition, response:current.responses.find(r => r.checkpointDefinitionSnapshotId === definition?.id)};
  };
  async function persist(current:Activity, code:string, draft:Draft): Promise<Activity> {
    const {definition, response} = storedFor(current, code);
    if (!definition) throw new Error('This checkpoint is no longer available.');
    if (!response || draft.grades !== undefined || draft.remarks !== undefined || draft.comment !== undefined) {
      await saveActivityCheckpoint(current.id, {checkpointDefinitionSnapshotId:definition.id, responseCode:response?.responseCode ?? null, gradeResults:draft.grades, inspectionComment:draft.comment,
        observation:draft.remarks ?? response?.observation ?? null, activityRowVersion:current.rowVersion});
      patch(code, {grades:undefined, remarks:undefined, comment:undefined});
      current = (await getInspectionActivity(current.id)).data;
      setActivity(current);
    }
    const responseId = storedFor(current, code).response?.id;
    for (const [i, photo] of (draft.photos ?? []).entries()) {
      await uploadActivityPhoto(current.id, photo, responseId);
      patch(code, {photos:draft.photos!.slice(i + 1)});
    }
    setDrafts(old => {const next = {...old}; delete next[code]; return next;});
    return current;
  }
  async function save(submit:boolean, findingCode?:string) {
    if (!editable || busy || !date) return;
    setBusy(true); setError(''); setNotice('');
    try {
      let current = await loadOrCreateInspection();
      setActivity(current);
      if (current.reviewStatus !== 'Draft' && current.reviewStatus !== 'ChangesRequested')
        throw new Error('This inspection is read-only.');
      if (!findingCode && equipmentComments !== undefined) {
        await apiClient.put(`/v1/inspection-activities/${current.id}/equipment-comments`,
          {comments:equipmentComments,rowVersion:current.rowVersion});
        current = (await getInspectionActivity(current.id)).data;
        setActivity(current);setEquipmentComments(undefined);
      }
      if (!findingCode) for (const photo of equipmentPhotos) {
        await uploadActivityPhoto(current.id,photo);
        setEquipmentPhotos(pending=>pending.slice(1));
      }
      const entries = findingCode ? [[findingCode, drafts[findingCode] ?? {}] as const] : Object.entries(drafts);
      for (const [code, draft] of entries) current = await persist(current, code, draft);
      if (findingCode) {
        const response = storedFor(current, findingCode).response;
        const observation = response?.inspectionComment?.trim() || response?.observation?.trim();
        if (response?.responseCode !== 'Fail' || !observation)
          throw new Error('Save a Fail result with remarks before raising a defect.');
        await addInspectionFinding(current.id, {checkpointResponseRevisionId:response.id, observation});
        setNotice('Defect raised.');
      } else if (submit) {
        await submitInspectionActivity(current.id);
        setSubmitStatus(false);
        setNotice('Inspection submitted for review.');
        onSaved();
      } else setNotice('Draft saved.');
      setActivity((await getInspectionActivity(current.id)).data);
    } catch(e) {setError(inspectionError(e, e instanceof Error ? e.message : 'Could not save the inspection.'));}
    finally {setBusy(false);}
  }

  const button = (label:string, action:()=>void, disabled=false, active=false, accessibilityLabel=label) =>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={action} style={{padding:8, minHeight:36, borderWidth:1,
      borderColor:c.border, backgroundColor:active ? '#173454' : c.elevated, opacity:disabled ? .5 : 1, borderRadius:6}}>
      <Text style={{color:active ? '#fff' : c.text,fontWeight:'700'}}>{label}</Text>
    </TouchableOpacity>;
  const text = (value?:string) => <Text style={{color:c.text}}>{value || '—'}</Text>;
  const line = {flexDirection:'row' as const, flexWrap:'wrap' as const, alignItems:'center' as const,gap:8};
  const input = {borderColor:c.border,borderWidth:1,borderRadius:6,minHeight:36,padding:8,color:c.text,backgroundColor:c.card};
  function row(point:Point) {
    const savedPoint = activity && storedFor(activity, point.code);
    const saved = savedPoint?.response;
    const draft = drafts[point.code];
    const values = {...readGrades(saved?.gradeResultsJson), ...draft?.grades};
    return {id:point.code,cells:[
      text(String(point.itemNumber)),text(point.text),text(categories.find(value=>value.id===point.protectionApplicability)?.name ?? point.protectionApplicability),
      ...grades.map(grade => {
        const value = values[grade];
        return button(value === 'Pass' ? 'P' : value === 'Fail' ? 'F' : '□',
          ()=>setGradePicker({code:point.code,grade}),busy||!editable,!!value,`${grade} result for ${point.code}`);
      }),
      <View style={{gap:4}}>
        {!saved?.gradeResultsJson && saved?.responseCode && !draft?.grades && text(`Previous result: ${saved.responseCode}`)}
        <TextInput accessibilityLabel={`Remarks for ${point.code}`} multiline editable={!!editable&&!busy} style={input}
          value={draft?.remarks ?? saved?.observation ?? ''} onChangeText={remarks=>patch(point.code,{remarks})}/>
      </View>,
    ]};
  }
  const associatedPoint = points.find(point=>point.code===attachmentCode);
  const associated = activity && associatedPoint ? storedFor(activity,associatedPoint.code) : undefined;
  const attachmentDraft = associatedPoint && drafts[associatedPoint.code];
  const associatedGrades = {...readGrades(associated?.response?.gradeResultsJson), ...(attachmentDraft || {}).grades};
  const hasFailure = Object.values(associatedGrades).includes('Fail') ||
    (!associated?.response?.gradeResultsJson && !(attachmentDraft || {}).grades && associated?.response?.responseCode === 'Fail');
  const selectedPhotos = activity?.evidence.filter(photo=>associatedPoint
    ? photo.checkpointDefinitionSnapshotId === associated?.definition?.id : !photo.checkpointDefinitionSnapshotId) ?? [];
  async function removePhoto(id:string) {
    if (!activity || busy) return;
    setBusy(true);setError('');
    try {
      await apiClient.delete(`/v1/inspection-activities/${activity.id}/photos/${id}`);
      setActivity((await getInspectionActivity(activity.id)).data);
    } catch(e) {setError(inspectionError(e,'Could not remove the photo.'));}
    finally {setBusy(false);}
  }
  const dirty = Object.keys(drafts).length > 0 || equipmentComments !== undefined || equipmentPhotos.length > 0;
  const locked = busy || dirty;
  return <ScrollView style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:18,gap:12}}>
    <View style={line}>{button('Back',onBack,locked)}{button('Grade-based inspection history',onLegacy,locked)}</View>
    <Text accessibilityRole="header" style={{fontSize:26,fontWeight:'800',color:c.text}}>Equipment Inspection</Text>
    <View style={line}>
      {button('Previous Inspections',()=>void openHistory(),!item||locked)}
      <RegisterDateInput value={date} disabled={locked} onChange={value=>{setDate(value);resetSelection();}} style={input}/>
    </View>
    {!!error && <Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
    {!!notice && <Text style={{color:c.text}}>{notice}</Text>}
    {!!item && !activity && <View style={line}>
      {button('Checklist Items',()=>void open(),busy||!date,true)}
      {text('Open or create a draft to enter results for the checkpoints below.')}
    </View>}
    {!!points.length && <View style={line}>
      {text(activity?.reviewStatus ?? 'Draft')}
      {text(`${points.filter(point => {
        const saved = activity ? storedFor(activity, point.code).response : undefined;
        const changes = drafts[point.code]?.grades;
        return changes || saved?.gradeResultsJson
          ? Object.values({...readGrades(saved?.gradeResultsJson),...changes}).some(Boolean) : !!saved?.responseCode;
      }).length} / ${points.length} answered`)}
      {button(submitStatus?'Save and Submit':'Save Draft',()=>void save(submitStatus),busy||!editable||!date)}
      {button('Submit Inspection',()=>void save(true),busy||!editable,true)}
      {dirty && button('Discard unsaved changes',()=>{setDrafts({});setEquipmentComments(undefined);setEquipmentPhotos([]);setSubmitStatus(false);},busy)}
    </View>}
    {sections.map(([section,label])=>{
      const items = points.filter(p=>p.section===section);
      return !!items.length && <View key={section} style={{gap:6}}>
        {button(label,()=>setCollapsed(old=>({...old,[section]:!old[section]})))}
        {!collapsed[section] && <HaerGrid fullWidth columnGroup={{label:'Grade of Inspection',start:3,count:3}} columns={columns} rows={items.map(row)} colors={c} label={label}/>}
      </View>;
    })}
    <View style={{gap:10,padding:12,borderWidth:1,borderColor:c.border,borderRadius:8,backgroundColor:c.card}}>
      <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>Equipment Inspection Details</Text>
      <Text style={{color:c.text,fontWeight:'700'}}>Equipment Comments / Remarks</Text>
      <TextInput accessibilityLabel="Equipment Comments / Remarks" multiline maxLength={4000} editable={editable&&!busy}
        value={equipmentComments ?? activity?.equipmentComments ?? ''} onChangeText={setEquipmentComments}
        style={{...input,minHeight:90,textAlignVertical:'top'}}/>
      <Text style={{color:c.text,fontWeight:'700'}}>Inspection Status</Text>
      {button(submitStatus ? 'Submitted on save' : activity?.reviewStatus ?? 'Draft',()=>setStatusPicker(true),busy||!editable,false,'Inspection Status')}
      <Text style={{color:c.text,fontWeight:'700'}}>Equipment Photos</Text>
      <View style={line}>{activity?.evidence.filter(photo=>!photo.checkpointResponseRevisionId).map(photo=><View key={photo.id} style={{gap:4}}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Preview equipment photo" onPress={()=>setPreview(photo.url)}>
          <AuthenticatedImage path={photo.url} style={{width:110,height:78}}/>
        </TouchableOpacity>
        {activity.reviewStatus==='Draft' && button('Remove equipment photo',()=>void removePhoto(photo.id),busy)}
      </View>)}</View>
      {editable && <View style={{gap:5}}><Text style={{color:c.text}}>Upload Equipment Photos</Text>
        <InspectionPhotoPicker disabled={busy} onSelected={photos=>setEquipmentPhotos(previous=>[...previous,...photos])}/>
      </View>}
      {equipmentPhotos.map((photo,index)=><View key={index} style={line}>
        {photo.uri && <Image source={{uri:photo.uri}} style={{width:88,height:60,borderRadius:4}}/>}
        {text(photo.fileName || photo.name || `Pending equipment photo ${index+1}`)}
        {button('Remove pending equipment photo',()=>setEquipmentPhotos(previous=>previous.filter((_,i)=>i!==index)),busy)}
      </View>)}
    </View>
    {!!points.length && <View style={{gap:10,padding:12,borderWidth:1,borderColor:c.border,borderRadius:8,backgroundColor:c.card}}>
      <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>Inspection Photos &amp; Comments</Text>
      {button(associatedPoint ? `${associatedPoint.code} · ${associatedPoint.text}` : 'Choose checkpoint for photos and comments',
        ()=>{setAttachmentSearch('');setAttachmentPicker(true);},busy)}
      {associatedPoint && text('Photos for this checkpoint')}
      <View style={line}>{(associatedPoint ? selectedPhotos : []).map(photo=><View key={photo.id} style={{gap:4}}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Preview inspection photo" onPress={()=>setPreview(photo.url)}>
          <AuthenticatedImage path={photo.url} style={{width:110,height:78}}/>
        </TouchableOpacity>
        {activity?.reviewStatus === 'Draft' && button('Remove photo',()=>void removePhoto(photo.id),busy)}
      </View>)}</View>
      {associatedPoint && <>
        {!!editable && <InspectionPhotoPicker disabled={busy} onSelected={photos=>patch(associatedPoint.code,
          {photos:[...((attachmentDraft || {}).photos ?? []),...photos]})}/>}
        {(attachmentDraft || {}).photos?.map((photo,index)=><View key={index} style={line}>
          {text(photo.fileName || `Pending photo ${index+1}`)}
          {button('Remove pending photo',()=>patch(associatedPoint.code,{photos:(attachmentDraft || {}).photos?.filter((_,i)=>i!==index)}),busy)}
        </View>)}
        <Text style={{color:c.text,fontWeight:'700'}}>Comments</Text>
        <TextInput accessibilityLabel="Checkpoint comments" multiline editable={!!editable&&!busy} style={input}
          value={(attachmentDraft || {}).comment ?? associated?.response?.inspectionComment ?? ''}
          onChangeText={comment=>patch(associatedPoint.code,{comment})}/>
        {hasFailure && editable && button('Raise defect',()=>void save(false,associatedPoint.code),busy)}
      </>}
    </View>}
    <Modal transparent visible={statusPicker} onRequestClose={()=>setStatusPicker(false)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',alignItems:'center',padding:16}}>
        <View style={{backgroundColor:c.card,padding:14,borderRadius:8,gap:8,width:'100%',maxWidth:320}}>
          {button(activity?.reviewStatus ?? 'Draft',()=>{setSubmitStatus(false);setStatusPicker(false);})}
          {button('Submit for review',()=>{setSubmitStatus(true);setStatusPicker(false);})}
          {button('Cancel',()=>setStatusPicker(false))}
        </View>
      </View>
    </Modal>
    <Modal transparent visible={!!gradePicker} onRequestClose={()=>setGradePicker(undefined)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',alignItems:'center',padding:16}}>
        <View style={{backgroundColor:c.card,padding:14,borderRadius:8,gap:8,width:'100%',maxWidth:320}}>
          <Text style={{color:c.text,fontWeight:'800'}}>{gradePicker?.code} · {gradePicker?.grade}</Text>
          {([{label:'P – Pass',value:'Pass'}, {label:'F – Fail',value:'Fail'}, {label:'Blank – No result',value:null}] as const).map(option =>
            <View key={option.label}>{button(option.label,()=>{
              if (gradePicker) patch(gradePicker.code,{grades:{...drafts[gradePicker.code]?.grades,[gradePicker.grade]:option.value}});
              setGradePicker(undefined);
            })}</View>)}
          {button('Cancel',()=>setGradePicker(undefined))}
        </View>
      </View>
    </Modal>
    <Modal transparent visible={attachmentPicker} onRequestClose={()=>setAttachmentPicker(false)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:16}}>
        <View style={{backgroundColor:c.card,padding:14,borderRadius:8,gap:8,maxHeight:'85%'}}>
          <TextInput accessibilityLabel="Search checkpoints" placeholder="Search checkpoints" style={input}
            value={attachmentSearch} onChangeText={setAttachmentSearch}/>
          
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:5}}>
            {points.filter(point=>`${point.code} ${point.text}`.toLowerCase().includes(attachmentSearch.trim().toLowerCase())).map(point=>
              <View key={point.code}>{button(`${point.code} · ${point.text}`,()=>{setAttachmentCode(point.code);setAttachmentPicker(false);})}</View>)}
          </ScrollView>
          {button('Cancel',()=>setAttachmentPicker(false))}
        </View>
      </View>
    </Modal>
    <Modal transparent visible={!!picker} onRequestClose={()=>setPicker(undefined)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:18}}>
        <View style={{backgroundColor:c.card,padding:16,borderRadius:8,gap:8,maxHeight:460}}>
          <TextInput accessibilityLabel="Search inspections" placeholder="Search date or status" style={input} value={search} onChangeText={setSearch}/>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:5}}>
            {!history.length && text('No previous category inspections.')}
            {history.filter(h=>`${h.startedAt} ${h.reviewStatus}`.toLowerCase().includes(search.trim().toLowerCase())).map(h=>
              <View key={h.id}>{button(`${h.startedAt.slice(0,10)} · ${h.reviewStatus}`,()=>{
                resetSelection(); setDate(h.startedAt.slice(0,10)); setPicker(undefined);
              })}</View>)}
          </ScrollView>
          {button('Close',()=>setPicker(undefined))}
        </View>
      </View>
    </Modal>
    <Modal transparent visible={!!preview} onRequestClose={()=>setPreview('')}>
      <View style={{flex:1,backgroundColor:c.card,padding:18,justifyContent:'center',gap:10}}>
        {!!preview && <AuthenticatedImage path={preview} style={{width:'100%',height:360}}/>}
        {button('Close preview',()=>setPreview(''))}
      </View>
    </Modal>
  </ScrollView>;
}
