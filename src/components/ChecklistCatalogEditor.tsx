import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {ChecklistCatalog, saveChecklistCategory, saveChecklistCheckpoint} from '../api/equipmentChecklistCatalog';
import {getApiErrorMessage} from '../api/errors';
import type {Colors} from '../theme/palette';

export type CatalogEdit = {kind:'category'} | {kind:'checkpoint'; point?:{code:string; section:string; itemNumber:number; text:string; protectionApplicability:string}};

export default function ChecklistCatalogEditor({edit, catalog, colors:c, onClose, onSaved}: {
  edit:CatalogEdit; catalog:ChecklistCatalog; colors:Colors; onClose:()=>void; onSaved:()=>void;
}) {
  const point = edit.kind === 'checkpoint' ? edit.point : undefined;
  const [id,setId] = useState('');
  const [name,setName] = useState('');
  const [description,setDescription] = useState(point?.text ?? '');
  const [section,setSection] = useState(point?.section ?? 'Apparatus');
  const [number,setNumber] = useState(String(point?.itemNumber ?? catalog.nextNumbers.Apparatus));
  const [categoryId,setCategoryId] = useState(point?.protectionApplicability ?? '');
  const [showChoices,setShowChoices] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const line = {flexDirection:'row' as const,flexWrap:'wrap' as const,gap:8};
  const button = (label:string, action:()=>void, disabled=busy, primary=false) =>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={{padding:10,borderRadius:6,borderWidth:1,
      borderColor:c.border,backgroundColor:primary?'#173454':c.card,opacity:disabled?.5:1}}>
      <Text style={{color:primary?'#fff':c.text,fontWeight:'700'}}>{label}</Text>
    </Pressable>;
  const field = (label:string,value:string,change:(value:string)=>void,multiline=false,editable=true) =>
    <View style={{gap:4}}><Text style={{color:c.secondary}}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={change} multiline={multiline} editable={editable&&!busy}
        style={{color:c.text,borderColor:c.border,borderWidth:1,borderRadius:6,padding:8,minHeight:multiline?72:42}}/>
    </View>;
  async function save() {
    setBusy(true);setError('');
    try {
      if (edit.kind === 'category') await saveChecklistCategory({id:id||undefined,name,description});
      else await saveChecklistCheckpoint({code:point?.code,section,itemNumber:Number(number),text:description,categoryId});
      onSaved();
    } catch(e) {setError(getApiErrorMessage(e,'Could not save the checklist catalog.'));}
    finally {setBusy(false);}
  }
  const chooseCategory = (value:string) => {
    setShowChoices(false);
    if(edit.kind==='checkpoint') {setCategoryId(value);return;}
    const category=catalog.categories.find(item=>item.id===value);
    setId(value);setName(category?.name ?? '');setDescription(category?.description ?? '');
  };

  return <Modal visible transparent onRequestClose={()=>{if(!busy)onClose();}}>
    <View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:16}}>
      <View style={{width:'100%',maxWidth:620,alignSelf:'center',maxHeight:'90%',backgroundColor:c.card,padding:16,borderRadius:9,gap:12}}>
        <Text accessibilityRole="header" style={{color:c.text,fontSize:22,fontWeight:'800'}}>
          {edit.kind==='category' ? id ? 'Rename Category' : 'Add Category' : point ? 'Edit Checkpoint' : 'Add Checkpoint'}
        </Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:10}}>
          {edit.kind==='category' ? <>
            {button(id?'Choose a different category':'Rename an existing category',()=>setShowChoices(!showChoices))}
            {!!id && button('Create a new category',()=>chooseCategory(''))}
            {showChoices && catalog.categories.map(category=><View key={category.id}>{button(category.name,()=>chooseCategory(category.id))}</View>)}
            {field('Category Name',name,setName)}
            {field('Description (optional)',description,setDescription,true)}
          </> : <>
            <Text style={{color:c.secondary}}>Section</Text>
            <View style={line}>{Object.keys(catalog.nextNumbers).map(value=><View key={value}>{button(value,()=>{
              setSection(value);setNumber(String(catalog.nextNumbers[value]));
            },busy||!!point,value===section)}</View>)}</View>
            {field('Checkpoint Number',number,setNumber,false,!point)}
            {field('Items to Be Checked',description,setDescription,true)}
            {button(catalog.categories.find(category=>category.id===categoryId)?.name || 'Select Checkpoint Category',()=>setShowChoices(!showChoices))}
            {showChoices && catalog.categories.map(category=><View key={category.id}>{button(category.name,()=>chooseCategory(category.id))}</View>)}
          </>}
          {!!error && <Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>}
        </ScrollView>
        <View style={line}>
          {button(busy?'Saving…':'Save',()=>void save(),busy||(edit.kind==='category'?!name.trim():!description.trim()||!categoryId||!/^\d+$/.test(number)),true)}
          {button('Cancel',onClose)}
        </View>
      </View>
    </View>
  </Modal>;
}
