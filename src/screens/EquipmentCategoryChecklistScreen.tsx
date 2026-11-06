import React, {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import apiClient from '../api/client';
import {getEquipmentRegistrationProjects} from '../api/equipmentIdentification';
import {getApiErrorMessage} from '../api/errors';
import {getHaerRegister, HaerRegisterRow} from '../api/reports';
import {allCheckpoints as all, ChecklistCatalog, getChecklistCatalog} from '../api/equipmentChecklistCatalog';
import ChecklistCatalogEditor, {CatalogEdit} from '../components/ChecklistCatalogEditor';
import HaerGrid from '../components/HaerGrid';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

const sections = [['Apparatus','A – APPARATUS'],['Installation','B – INSTALLATION'],['Environment','C – ENVIRONMENT']];
const columns = [{label:'Checkpoint No.',width:145},{label:'Items to Be Checked',width:580},{label:'Checkpoint Category',width:175}];
type Point = {code:string; section:string; itemNumber:number; text:string; protectionApplicability:string; isCustom?:boolean; catalogCategoryId?:string};
type Selection = {points:Point[]; selectedCodes:string[]; version:number};
export const equipmentSelectionUrl = (project:string) => `/v1/inspection-activities/category-checklist/projects/${project}/selection`;
const equipmentLabel = (e:HaerRegisterRow) =>
  [e.equipmentName || e.description || e.equipmentType, e.itemNumber, e.tagNumber, e.area].filter(Boolean).join(' · ');

export default function EquipmentCategoryChecklistScreen({onBack, canManageCatalog = false}: {onBack?:()=>void; canManageCatalog?:boolean}) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [catalog,setCatalog] = useState<ChecklistCatalog>();
  const [catalogEdit,setCatalogEdit] = useState<CatalogEdit>();
  const [catalogRefresh,setCatalogRefresh] = useState(0);
  const categoryLabel = (id:string) => catalog?.categories.find(category=>category.id===id)?.name ?? id;
  const [projects,setProjects] = useState<{id:string;projectName:string;clientName?:string|null}[]>([]);
  const [equipment,setEquipment] = useState<HaerRegisterRow[]>([]);
  const [project,setProject] = useState('');
  const [item,setItem] = useState('');
  const [selection,setSelection] = useState<Selection>();
  const [selected,setSelected] = useState<string[]>([]);
  const [category,setCategory] = useState('');
  const [selectedOnly,setSelectedOnly] = useState(false);
  const [picker,setPicker] = useState<'project'|'equipment'|'category'|'rowCategory'>();
  const [editingCode,setEditingCode] = useState('');
  const [categoryChanges,setCategoryChanges] = useState<Record<string,string>>({});
  const hasCategoryChanges = Object.keys(categoryChanges).length > 0;
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const dirty = hasCategoryChanges || !!selection && (selected.length !== selection.selectedCodes.length || selected.some(code => !selection.selectedCodes.includes(code)));

  useEffect(() => {
    let active = true;
    getChecklistCatalog().then(({data})=>{if(active)setCatalog(data);})
      .catch(e=>{if(active)setError(getApiErrorMessage(e,'Could not load checkpoint categories.'));});
    return ()=>{active=false;};
  }, [catalogRefresh]);
  useEffect(() => {
    getEquipmentRegistrationProjects().then(({data})=>setProjects(data)).catch(e=>setError(getApiErrorMessage(e,'Could not load projects.')));
  }, []);
  useEffect(() => {
    let active = true;
    if (project) getHaerRegister(project).then(({data})=>{if(active) setEquipment(data.equipment);})
      .catch(e=>{if(active) setError(getApiErrorMessage(e,'Could not load equipment.'));});
    return ()=>{active=false;};
  }, [project]);
  useEffect(() => {
    let active = true;
    if (project && item) apiClient.get<Selection>(equipmentSelectionUrl(project),{params:{equipmentId:item}})
      .then(({data})=>{if(active){setSelection(data);setSelected(data.selectedCodes);setSelectedOnly(data.version>0 && !catalogRefresh);setCategory(data.version>0 || catalogRefresh ? all : '');}})
      .catch(e=>{if(active) setError(getApiErrorMessage(e,'Could not load checkpoints.'));});
    return ()=>{active=false;};
  }, [project,item,catalogRefresh]);

  function choose(id:string) {
    if (picker === 'rowCategory') {
      setCategoryChanges(old => {
        const next = {...old};
        const original = selection?.points.find(point => point.code === editingCode);
        if (original && original.protectionApplicability === id) delete next[editingCode];
        else next[editingCode] = id;
        return next;
      });
      setNotice('');
      setPicker(undefined);
      return;
    }
    if (picker === 'category') {
      setCategory(id);
      setSelectedOnly(false);
      setNotice('');
      if (id !== all)
        setSelected((selection?.points ?? []).filter(point => point.protectionApplicability === id).map(point => point.code));
      setPicker(undefined);
      return;
    }
    if (picker === 'project' && id === project || picker === 'equipment' && id === item) {setPicker(undefined);return;}
    if (picker === 'project') {setProject(id);setItem('');setEquipment([]);} else setItem(id);
    setCategoryChanges({});setSelection(undefined);setSelected([]);setSelectedOnly(false);setCategory('');setError('');setNotice('');setPicker(undefined);
  }
  const shown = (category ? selection?.points ?? [] : []).filter(p=>(category===all || p.protectionApplicability===category) &&
    (!selectedOnly || selected.includes(p.code)));
  function toggle(codes:string[], checked:boolean) {
    setSelected(old=>checked ? [...new Set([...old,...codes])] : old.filter(code=>!codes.includes(code)));
    setNotice('');
  }
  async function save() {
    if (!selection || (!selected.length && !hasCategoryChanges) || busy) return;
    setBusy(true);setError('');setNotice('');
    try {
      const {data} = await apiClient.put<{version:number}>(equipmentSelectionUrl(project),
        {codes:selected,version:selection.version,categoryChanges},{params:{equipmentId:item}});
      const points = selection.points.map(point => categoryChanges[point.code]
        ? {...point, protectionApplicability:categoryChanges[point.code]} : point);
      setSelection({...selection,points,selectedCodes:[...selected],version:data.version});
      setCategoryChanges({});
      setSelectedOnly(!hasCategoryChanges);setCategory(all);
      setNotice(hasCategoryChanges ? 'Checkpoint category changes saved.' : `${selected.length} checkpoints saved for this equipment.`);
    } catch(e) {setError(getApiErrorMessage(e,'Could not save checkpoints.'));}
    finally {setBusy(false);}
  }
  const line = {flexDirection:'row' as const,flexWrap:'wrap' as const,alignItems:'center' as const,gap:8};
  const text = (value:string) => <Text style={{color:c.text}}>{value}</Text>;
  const button = (label:string, action:()=>void, disabled=false, active=false) =>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{padding:10,minHeight:42,borderRadius:6,borderWidth:1,
      borderColor:c.border,backgroundColor:active?'#173454':c.card,opacity:disabled?.5:1}}>
      <Text style={{color:active?'#fff':c.text,fontWeight:'700'}}>{label}</Text>
    </Pressable>;
  const dropdown = (label:string,value:string,kind:'project'|'equipment'|'category',disabled:boolean) =>
    <View style={{flexGrow:1,flexBasis:260,gap:5}}>
      <Text style={{color:c.secondary,fontWeight:'700'}}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={()=>{setSearch('');setPicker(kind);}}
        style={{...line,justifyContent:'space-between',minHeight:52,padding:12,borderWidth:1,borderColor:c.border,borderRadius:7,
          backgroundColor:c.card,opacity:disabled?.5:1}}>
        <Text style={{color:value?c.text:c.muted,flex:1,fontWeight:'600'}}>{value || label}</Text>{text('▾')}
      </Pressable>
    </View>;
  const currentProject = projects.find(p=>p.id===project);
  const record = equipment.find(e=>e.equipmentRecordId===item);
  const choices = picker === 'project' ? projects.map(p=>({id:p.id,label:p.projectName})) :
    (picker === 'category' || picker === 'rowCategory') ? [...(picker==='category'?[{id:all,label:all}]:[]), ...(catalog?.categories ?? []).map(value=>({id:value.id,label:value.name}))] :
    equipment.map(e=>({id:e.equipmentRecordId,label:equipmentLabel(e)}));
  const matching = choices.filter(x=>x.label.toLowerCase().includes(search.trim().toLowerCase()));

  return <ScrollView style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:18,gap:14}}>
    {onBack && button('Back',onBack,busy)}
    <Text accessibilityRole="header" style={{fontSize:28,fontWeight:'800',color:c.text}}>Equipment Checklist</Text>
    {canManageCatalog && <View style={line}>
      {button('+ Add Category',()=>setCatalogEdit({kind:'category'}),busy||dirty||!catalog)}
      {button('+ Add Checkpoint',()=>setCatalogEdit({kind:'checkpoint'}),busy||dirty||!catalog)}
    </View>}
    <View style={line}>
      {dropdown('Select Project',currentProject?.projectName || '','project',busy)}
      <View style={{flexGrow:1,flexBasis:260,gap:5}}>
        <Text style={{color:c.secondary,fontWeight:'700'}}>Client Name</Text>
        <View style={{minHeight:52,padding:12,borderWidth:1,borderColor:c.border,borderRadius:7,backgroundColor:c.card,justifyContent:'center'}}>
          <Text accessibilityLiveRegion="polite" style={{color:c.text}}>
            {project ? currentProject?.clientName?.trim() || 'No client assigned' : 'Select a project'}
          </Text>
        </View>
      </View>
    </View>
    <View style={line}>
      {dropdown('Select Equipment',record?equipmentLabel(record):'','equipment',!project||busy)}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
    {!item && text('Select a project and equipment to choose checkpoints.')}
    {!!item && !selection && !error && text('Loading checkpoints…')}
    {!!selection && <>
      <View style={line}>{dropdown('Select Checkpoint Category',categoryLabel(category),'category',busy||!catalog)}</View>
      {text('Choosing an Ex category replaces the current selection. All Checkpoints lets you browse and select individual rows.')}
      <View style={line}>
        {button('Select All',()=>toggle(shown.map(p=>p.code),true),busy||!shown.length)}
        {button('Deselect All',()=>toggle(shown.map(p=>p.code),false),busy||!shown.length)}
        {button(selectedOnly?'Show All Checkpoints':'Show Selected Only',()=>{setCategory(all);setSelectedOnly(!selectedOnly);},busy,selectedOnly)}
        <Text accessibilityLiveRegion="polite" style={{color:c.text,fontWeight:'800'}}>{selected.length} selected{selection.version>0?` · ${selection.selectedCodes.length} saved`:''}</Text>
      </View>
      {!category && text('Choose a checkpoint category to show its checkpoints.')}
      {selectedOnly && !shown.length && text('No selected checkpoints match this view.')}
      {sections.map(([section,label])=>{
        const points = shown.filter(p=>p.section===section);
        return !!points.length && <View key={section} style={{gap:5}}>
          <Text accessibilityRole="header" style={{color:c.text,fontWeight:'800'}}>{label}</Text>
          <HaerGrid fullWidth label={label} colors={c} columns={columns} rows={points.map(p=>{
            const checked=selected.includes(p.code);
            const change=()=>toggle([p.code],!checked);
            return {id:p.code,selected:checked,onPress:busy?undefined:change,cells:[
              <Pressable accessibilityRole="checkbox" accessibilityLabel={`${p.section} ${p.itemNumber}`} accessibilityState={{checked,disabled:busy}}
                disabled={busy} onPress={event=>{event.stopPropagation();change();}} style={{...line,minHeight:34}}>
                <View style={{width:22,height:22,borderWidth:1,borderColor:c.secondary,borderRadius:4,alignItems:'center',justifyContent:'center',
                  backgroundColor:checked?'#173454':c.card}}><Text style={{color:'#fff'}}>{checked?'✓':''}</Text></View>
                {text(String(p.itemNumber))}
              </Pressable>,
              text(p.text),<View style={{gap:4}}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Change category for ${p.section} ${p.itemNumber}`} disabled={busy}
                  onPress={event=>{event.stopPropagation();setEditingCode(p.code);setSearch('');setPicker('rowCategory');}}
                  style={{padding:8,borderWidth:1,borderColor:categoryChanges[p.code]?c.cyan:c.border,borderRadius:5,backgroundColor:c.card}}>
                  {text(`${categoryLabel(categoryChanges[p.code] || p.protectionApplicability)} ▾`)}
                </Pressable>
                {canManageCatalog && p.isCustom && button('Edit checkpoint',()=>setCatalogEdit({kind:'checkpoint',point:{...p,protectionApplicability:p.catalogCategoryId ?? p.protectionApplicability}}),busy||dirty||!catalog)}
                {!!categoryChanges[p.code] && <Text style={{color:c.cyan,fontSize:11}}>Unsaved change</Text>}
              </View>,
            ]};
          })}/>
        </View>;
      })}
      {!!notice && <Text accessibilityLiveRegion="polite" style={{color:c.success,fontWeight:'700'}}>{notice}</Text>}
      <View style={line}>
        {button(busy?'Saving…':hasCategoryChanges?'Save Changes':'Save Selected Checkpoints',()=>void save(),busy||(!selected.length&&!hasCategoryChanges)||!dirty,true)}
        {dirty && button('Cancel Changes',()=>{setSelected(selection.selectedCodes);setCategoryChanges({});setError('');},busy)}
      </View>
    </>}
    {!!catalog && !!catalogEdit && <ChecklistCatalogEditor edit={catalogEdit} catalog={catalog} colors={c}
      onClose={()=>setCatalogEdit(undefined)} onSaved={()=>{
        setCatalogEdit(undefined);setCatalogRefresh(value=>value+1);setError('');setNotice('Checklist catalog updated.');
      }}/>}
    <Modal transparent visible={!!picker} onRequestClose={()=>setPicker(undefined)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:16}}>
        <View style={{backgroundColor:c.card,padding:16,borderRadius:8,gap:10,maxHeight:'85%',width:'100%',maxWidth:700,alignSelf:'center'}}>
          <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>{picker==='project'?'Select Project':(picker==='category'||picker==='rowCategory')?'Select Checkpoint Category':'Select Equipment'}</Text>
          {picker !== 'category' && picker !== 'rowCategory' && <TextInput autoFocus accessibilityLabel={`Search ${picker}`} placeholder={picker==='project'?'Search projects':'Search name, item, Ex-Tag, or area'}
            placeholderTextColor={c.muted} value={search} onChangeText={setSearch} style={{borderWidth:1,borderColor:c.border,borderRadius:6,padding:10,color:c.text}}/>}
          {picker !== 'category' && picker !== 'rowCategory' && !!dirty && text('Selecting a different item will discard unsaved changes.')}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:6}}>
            {!matching.length && text('No matching options.')}
            {matching.map(x=><View key={x.id}>{button(x.label,()=>choose(x.id))}</View>)}
          </ScrollView>
          {button('Close',()=>setPicker(undefined))}
        </View>
      </View>
    </Modal>
  </ScrollView>;
}
