import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {Colors, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import React,{useEffect,useState} from 'react';
import {Image,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {assignEquipmentTag,deactivateEquipmentTag,getEquipmentTagHistory,resolveEquipmentIdentifier,searchEquipment} from '../api/equipmentIdentification';
import {getApiErrorMessage} from '../api/errors';
import EquipmentIdentificationWorkspace from '../components/EquipmentIdentificationWorkspace';
import {projectDisplay} from '../utils/projectDisplay';

const SURVEYOR_ART = require('../assets/landing/industry-9.jpg');

const searchSessions = new Map<string,any>();
type Technology='HF_RFID'|'NFC'|'QR';
export default function ScanEquipmentScreenWeb({role,accountId,online,onBack,onOpenInspection}:{role:string;accountId:string;online:boolean;onBack:()=>void;onOpenInspection:(equipmentId:string, context?:any)=>void;onOpenOffline:()=>void}){
 const previous=searchSessions.get(accountId);
 const [technology,setTechnology]=useState<Technology>(previous?.technology || 'HF_RFID');const [identifier,setIdentifier]=useState(previous?.identifier || '');const [query,setQuery]=useState(previous?.query || '');const [rows,setRows]=useState<any[]>(previous?.rows || []);const [result,setResult]=useState<any>(previous?.result || null);const [history,setHistory]=useState<any>(null);const [reason,setReason]=useState('');const [newValue,setNewValue]=useState('');const [confirm,setConfirm]=useState(false);const [error,setError]=useState('');const canManage=role==='Admin'||role==='Manager';
 useEffect(()=>{searchSessions.set(accountId,{technology,identifier,query,rows,result});},[accountId,technology,identifier,query,rows,result]);
 const c=useThemeMode()==='dark'?OPERATIONS_DARK:LIGHT;
 const {heading,errorStyle,card,row,rowItem,pill,selected,input,button,white,bold,link,copy,pillText}=makeStyles(c);
 const lookup=async()=>{setError('');setHistory(null);try{const r=await resolveEquipmentIdentifier(identifier.trim(),technology);setResult(r.data);}catch(e:any){setResult({state:e?.response?.data?.state||'unknown',message:e?.response?.data?.message||getApiErrorMessage(e,'No equipment matched this identifier.')});}};
 const search=async()=>{try{const r=await searchEquipment(query);setRows(r.data.items||[]);setError('');}catch(e:any){setError(getApiErrorMessage(e,'Equipment search failed.'));}};
 const openHistory=async(item=result?.equipment)=>{if(!item)return;try{setHistory((await getEquipmentTagHistory(item.equipmentId)).data);}catch(e:any){setError(getApiErrorMessage(e,'Tag history could not be loaded.'));}};
 const register=async()=>{if(!result?.equipment||!reason.trim())return;const active=history?.current?.find((x:any)=>x.technology===technology);const legacy=technology==='HF_RFID'?result.equipment.rfidTagUid:null;const expected=active?.id||legacy;try{await assignEquipmentTag(result.equipment.equipmentId,{technology,identifier:newValue,reason,confirmReplacement:!!expected&&confirm,expectedCurrentIdentifier:expected});setReason('');setNewValue('');setConfirm(false);await openHistory();}catch(e:any){setError(getApiErrorMessage(e,'Tag assignment failed.'));}};
 return <ScrollView nativeID="ex-scan" style={{flex:1,backgroundColor:c.bg}}
  contentContainerStyle={layout.page} keyboardShouldPersistTaps="handled">
  <TouchableOpacity accessibilityRole="button" onPress={onBack}><Text style={link}>‹ Back</Text></TouchableOpacity>
  <View nativeID="ex-scan-hero" style={layout.hero}>
    <Image nativeID="ex-scan-hero-photo" source={SURVEYOR_ART} resizeMode="cover" style={layout.photo} accessible={false}/>
    <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={StyleSheet.absoluteFill}/>
    <Text style={layout.eyebrow}>ASSET LOOKUP  /  TAGS</Text>
    <Text accessibilityRole="header" style={layout.title}>Equipment <Text style={layout.accent}>Identification</Text></Text>
    <Text style={layout.description}>Manual web lookup and tag management. NFC and camera QR capture are available only in the Android app.</Text>
  </View>
  {!!error&&<Text accessibilityRole="alert" style={errorStyle}>{error}</Text>}
  <EquipmentIdentificationWorkspace online={online} canManage={canManage} onOpenInspection={onOpenInspection}>
  <View nativeID="ex-scan-lookups" style={layout.lookups}>
    <View style={card}>
      <Text accessibilityRole="header" style={heading}><Text style={link}>⌗  </Text>Look up an Identifier</Text>
      <View style={row}>{(['HF_RFID','NFC','QR'] as Technology[]).map(x=>(
        <TouchableOpacity key={x} accessibilityRole="button" accessibilityState={{selected:technology===x}}
          onPress={()=>setTechnology(x)} style={[pill,technology===x&&selected]}>
          <Text style={technology===x?white:pillText}>{x}</Text>
        </TouchableOpacity>
      ))}</View>
      <TextInput accessibilityLabel="Tag identifier" value={identifier} onChangeText={setIdentifier} onSubmitEditing={()=>void lookup()}
        placeholder={technology==='QR'?'QR code value':'RFID / NFC UID'} placeholderTextColor={c.muted} style={input}/>
      <TouchableOpacity accessibilityRole="button" onPress={()=>void lookup()} style={button}><Text style={white}>Look up tag  →</Text></TouchableOpacity>
    </View>
    <View style={card}>
      <Text accessibilityRole="header" style={heading}><Text style={link}>⌕  </Text>Manual Equipment Search</Text>
      <TextInput accessibilityLabel="Equipment tag or item number" value={query} onChangeText={setQuery} onSubmitEditing={()=>void search()}
        placeholder="Equipment tag or item number" placeholderTextColor={c.muted} style={input}/>
      <TouchableOpacity accessibilityRole="button" onPress={()=>void search()} style={button}><Text style={white}>Search Register  →</Text></TouchableOpacity>
      {rows.map(x=><TouchableOpacity key={x.equipmentId} accessibilityRole="button"
        onPress={()=>{setResult({state:'matched',equipment:x});setHistory(null);}} style={rowItem}>
        <Text style={bold}>{x.tagNumber} · {x.type}</Text>
        <Text style={copy}>{projectDisplay(x.projectName)} · {projectDisplay(x.areaName)} · {projectDisplay(x.location)||'Location unavailable'}</Text>
      </TouchableOpacity>)}
    </View>
  </View>
  {!!result&&<View style={card}><Text style={heading}>Result · {result.state}</Text>{!!result.message&&<Text style={copy}>{result.message}</Text>}{result.equipment&&<><Text style={bold}>{result.equipment.tagNumber} · {result.equipment.type}</Text><Text style={copy}>{projectDisplay(result.equipment.projectName)||''} · {projectDisplay(result.equipment.areaName)||''} · {projectDisplay(result.equipment.location)||'Location unavailable'}</Text>{(result.activeTasks||[]).map((t:any)=><Text key={t.taskId} style={copy}>{t.grade} · {t.status} · due {t.dueAt||'not set'}</Text>)}<TouchableOpacity onPress={()=>onOpenInspection(result.equipment.equipmentId, {...result.equipment, rfidTagUid: result.equipment.rfidTagUid || (technology!=='QR'?identifier:undefined)})} style={button}><Text style={white}>Open inspection history</Text></TouchableOpacity>{canManage&&<TouchableOpacity onPress={()=>void openHistory()} style={pill}><Text style={pillText}>Manage tags and view history</Text></TouchableOpacity>}</>}</View>}
  {history&&canManage&&<View style={card}><Text style={heading}>Tag history · {history.equipment.tagNumber}</Text><TextInput value={newValue} onChangeText={setNewValue} placeholder="New UID or QR value" placeholderTextColor={c.muted} style={input}/><TextInput value={reason} onChangeText={setReason} placeholder="Reason for assignment or replacement" placeholderTextColor={c.muted} style={input}/>{(history.current||[]).map((x:any)=><View key={x.id} style={rowItem}><Text style={copy}>Active {x.technology}: {x.normalizedIdentifier}</Text><TouchableOpacity onPress={()=>void(async()=>{if(!reason.trim()){setError('Enter a reason before deactivating.');return;}await deactivateEquipmentTag(history.equipment.id,x.id,{reason});await openHistory(history.equipment);})()}><Text style={errorStyle}>Deactivate</Text></TouchableOpacity></View>)}{(history.current||[]).some((x:any)=>x.technology===technology)||(technology==='HF_RFID'&&history.equipment.rfidTagUid)?<TouchableOpacity onPress={()=>setConfirm(x=>!x)} style={pill}><Text style={pillText}>{confirm?'✓':'□'} Confirm current tag replacement</Text></TouchableOpacity>:null}<TouchableOpacity onPress={()=>void register()} style={button}><Text style={white}>Register / replace tag</Text></TouchableOpacity>{(history.history||[]).map((x:any)=><View key={x.id} style={rowItem}><Text style={bold}>{x.actionCode} · {x.technology} · {x.normalizedIdentifier}</Text><Text style={copy}>{x.reason} · {new Date(x.occurredAt).toLocaleString()}</Text></View>)}</View>}
 </EquipmentIdentificationWorkspace>
 </ScrollView>;
}
const layout=StyleSheet.create({
  page:{padding:16,gap:14,width:'100%',alignSelf:'center'},
  hero:{minHeight:156,padding:20,gap:5,justifyContent:'center',borderWidth:1,borderColor:'#126078',
    borderRadius:17,backgroundColor:'#03192C',overflow:'hidden'},
  photo:{position:'absolute',right:0,width:'78%',height:'100%'},
  eyebrow:{color:'#00D9EE',fontFamily:visual.mono,fontSize:11,fontWeight:'800',letterSpacing:1.6},
  title:{color:'#F5FAFF',fontFamily:visual.display,fontWeight:'900',fontStyle:'italic',fontSize:34},
  accent:{color:'#00D9EE'},
  description:{color:'#F5FAFF',fontSize:13,lineHeight:19,maxWidth:525},
  lookups:{gap:14},
});
function makeStyles(c:Colors){
  return StyleSheet.create({
    heading:{fontSize:19,fontWeight:'800',color:c.text},
    copy:{color:c.secondary},
    errorStyle:{color:c.critical,fontWeight:'700'},
    card:{padding:15,borderWidth:1,borderColor:c.border,borderRadius:16,gap:11,backgroundColor:c.card,minWidth:0},
    row:{flexDirection:'row',gap:8,flexWrap:'wrap'},
    rowItem:{padding:10,borderTopWidth:1,borderColor:c.border,gap:5},
    pill:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,backgroundColor:c.elevated,borderWidth:1,borderColor:c.border},
    pillText:{color:c.text,fontWeight:'700'},
    selected:{backgroundColor:'#00D9EE',borderColor:'#00D9EE'},
    input:{paddingHorizontal:11,borderWidth:1,borderColor:c.border,borderRadius:10,minHeight:42,color:c.text,backgroundColor:c.elevated},
    button:{padding:11,backgroundColor:'#00D9EE',borderRadius:10,alignSelf:'flex-start'},
    white:{color:'#03192C',fontWeight:'800'},
    bold:{color:c.text,fontWeight:'800'},
    link:{color:c.cyan,fontWeight:'800'},
  });
}
