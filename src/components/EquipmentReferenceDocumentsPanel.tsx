import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import apiClient from '../api/client';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {archiveEquipmentReferenceDocument, approveEquipmentDocumentPolicy, approveEquipmentReferenceDocument, createEquipmentDocumentPolicy, downloadEquipmentReferenceDocument, equipmentDocumentCategories, getEquipmentDocumentPolicies, getEquipmentReferenceDocumentHistory, getEquipmentReferenceDocuments, submitEquipmentReferenceDocument, uploadEquipmentReferenceDocument} from '../api/equipmentDocuments';

type Props = {projectId: string; areaId: string; equipmentId: string; role?: string; dark?: boolean};
const lightButton={paddingHorizontal:12,paddingVertical:9,borderRadius:7,backgroundColor:'#edf1ff'} as const;
const lightLabel={color:'#26335d',fontWeight:'700' as const,fontSize:12};

export default function EquipmentReferenceDocumentsPanel({projectId,areaId,equipmentId,role,dark=false}:Props){
  const c = OPERATIONS_DARK;
  const button = dark ? {...lightButton, backgroundColor:c.elevated} : lightButton;
  const label = dark ? {...lightLabel, color:c.text} : lightLabel;
  const [rows,setRows]=useState<any[]>([]);const [policies,setPolicies]=useState<any[]>([]);const [categoryOptions,setCategoryOptions]=useState<Array<{value:string;label:string}>>(equipmentDocumentCategories as any);const [category,setCategory]=useState('');const [search,setSearch]=useState('');const [title,setTitle]=useState('');const [documentNumber,setDocumentNumber]=useState('');const [revision,setRevision]=useState('');const [issueDate,setIssueDate]=useState('');const [expiryDate,setExpiryDate]=useState('');const [issuingOrganization,setIssuingOrganization]=useState('');const [categoryCode,setCategoryCode]=useState<string>(equipmentDocumentCategories[0].value);const [replaceId,setReplaceId]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const canManage=['admin','manager'].includes((role||'').toLowerCase());
  const load=useCallback(async()=>{try{const result=await getEquipmentReferenceDocuments(equipmentId,category||undefined);setRows(result.data.items||[]);const configured=result.data.categories||[];if(configured.length){const choices=configured.map(value=>({value,label:equipmentDocumentCategories.find(x=>x.value===value)?.label||value}));setCategoryOptions(choices);if(!choices.some(x=>x.value===categoryCode))setCategoryCode(choices[0].value);}if(canManage){const ruleResult=await getEquipmentDocumentPolicies(projectId);setPolicies(ruleResult.data||[]);}setError('');}catch(e){setError(getApiErrorMessage(e,'Could not load equipment documents.'));}},[equipmentId,category,categoryCode,canManage,projectId]);
  useEffect(()=>{void load();},[load]);
  const webInput = useRef<HTMLInputElement>(null);
  const upload = async (fileName: string, part: Blob) => {
    const form = new FormData();
    form.append('projectId', projectId);
    form.append('areaId', areaId);
    form.append('equipmentId', equipmentId);
    form.append('title', title.trim() || fileName);
    form.append('categoryCode', categoryCode);
    if (replaceId) form.append('supersedesDocumentId', replaceId);
    if (documentNumber) form.append('documentNumber', documentNumber);
    if (revision) form.append('revision', revision);
    if (issueDate) form.append('issueDate', issueDate);
    if (expiryDate) form.append('expiryDate', expiryDate);
    if (issuingOrganization) form.append('issuingOrganization', issuingOrganization);
    form.append('file', part);
    setBusy(true);
    setError('');
    try {
      await uploadEquipmentReferenceDocument(form);
      setTitle('');
      setReplaceId('');
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Could not upload the reference document.'));
    } finally {
      setBusy(false);
    }
  };
  const choose = async () => {
    if (Platform.OS === 'web') {
      webInput.current?.click();
      return;
    }
    const picker = await import('@react-native-documents/picker');
    try {
      const [file] = await picker.pick({type: [picker.types.pdf, picker.types.images], mode: 'import'});
      if (file?.uri && file.name) {
        await upload(file.name, {uri: file.uri, name: file.name, type: file.type || 'application/octet-stream'} as unknown as Blob);
      }
    } catch (error) {
      if (picker.isErrorWithCode(error) && error.code === picker.errorCodes.OPERATION_CANCELED) return;
      setError(getApiErrorMessage(error, 'Could not choose the reference document.'));
    }
  };
  const action=async(fn:()=>Promise<any>)=>{setBusy(true);setError('');try{await fn();await load();}catch(e){setError(getApiErrorMessage(e,'The document action failed.'));}finally{setBusy(false);}};
  const open=async(id:string,name:string)=>{try{const response=await downloadEquipmentReferenceDocument(id);if(Platform.OS==='web'){const url=URL.createObjectURL(response.data as Blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);}else{Alert.alert('Document available online','Secure offline storage is not enabled for this reference library on this device. Use the assigned offline package after it includes the approved document.');}}catch(e){setError(getApiErrorMessage(e,`Could not retrieve ${name}.`));}};
  const visibleRows=rows.filter(row=>[row.title,row.documentNumber,row.revision,row.originalFileName].some(value=>!search.trim()||String(value||'').toLowerCase().includes(search.trim().toLowerCase())));
  return <View style={{padding:18,borderWidth:1,borderColor:dark?c.border:'#e0e6f2',borderRadius:15,backgroundColor:dark?c.card:'#fff',gap:10}}>
    <Text accessibilityRole="header" style={{fontSize:20,fontWeight:'800',color:label.color}}>Equipment reference documents</Text>
    <Text style={{color:dark?c.secondary:'#65708a'}}>Approved current revisions are used in offline package manifests. Historical revisions remain available for traceability.</Text>
    <TextInput value={search} onChangeText={setSearch} placeholder="Search title, document number or revision" placeholderTextColor={dark?c.muted:"#8a91a4"} style={{borderWidth:1,borderColor:dark?c.border:'#d9dfec',borderRadius:6,padding:9,color:dark?c.text:'#26335d',backgroundColor:dark?c.bg:'#fff'}}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><TouchableOpacity style={button} onPress={()=>setCategory('')}><Text style={label}>All</Text></TouchableOpacity>{categoryOptions.map(x=><TouchableOpacity key={x.value} style={button} onPress={()=>setCategory(x.value)}><Text style={label}>{x.label}</Text></TouchableOpacity>)}</View>
    {canManage&&<View style={{padding:12,backgroundColor:dark?c.bg:'#f7f8fc',borderRadius:8,gap:8}}>
      <Text style={label}>Add a document revision</Text>
      <TextInputField dark={dark} value={title} onChange={setTitle} placeholder="Document title"/><TextInputField dark={dark} value={documentNumber} onChange={setDocumentNumber} placeholder="Document number (if known)"/><TextInputField dark={dark} value={revision} onChange={setRevision} placeholder="Revision (if known)"/>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><TextInputField dark={dark} value={issueDate} onChange={setIssueDate} placeholder="Issue date YYYY-MM-DD"/><TextInputField dark={dark} value={expiryDate} onChange={setExpiryDate} placeholder="Expiry date YYYY-MM-DD"/></View>
      <TextInputField dark={dark} value={issuingOrganization} onChange={setIssuingOrganization} placeholder="Issuing organization (if known)"/>
      <ScrollView horizontal><View style={{flexDirection:'row',gap:5}}>{categoryOptions.map(x=><TouchableOpacity key={x.value} style={[button,categoryCode===x.value&&{backgroundColor:dark?c.borderActive:'#dce5ff'}]} onPress={()=>setCategoryCode(x.value)}><Text style={label}>{x.label}</Text></TouchableOpacity>)}</View></ScrollView>
      {Platform.OS === 'web' && React.createElement('input', {
        ref: webInput, type: 'file', accept: 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp',
        disabled: busy, style: {display: 'none'},
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void upload(file.name, file);
        },
      })}
      <TouchableOpacity disabled={busy} style={[button,{backgroundColor:'#2f3c72'}]} onPress={()=>void choose()}><Text style={{color:'#fff',fontWeight:'800'}}>Choose and upload PDF or image</Text></TouchableOpacity>
      <Text style={{fontSize:12,color:dark?c.secondary:'#6f7890'}}>New uploads start as Draft. Submit them for independent technical approval before they become current.</Text>
      {!!replaceId&&<TouchableOpacity onPress={()=>setReplaceId('')}><Text style={{color:dark?c.critical:'#b42318'}}>Cancel replacement</Text></TouchableOpacity>}
      <Text style={[label,{marginTop:6}]}>Document readiness rules (approved rules only are enforced)</Text>
      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}><TouchableOpacity style={button} disabled={busy} onPress={()=>void action(()=>createEquipmentDocumentPolicy({projectId,equipmentType:null,workPackageId:null,categoryCode,isRequired:true}))}><Text style={label}>Add required rule for {categoryOptions.find(x=>x.value===categoryCode)?.label||categoryCode}</Text></TouchableOpacity><TouchableOpacity style={button} disabled={busy} onPress={()=>void action(()=>createEquipmentDocumentPolicy({projectId,equipmentType:null,workPackageId:null,categoryCode,isRequired:false}))}><Text style={label}>Add optional rule</Text></TouchableOpacity></View>
      {policies.map(policy=><View key={policy.id} style={{flexDirection:'row',alignItems:'center',gap:6}}><Text style={{flex:1,fontSize:12,color:dark?c.secondary:'#65708a'}}>{policy.categoryCode} · {policy.isRequired?'Required':'Optional'} · {policy.isApproved?'Approved':'Draft'}</Text>{!policy.isApproved&&role?.toLowerCase()==='admin'&&<TouchableOpacity style={button} onPress={()=>void action(()=>approveEquipmentDocumentPolicy(policy.id))}><Text style={label}>Approve rule</Text></TouchableOpacity>}</View>)}
    </View>}
    {busy&&<ActivityIndicator/>}{!!error&&<Text accessibilityRole="alert" style={{color:dark?c.critical:'#b42318'}}>{error}</Text>}
    {visibleRows.length===0?<Text style={{color:dark?c.secondary:'#6f7890'}}>No matching equipment, area or project reference documents.</Text>:visibleRows.map(row=><View key={row.id} style={{padding:11,borderTopWidth:1,borderColor:dark?c.border:'#e6e9f0',gap:5}}>
      <Text style={{fontWeight:'800',color:dark?c.text:'#26335d'}}>{row.title} · Rev {row.revision||'not supplied'}</Text><Text style={{color: row.expiryDate&&new Date(`${row.expiryDate}T23:59:59Z`)<new Date()?(dark?c.critical:'#b42318'):(dark?c.secondary:'#65708a')}}>{row.category} · {row.status}{row.expiryDate?` · ${new Date(`${row.expiryDate}T23:59:59Z`)<new Date()?'EXPIRED · ':''}Expiry ${row.expiryDate}`:''}{row.documentNumber?` · ${row.documentNumber}`:''}</Text><Text style={{fontSize:12,color:dark?c.secondary:'#65708a'}}>SHA-256 {row.sha256} · {row.originalFileName}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}><TouchableOpacity style={button} onPress={()=>void open(row.id,row.title)}><Text style={label}>Preview / download</Text></TouchableOpacity><TouchableOpacity style={button} onPress={()=>void action(async()=>{const history=(await getEquipmentReferenceDocumentHistory(row.id)).data;const entries=(history.events||[]).map((x:any)=>`${x.eventCode} · ${new Date(x.occurredAt).toLocaleString()} · ${x.actorUserId}${x.comments?` · ${x.comments}`:''}`).concat((history.uses||[]).map((x:any)=>`Opened during activity ${x.activityId} · Rev ${x.documentRevision} · ${new Date(x.openedAt).toLocaleString()}`)).concat((history.revisions||[]).map((x:any)=>`Revision ${x.revision||'not supplied'} · ${x.status} · SHA-256 ${x.sha256}`));Alert.alert('Document history',entries.join('\n')||'No history recorded.');})}><Text style={label}>View history</Text></TouchableOpacity>
      {canManage&&row.status==='Draft'&&<TouchableOpacity style={button} onPress={()=>void action(()=>submitEquipmentReferenceDocument(row.id))}><Text style={label}>Submit for approval</Text></TouchableOpacity>}
      {canManage&&row.status==='Submitted'&&role?.toLowerCase()==='admin'&&<TouchableOpacity style={button} onPress={()=>void action(()=>approveEquipmentReferenceDocument(row.id))}><Text style={label}>Approve</Text></TouchableOpacity>}
      {canManage&&row.status==='Approved'&&<TouchableOpacity style={button} onPress={()=>{setReplaceId(row.id);setCategoryCode(row.category);setTitle(row.title);setDocumentNumber(row.documentNumber||'');}}><Text style={label}>Upload replacement revision</Text></TouchableOpacity>}
      {canManage&&!['Archived','Superseded'].includes(row.status)&&<TouchableOpacity style={button} onPress={()=>void action(()=>archiveEquipmentReferenceDocument(row.id))}><Text style={label}>Archive</Text></TouchableOpacity>}</View>
    </View>)}
  </View>;
}

function TextInputField({value,onChange,placeholder,dark}:{value:string;onChange:(value:string)=>void;placeholder:string;dark:boolean}){const c = OPERATIONS_DARK;return <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={dark?c.muted:"#8a91a4"} style={{minWidth:180,flex:1,borderWidth:1,borderColor:dark?c.border:'#d9dfec',borderRadius:6,padding:9,color:dark?c.text:'#26335d',backgroundColor:dark?c.bg:'#fff'}}/>;}
