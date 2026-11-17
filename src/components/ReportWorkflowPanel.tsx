import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {changeReportStatus, getReportWorkflow, reopenReportRevision, ReportStatus, ReportWorkflow} from '../api/reportWorkflow';
import {getApiErrorMessage} from '../api/errors';
import {useThemeMode} from '../theme/useThemeMode';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {LIGHT} from '../theme/palette';
import SearchableOptionPicker from './SearchableOptionPicker';

export default function ReportWorkflowPanel({projectId,readOnly=false,compact=false,refreshKey=0,onStatus,onBusy,onSaved}:{
  projectId:string;readOnly?:boolean;compact?:boolean;refreshKey?:number;onStatus?:(status:ReportStatus)=>void;onBusy?:(busy:boolean)=>void;onSaved?:()=>void;
}) {
  const dark=useThemeMode()==='dark'; const c=dark?OPERATIONS_DARK:LIGHT;
  const [state,setState]=useState<ReportWorkflow>(); const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [reason,setReason]=useState('');
  const [dialog,setDialog]=useState<'Hold'|'Submitted'|'Reopen'>();const [history,setHistory]=useState(false);
  const pendingRead=useRef<AbortController|null>(null);
  const generation=useRef(0);const saving=useRef(false);const callbacks=useRef({onStatus,onBusy,onSaved});callbacks.current={onStatus,onBusy,onSaved};
  async function load() {
    pendingRead.current?.abort();pendingRead.current=new AbortController();
    const request=++generation.current;setLoading(true);setError('');
    try {const {data}=await getReportWorkflow(projectId,pendingRead.current.signal);if(request===generation.current){setState(data);callbacks.current.onStatus?.(data.status);}}
    catch(e){if(request===generation.current)setError(getApiErrorMessage(e,'Could not load Report Status.'));}
    finally{if(request===generation.current)setLoading(false);}
  }
  useEffect(()=>{setState(undefined);setDialog(undefined);setReason('');void load();return()=>{generation.current++;pendingRead.current?.abort();};},[projectId,refreshKey]);
  const button=(label:string,action:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={action} style={{paddingHorizontal:16,paddingVertical:12,borderRadius:8,borderWidth:1,borderColor:c.border,backgroundColor:c.elevated,opacity:disabled ? .45 : 1}}><Text style={{color:c.text,fontWeight:'700'}}>{label}</Text></Pressable>;
  const save=async(target:ReportStatus|'Reopen')=>{
    if(!state||saving.current)return;
    if((target==='Hold'||target==='Reopen')&&!reason.trim()){setError(target==='Hold'?'Hold Reason is required.':'A revision reason is required.');return;}
    saving.current=true;setBusy(true);callbacks.current.onBusy?.(true);setError('');const request=generation.current;
    try {
      const {data}=target==='Reopen'?await reopenReportRevision(projectId,{expectedVersion:state.version,reason:reason.trim()}):await changeReportStatus(projectId,{status:target,expectedVersion:state.version,reason:target==='Hold'?reason.trim():undefined,confirmSubmission:target==='Submitted',draftArtifactId:target==='Submitted'?state.draftArtifact?.id:undefined});
      if(request===generation.current){setState(data);setDialog(undefined);setReason('');callbacks.current.onStatus?.(data.status);callbacks.current.onSaved?.();}
    }catch(e){if(request===generation.current)setError(getApiErrorMessage(e,'Could not update Report Status. Refresh and try again.'));}
    finally{saving.current=false;setBusy(false);callbacks.current.onBusy?.(false);}
  };
  return <View style={{padding:compact?12:18,borderWidth:1,borderColor:c.border,backgroundColor:c.card,borderRadius:12,gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12}}>
      <Text accessibilityRole="header" style={{color:c.text,fontSize:compact?15:18,fontWeight:'800'}}>Report Status</Text>
      {loading?<ActivityIndicator color={c.cyan}/>:state&&<Text accessibilityLabel={`Report status: ${state.status}`} style={{color:state.status==='Hold'?c.amber:state.status==='Submitted'?c.success:c.cyan,fontWeight:'800',fontSize:16}}>{state.status} · Revision {state.revision}</Text>}
    </View>
    {state?.holdReason&&<Text style={{color:c.text}}>Hold Reason: {state.holdReason}</Text>}
    {state?.submittedAt&&<Text style={{color:c.muted}}>{state.status==='Submitted'?'Submitted':'Last submitted'} {new Date(state.submittedAt).toLocaleString()} · {state.submittedByName||state.submittedByUserId}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
    {!readOnly&&state&&<>
      {state.canEdit&&<SearchableOptionPicker label="Change Report Status" placeholder="Select report status" value={state.status} options={(['Ongoing','Hold','Submitted'] as const).map(value=>({value,label:value}))} dark={dark} disabled={busy||loading} onChange={value=>{if(value===state.status)return;setError('');setReason('');if(value==='Ongoing')void save('Ongoing');else setDialog(value as 'Hold'|'Submitted');}}/>}
      {state.status==='Submitted'&&<Text style={{color:c.muted}}>This submitted PDF is locked. View or download its saved version from Report History.</Text>}
      {state.canReopen&&button('Open New Report Revision',()=>{setDialog('Reopen');setReason('');setError('');},busy)}
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{button('Refresh Report Status',()=>void load(),busy||loading)}{button(history?'Hide Status History':'Show Status History',()=>setHistory(!history),busy)}</View>
      {history&&<View style={{gap:10}}>{!state.history.length&&<Text style={{color:c.muted}}>No status changes recorded.</Text>}{state.history.map(event=><View key={event.id} style={{borderTopWidth:1,borderColor:c.border,paddingTop:8,gap:3}}><Text style={{color:c.text}}>{event.fromStatus} → {event.toStatus} · Revision {event.revision}</Text><Text style={{color:c.muted}}>{event.actorName||event.actorUserId} · {new Date(event.occurredAt).toLocaleString()}</Text>{event.reason&&<Text style={{color:c.text}}>{event.reason}</Text>}</View>)}</View>}
    </>}
    {readOnly&&error&&button('Retry Report Status',()=>void load(),loading)}
    <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={()=>{if(!busy)setDialog(undefined);}}>
      <View style={{flex:1,backgroundColor:'#0009',justifyContent:'center',padding:20}}><ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow:0,alignSelf:'center',width:'100%',maxWidth:560,backgroundColor:c.card,borderRadius:14}} contentContainerStyle={{padding:22,gap:16}}>
        <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>{dialog==='Hold'?'Hold Report':dialog==='Reopen'?'Open Report Revision':'Confirm Final Submission'}</Text>
        {dialog==='Submitted'?<><Text style={{color:c.text}}>Submit this project report? A final PDF snapshot will be saved and locked. An Admin or Manager must open a new revision for further report changes.</Text><Text style={{color:c.muted}}>All equipment needs its latest inspection QC approved. The draft PDF must include UID Number, Document Number and Revision.</Text><Text style={{color:c.text}}>{state?.draftArtifact?`Draft: ${state.draftArtifact.fileName} · Version ${state.draftArtifact.revision}`:'Generate the project inspection PDF before submitting.'}</Text></>:<><Text style={{color:c.text}}>{dialog==='Hold'?'Hold Reason *':'Revision Reason *'}</Text><TextInput accessibilityLabel={dialog==='Hold'?'Hold Reason':'Revision Reason'} value={reason} onChangeText={setReason} multiline autoFocus maxLength={2000} editable={!busy} style={{color:c.text,borderColor:c.border,borderWidth:1,borderRadius:8,padding:12,minHeight:110,textAlignVertical:'top'}}/></>}
        {!!error&&<Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
        <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10,flexWrap:'wrap'}}>{button('Cancel',()=>{setDialog(undefined);setError('');},busy)}{button(busy?'Saving…':dialog==='Submitted'?'Confirm Submission':dialog==='Hold'?'Save Hold':'Open Revision',()=>void save(dialog==='Reopen'?'Reopen':dialog==='Hold'?'Hold':'Submitted'),busy||(dialog==='Submitted'&&!state?.draftArtifact))}</View>
      </ScrollView></View>
    </Modal>
  </View>;
}
