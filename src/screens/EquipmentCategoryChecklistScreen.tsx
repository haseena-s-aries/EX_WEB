import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import React, {useEffect, useState} from 'react';
import {Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import apiClient from '../api/client';
import {getEquipmentRegistrationProjects} from '../api/equipmentIdentification';
import {getApiErrorMessage} from '../api/errors';
import {getHaerRegister, HaerRegisterRow} from '../api/reports';
import {allCheckpoints as all, ChecklistCatalog, getChecklistCatalog} from '../api/equipmentChecklistCatalog';
import ChecklistCatalogEditor, {CatalogEdit} from '../components/ChecklistCatalogEditor';
import HaerGrid from '../components/HaerGrid';
import {LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import {projectDisplay} from '../utils/projectDisplay';

const sections = [['Apparatus','A – APPARATUS'],['Installation','B – INSTALLATION'],['Environment','C – ENVIRONMENT']];
const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');
const columns = [{label:'Checkpoint No.',width:145},{label:'Items to Be Checked',width:580},{label:'Checkpoint Category',width:175}];
type Point = {code:string; section:string; itemNumber:number; text:string; protectionApplicability:string; isCustom?:boolean; catalogCategoryId?:string};
type Selection = {points:Point[]; selectedCodes:string[]; version:number};
export const equipmentSelectionUrl = (project:string) => `/v1/inspection-activities/category-checklist/projects/${project}/selection`;
const equipmentLabel = (e:HaerRegisterRow) =>
  [e.equipmentName || e.description || e.equipmentType, e.itemNumber, e.tagNumber, e.area].filter(Boolean).join(' · ');

export default function EquipmentCategoryChecklistScreen({onBack, canManageCatalog = false, readOnly = false, initialProject = '', initialArea = '', initialEquipment = ''}:
  {onBack?:()=>void; canManageCatalog?:boolean; readOnly?:boolean; initialProject?:string; initialArea?:string; initialEquipment?:string}) {
  const c = useThemeMode() === 'dark' ? OPERATIONS_DARK : LIGHT;
  const [catalog,setCatalog] = useState<ChecklistCatalog>();
  const [catalogEdit,setCatalogEdit] = useState<CatalogEdit>();
  const [catalogRefresh,setCatalogRefresh] = useState(0);
  const categoryLabel = (id:string) => catalog?.categories.find(category=>category.id===id)?.name ?? id;
  const [projects,setProjects] = useState<{id:string;projectName:string;clientName?:string|null}[]>([]);
  const [equipment,setEquipment] = useState<HaerRegisterRow[]>([]);
  const [project,setProject] = useState(initialProject);
  const [item,setItem] = useState(initialEquipment);
  const [area,setArea] = useState(initialArea);
  const [selection,setSelection] = useState<Selection>();
  const [selected,setSelected] = useState<string[]>([]);
  const [category,setCategory] = useState('');
  const [selectedOnly,setSelectedOnly] = useState(false);
  const [picker,setPicker] = useState<'project'|'equipment'|'category'|'rowCategory'>();
  const [editingCode,setEditingCode] = useState('');
  const [categoryChanges,setCategoryChanges] = useState<Record<string,string>>({});
  const [descriptionChanges,setDescriptionChanges] = useState<Record<string,string>>({});
  const [descriptionEdit,setDescriptionEdit] = useState<{code:string;text:string}>();
  const hasCategoryChanges = Object.keys(categoryChanges).length > 0;
  const hasDescriptionChanges = Object.keys(descriptionChanges).length > 0;
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const dirty = hasCategoryChanges || hasDescriptionChanges || !!selection && (selected.length !== selection.selectedCodes.length || selected.some(code => !selection.selectedCodes.includes(code)));
  const projectLocked = !!initialProject;
  const equipmentLocked = !!initialEquipment;

  useEffect(() => {
    if (!initialEquipment || !equipment.length) return;
    const found = equipment.find(row=>row.equipmentRecordId===initialEquipment);
    if (found) { setItem(found.equipmentRecordId); setArea(found.areaId||initialArea); }
  }, [equipment,initialEquipment,initialArea]);

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
      .then(({data})=>{if(active){setSelection(data);setSelected(data.selectedCodes);setSelectedOnly(!readOnly && data.version>0 && !catalogRefresh);setCategory(readOnly || data.version>0 || catalogRefresh ? all : '');}})
      .catch(e=>{if(active) setError(getApiErrorMessage(e,'Could not load checkpoints.'));});
    return ()=>{active=false;};
  }, [project,item,catalogRefresh,readOnly]);

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
      if (!readOnly && id !== all)
        setSelected((selection?.points ?? []).filter(point => point.protectionApplicability === id).map(point => point.code));
      setPicker(undefined);
      return;
    }
    if (picker === 'project' && id === project || picker === 'equipment' && id === item) {setPicker(undefined);return;}
    if (picker === 'project') {setProject(id);setItem('');setArea('');setEquipment([]);} else {const record=equipment.find(row=>row.equipmentRecordId===id);setItem(id);setArea(record?.areaId||initialArea);}
    setCategoryChanges({});setDescriptionChanges({});setSelection(undefined);setSelected([]);setSelectedOnly(false);setCategory('');setError('');setNotice('');setPicker(undefined);
  }
  const shown = (category ? selection?.points ?? [] : []).filter(p=>(category===all || p.protectionApplicability===category) &&
    (!selectedOnly || selected.includes(p.code)));
  function toggle(codes:string[], checked:boolean) {
    if (readOnly) return;
    setSelected(old=>checked ? [...new Set([...old,...codes])] : old.filter(code=>!codes.includes(code)));
    setNotice('');
  }
  async function save() {
    if (readOnly) return;
    if (!selection || (!selected.length && !hasCategoryChanges && !hasDescriptionChanges) || busy) return;
    setBusy(true);setError('');setNotice('');
    try {
      const {data} = await apiClient.put<{version:number}>(equipmentSelectionUrl(project),
        {codes:selected,version:selection.version,categoryChanges,descriptionChanges},{params:{equipmentId:item}});
      const points = selection.points.map(point => ({...point,
        text:descriptionChanges[point.code] ?? point.text,
        protectionApplicability:categoryChanges[point.code] ?? point.protectionApplicability}));
      setSelection({...selection,points,selectedCodes:[...selected],version:data.version});
      setCategoryChanges({});setDescriptionChanges({});
      setSelectedOnly(!(hasCategoryChanges||hasDescriptionChanges));setCategory(all);
      setNotice(hasDescriptionChanges || hasCategoryChanges ? 'Equipment-specific checklist changes saved.' : `${selected.length} checkpoints saved for this equipment.`);
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
    <View style={styles.field}>
      <Text style={{color:c.text,fontWeight:'800'}}><Text style={{color:c.cyan}}>◇  </Text>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={()=>{setSearch('');setPicker(kind);}}
        style={[styles.control,line,{justifyContent:'space-between',borderColor:c.border,
          backgroundColor:c.elevated,opacity:disabled?.5:1}]}>
        <Text style={{color:value?c.text:c.muted,flex:1,fontWeight:'600'}}>{value || label}</Text>{text('▾')}
      </Pressable>
    </View>;
  const currentProject = projects.find(p=>p.id===project);
  const record = equipment.find(e=>e.equipmentRecordId===item);
  const choices = picker === 'project' ? projects.map(p=>({id:p.id,label:projectDisplay(p.projectName)})) :
    (picker === 'category' || picker === 'rowCategory') ? [...(picker==='category'?[{id:all,label:all}]:[]), ...(catalog?.categories ?? []).map(value=>({id:value.id,label:value.name}))] :
    equipment.map(e=>({id:e.equipmentRecordId,label:`${e.area || ''} · ${equipmentLabel(e)}`}));
  const matching = choices.filter(x=>x.label.toLowerCase().includes(search.trim().toLowerCase()));

  return <ScrollView nativeID="ex-equipment-checklist" style={{flex:1,backgroundColor:c.bg}}
    contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    {onBack && button(dirty?'Back to Inspection':'Back to Inspection',()=>{
      if (dirty && !globalThis.confirm('You have unsaved checklist changes. Leave without saving?')) return;
      onBack();
    },busy)}
    <View nativeID="ex-checklist-hero" style={styles.hero}>
      <Image source={OFFSHORE_ART} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
      <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
        style={[StyleSheet.absoluteFill,Platform.OS!=='web'&&styles.nativeOverlay]} />
      <Text style={styles.eyebrow}>CHECKLIST LIBRARY  /  EQUIPMENT</Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>Equipment <Text style={styles.accent}>Checklist</Text></Text>
      <Text style={styles.heroDescription}>Review and manage the checkpoints assigned to equipment.</Text>
    </View>
    {canManageCatalog && !readOnly && <View style={line}>
      {button('+ Add Category',()=>setCatalogEdit({kind:'category'}),busy||dirty||!catalog)}
      {button('+ Add Checkpoint',()=>setCatalogEdit({kind:'checkpoint'}),busy||dirty||!catalog)}
    </View>}
    <View nativeID="ex-checklist-selection" style={[styles.panel,{backgroundColor:c.card,borderColor:c.border}]}>
    <View style={line}>
      {dropdown('Select Project',projectDisplay(currentProject?.projectName) || '','project',busy||projectLocked)}
      <View style={styles.field}>
        <Text style={{color:c.text,fontWeight:'800'}}><Text style={{color:c.cyan}}>◎  </Text>Client Company Name</Text>
        <View style={[styles.control,{borderColor:c.border,backgroundColor:c.elevated,justifyContent:'center'}]}>
          <Text accessibilityLiveRegion="polite" style={{color:c.text}}>
            {project ? currentProject?.clientName?.trim() || 'Client company not specified' : 'Select a project'}
          </Text>
        </View>
      </View>
    </View>
    <View style={line}>
      {dropdown('Select Equipment',record?equipmentLabel(record):'','equipment',!project||busy||equipmentLocked)}
      {area && <Text style={{color:c.secondary}}>Area: {record?.area || area}</Text>}
    </View>
    {!item && <Text style={{color:c.secondary}}><Text style={{color:c.cyan}}>ⓘ  </Text>Select a project and equipment to choose checkpoints.</Text>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
    {!item && !error && <View nativeID="ex-checklist-empty" style={styles.empty}>
      <Text accessible={false} style={[styles.emptyIcon,{color:c.cyan,borderColor:c.border,backgroundColor:c.elevated}]}>▤</Text>
      <Text accessibilityRole="header" style={[styles.emptyTitle,{color:c.text}]}>No checklist loaded</Text>
      <Text style={{color:c.secondary,textAlign:'center'}}>Choose a project and equipment to view and manage checkpoints.</Text>
    </View>}
    {!!item && !selection && !error && text('Loading checkpoints…')}
    {!!selection && <>
      <View style={line}>{dropdown('Select Checkpoint Category',categoryLabel(category),'category',busy||!catalog)}</View>
      {text(readOnly ? 'View checkpoint categories and saved equipment selections. Checklist changes require an authorized editor.' : 'Choosing an Ex category replaces the current selection. All Checkpoints lets you browse and select individual rows.')}
      <View style={line}>
        {!readOnly && button('Select All',()=>toggle(shown.map(p=>p.code),true),busy||!shown.length)}
        {!readOnly && button('Deselect All',()=>toggle(shown.map(p=>p.code),false),busy||!shown.length)}
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
            return {id:p.code,selected:checked,onPress:busy||readOnly?undefined:change,cells:[
              <Pressable accessibilityRole="checkbox" accessibilityLabel={`${p.section} ${p.itemNumber}`} accessibilityState={{checked,disabled:busy||readOnly}}
                disabled={busy||readOnly} onPress={event=>{event.stopPropagation();change();}} style={{...line,minHeight:34}}>
                <View style={{width:22,height:22,borderWidth:1,borderColor:c.secondary,borderRadius:4,alignItems:'center',justifyContent:'center',
                  backgroundColor:checked?'#173454':c.card}}><Text style={{color:'#fff'}}>{checked?'✓':''}</Text></View>
                {text(String(p.itemNumber))}
              </Pressable>,
              <View style={{gap:5}}>{text(descriptionChanges[p.code] ?? p.text)}
                {!readOnly && button('Edit item',()=>setDescriptionEdit({code:p.code,text:descriptionChanges[p.code] ?? p.text}),busy)}
                {!!descriptionChanges[p.code] && <Text style={{color:c.cyan,fontSize:11}}>Equipment-specific text · unsaved</Text>}
              </View>,<View style={{gap:4}}>
                {readOnly ? text(categoryLabel(p.protectionApplicability)) : <Pressable accessibilityRole="button" accessibilityLabel={`Change category for ${p.section} ${p.itemNumber}`} disabled={busy}
                  onPress={event=>{event.stopPropagation();setEditingCode(p.code);setSearch('');setPicker('rowCategory');}}
                  style={{padding:8,borderWidth:1,borderColor:categoryChanges[p.code]?c.cyan:c.border,borderRadius:5,backgroundColor:c.card}}>
                  {text(`${categoryLabel(categoryChanges[p.code] || p.protectionApplicability)} ▾`)}
                </Pressable>}
                {canManageCatalog && !readOnly && p.isCustom && button('Edit checkpoint',()=>setCatalogEdit({kind:'checkpoint',point:{...p,protectionApplicability:p.catalogCategoryId ?? p.protectionApplicability}}),busy||dirty||!catalog)}
                {!!categoryChanges[p.code] && <Text style={{color:c.cyan,fontSize:11}}>Unsaved change</Text>}
              </View>,
            ]};
          })}/>
        </View>;
      })}
      {!!notice && <Text accessibilityLiveRegion="polite" style={{color:c.success,fontWeight:'700'}}>{notice}</Text>}
      {!readOnly && <View style={line}>
        {button(busy?'Saving…':(hasCategoryChanges||hasDescriptionChanges)?'Save Changes':'Save Selected Checkpoints',()=>void save(),busy||(!selected.length&&!hasCategoryChanges&&!hasDescriptionChanges)||!dirty,true)}
        {dirty && button('Cancel Changes',()=>{setSelected(selection.selectedCodes);setCategoryChanges({});setDescriptionChanges({});setError('');},busy)}
      </View>}
    </>}
    {!readOnly && !!catalog && !!catalogEdit && <ChecklistCatalogEditor edit={catalogEdit} catalog={catalog} colors={c}
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
    <Modal transparent visible={!!descriptionEdit} onRequestClose={()=>setDescriptionEdit(undefined)}>
      <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:16}}>
        <View style={{backgroundColor:c.card,padding:16,borderRadius:8,gap:10,width:'100%',maxWidth:700,alignSelf:'center'}}>
          <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:'800'}}>Modify Item to Be Checked</Text>
          <Text style={{color:c.secondary}}>This change applies only to the selected equipment and future inspection snapshots.</Text>
          <TextInput autoFocus multiline accessibilityLabel="Items to Be Checked" value={descriptionEdit?.text ?? ''}
            onChangeText={value=>setDescriptionEdit(current=>current?{...current,text:value}:current)}
            style={{minHeight:120,textAlignVertical:'top',borderWidth:1,borderColor:c.border,borderRadius:6,padding:10,color:c.text}}/>
          <View style={line}>
            {button('Save Item',()=>{if(descriptionEdit?.text.trim()){setDescriptionChanges(old=>({...old,[descriptionEdit.code]:descriptionEdit.text.trim()}));setDescriptionEdit(undefined);setNotice('');}},!descriptionEdit?.text.trim())}
            {button('Cancel',()=>setDescriptionEdit(undefined))}
          </View>
        </View>
      </View>
    </Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page:{padding:16,gap:16,paddingBottom:32},
  hero:{minHeight:154,padding:22,gap:6,justifyContent:'center',overflow:'hidden',
    borderWidth:1,borderColor:'#126078',backgroundColor:'#03192C',borderRadius:17},
  heroPhoto:{position:'absolute',right:0,width:'76%',height:'100%'},
  nativeOverlay:{backgroundColor:'#03192C88'},
  eyebrow:{color:'#00D9EE',fontFamily:visual.mono,fontSize:11,fontWeight:'800',letterSpacing:1.7},
  heroTitle:{color:'#F5FAFF',fontFamily:visual.display,fontSize:38,fontWeight:'900',fontStyle:'italic'},
  accent:{color:'#00D9EE'},
  heroDescription:{color:'#F5FAFF',fontSize:14,lineHeight:20},
  panel:{padding:16,gap:14,borderWidth:1,borderRadius:16,minWidth:0},
  field:{flexGrow:1,flexBasis:240,minWidth:0,gap:6},
  control:{minHeight:42,paddingHorizontal:11,paddingVertical:8,borderWidth:1,borderRadius:9},
  empty:{minHeight:220,alignItems:'center',justifyContent:'center',gap:10,padding:16},
  emptyIcon:{width:76,lineHeight:74,textAlign:'center',borderWidth:1,borderRadius:38,fontSize:38,overflow:'hidden'},
  emptyTitle:{fontSize:22,fontWeight:'900'},
});
