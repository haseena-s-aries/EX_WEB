import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ActivityIndicator} from 'react-native';
import {getMyProfile} from '../api/account';
import {getRoleRequests,requestRoleChange,refreshUserAccess,RoleRequest} from '../api/userAccess';
import {getApiErrorMessage} from '../api/errors';
import SearchableOptionPicker from './SearchableOptionPicker';
import {Colors} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
export default function RoleChangePanel({colors:c}:{colors:Colors}) {
  const dark=useThemeMode()==='dark';
  const [current,setCurrent]=useState('');const [role,setRole]=useState('');const [reason,setReason]=useState('');const [history,setHistory]=useState<RoleRequest[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const load=async()=>{const [p,r]=await Promise.all([getMyProfile(),getRoleRequests()]);setCurrent(p.data.role);setHistory(r.data);};
  useEffect(()=>{let alive=true;load().catch(e=>{if(alive)setError(getApiErrorMessage(e,'Could not load role requests.'));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
  const pending=history.some(r=>r.status==='Pending');
  const submit=async()=>{if(busy||pending)return;if(!role||role.toLowerCase()===current.toLowerCase()||!reason.trim()){setError('Choose a different role and enter a reason.');return;}setError('');setBusy(true);try{await requestRoleChange(role,reason.trim());setRole('');setReason('');setMessage('Your role change request has been submitted and is waiting for Admin approval.');await load();refreshUserAccess();}catch(e){setError(getApiErrorMessage(e,'Could not submit request.'));}finally{setBusy(false);}};
  const button=(title:string,onPress:()=>void,disabled=false)=><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:14,borderRadius:9,backgroundColor:c.elevated,borderWidth:1,borderColor:c.cyan,opacity:disabled ? 0.5 : 1}}><Text style={{color:c.cyan,fontWeight:'700'}}>{title}</Text></TouchableOpacity>;
  if(loading)return <ActivityIndicator color={c.cyan}/>;
  return <View style={{gap:16}}><Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>Request Role Change</Text><Text style={{color:c.secondary}}>Your current role stays active until an Admin approves your request.</Text><Text style={{color:c.text}}>Current Role (read-only): {current}</Text>
    {!pending && <><SearchableOptionPicker dark={dark} label="Requested Role" value={role} placeholder="Select requested role" options={['Admin','Manager','Qc','Surveyor','Client'].filter(r=>r.toLowerCase()!==current.toLowerCase()).map(r=>({value:r,label:r==='Qc'?'QC':r}))} onChange={setRole} disabled={busy}/><Text style={{color:c.text}}>Reason for Role Change *</Text><TextInput accessibilityLabel="Reason for Role Change" value={reason} onChangeText={setReason} editable={!busy} multiline maxLength={2000} style={{minHeight:100,color:c.text,borderColor:c.border,borderWidth:1,borderRadius:9,padding:12,backgroundColor:c.elevated}}/>{button(busy?'Submitting…':'Submit Request',()=>void submit(),busy)}</>}
    {pending&&<Text style={{color:c.cyan}}>A role change request is already waiting for Admin approval.</Text>}
    {!!error&&<Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}{!!message&&<Text accessibilityLiveRegion="polite" style={{color:c.success}}>{message}</Text>}
    <Text style={{color:c.text,fontWeight:'800'}}>Request History</Text>{history.length===0&&<Text style={{color:c.secondary}}>No role change requests yet.</Text>}{history.map(r=><View key={r.id} style={{padding:12,borderWidth:1,borderColor:c.border,borderRadius:9,gap:6}}><Text style={{color:c.text}}>{r.currentRole} → {r.requestedRole} · {r.status}</Text><Text style={{color:c.secondary}}>{r.reason}</Text><Text style={{color:c.secondary}}>{new Date(r.requestedAt).toLocaleString()}{r.reviewedAt?` · Reviewed ${new Date(r.reviewedAt).toLocaleString()}`:''}</Text>{!!r.rejectionReason&&<Text style={{color:c.critical}}>{r.rejectionReason}</Text>}</View>)}
  </View>;
}
