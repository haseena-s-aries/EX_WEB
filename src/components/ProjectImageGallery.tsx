import {isPdfFile} from '../utils/isPdfFile';
import {visual} from '../theme/visual';
import React, {useEffect, useState} from 'react';
import {Image, Modal, Pressable, Text, View} from 'react-native';
import {deleteCommonLayout, deleteProjectAreaPhoto, getCommonLayouts, getProjectAreaPhotos,
  InspectionPhotoFile, ProjectAreaPhoto, uploadCommonLayouts, uploadProjectAreaPhotos} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';
import {DARK, LIGHT} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {useThemeMode} from '../theme/useThemeMode';
import AuthenticatedImage from './AuthenticatedImage';
import InspectionPhotoPicker from './InspectionPhotoPicker';

export default function ProjectImageGallery({projectId, areaId, editable = false, onChanged, splitUpload = false}: {
  projectId:string; areaId?:string; editable?:boolean; onChanged?:()=>void; splitUpload?:boolean;
}) {
  const c = useThemeMode() === 'dark' ? (splitUpload ? OPERATIONS_DARK : DARK) : LIGHT;
  const [photos,setPhotos] = useState<ProjectAreaPhoto[]>([]);
  const [pending,setPending] = useState<InspectionPhotoFile[]>([]);
  const [preview,setPreview] = useState<{path:string; local:boolean}>();
  const [replacing,setReplacing] = useState<string>();
  const [confirmRemove,setConfirmRemove] = useState<string>();
  const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [reload,setReload] = useState(0);
  const [error,setError] = useState('');
  const title = `${areaId ? 'Area Photos' : 'Common Layouts'} (${photos.length})`;
  useEffect(()=>{
    let active = true;
    setLoaded(false);
    (areaId ? getProjectAreaPhotos(projectId,areaId) : getCommonLayouts(projectId))
      .then(({data})=>{if(active){setPhotos(data);setLoaded(true);}})
      .catch(e=>{if(active)setError(getApiErrorMessage(e,'Could not load images.'));});
    return ()=>{active=false;};
  },[projectId,areaId,reload]);

  async function remove(id:string) {
    if (areaId) await deleteProjectAreaPhoto(projectId,areaId,id);
    else await deleteCommonLayout(projectId,id);
    setPhotos(old=>old.filter(photo=>photo.id!==id));
  }
  async function save() {
    if (!pending.length || busy) return;
    setBusy(true);setError('');
    let changed = false;
    try {
      const {data} = areaId ? await uploadProjectAreaPhotos(projectId,areaId,pending) : await uploadCommonLayouts(projectId,pending);
      setPhotos(old=>[...old,...data]);setPending([]);setReplacing(undefined);changed=true;
      if (replacing) await remove(replacing);
    } catch(e) {setError(getApiErrorMessage(e,'Could not finish saving images. Check which images were saved before retrying.'));}
    finally {setBusy(false);if(changed)onChanged?.();}
  }
  const line = {flexDirection:'row' as const,flexWrap:'wrap' as const,gap:8,alignItems:'center' as const};
  const button = (label:string,onPress:()=>void,disabled=busy) =>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:9,minHeight:38,borderRadius:visual.radius.control,
      borderWidth:1,borderColor:c.border,backgroundColor:c.elevated,opacity:disabled?.5:1}}>
      <Text style={{color:c.text,fontWeight:'700'}}>{label}</Text>
    </Pressable>;
  const image = (path:string,local:boolean,large=false) => {
    const style = large ? {width:'100%' as const,height:'84%' as const} : {width:splitUpload?180:112,height:splitUpload?108:80,borderRadius:8};
    return local ? <Image source={{uri:path}} style={style} resizeMode={large?'contain':'cover'}/> :
      <AuthenticatedImage path={path} style={style} resizeMode={large?'contain':'cover'}/>;
  };
  const panel = {padding:visual.spacing.panel,borderWidth:1,borderColor:c.border,borderRadius:visual.radius.panel,backgroundColor:c.card,gap:12};
  return <View nativeID={splitUpload ? 'ex-area-photo-panels' : undefined} style={splitUpload ? {gap:12} : panel}>
    <View style={splitUpload ? panel : {gap:12}}>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:17,fontWeight:'800'}}>{title}</Text>
    {loaded && !photos.length && <Text style={{color:c.secondary}}>No {areaId?'area photos':'common layouts'} uploaded.</Text>}
    {!loaded && !error && <Text style={{color:c.secondary}}>Loading images…</Text>}
    <View style={line}>{photos.map(photo=>{
      const path=photo.downloadUrl || photo.filePath;
      return path && <View key={photo.id} style={{gap:6,maxWidth:splitUpload?240:180}}>
        {isPdfFile(photo.fileName) ? <AuthenticatedImage path={path} fileName={photo.fileName} style={{width:112,height:80}} /> :
        <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${photo.fileName || 'image'}`} onPress={()=>setPreview({path,local:false})}>
          {image(path,false)}
        </Pressable>}
        {!!photo.fileName && <Text numberOfLines={2} style={{color:c.text}}>{photo.fileName}</Text>}
        {editable && <View style={line}>
          {button('Replace',()=>{setReplacing(photo.id);setPending([]);setConfirmRemove(undefined);})}
          {button('Remove',()=>setConfirmRemove(photo.id))}
        </View>}
      </View>;
    })}</View>
    </View>
    {editable && <View style={splitUpload ? panel : {gap:12}}>
      {!!confirmRemove && <View style={line}>
        {button('Confirm removal',()=>{setBusy(true);setError('');void remove(confirmRemove).then(()=>{
          setConfirmRemove(undefined);onChanged?.();
        }).catch(e=>setError(getApiErrorMessage(e,'Could not remove the image.'))).finally(()=>setBusy(false));})}
        {button('Cancel removal',()=>setConfirmRemove(undefined))}
      </View>}
      <Text accessibilityRole={splitUpload ? 'header' : undefined}
        style={{color:c.text,fontWeight:'800',fontSize:splitUpload?17:14}}>{replacing?'Choose a replacement image':areaId?'Upload Area Photos':'Upload Common Layout'}</Text>
      <InspectionPhotoPicker disabled={busy} onSelected={files=>setPending(old=>replacing?files.slice(0,1):[...old,...files])}/>
      <View style={line}>{pending.map((photo,index)=><View key={index} style={{gap:4}}>
        {!!photo.uri && (isPdfFile(photo.fileName || photo.name)
          ? <AuthenticatedImage localUri={photo.uri} fileName={photo.fileName || photo.name} style={{width:112,height:80}} />
          : <Pressable accessibilityRole="button" accessibilityLabel="Preview pending image"
            onPress={()=>setPreview({path:photo.uri!,local:true})}>{image(photo.uri,true)}</Pressable>)}
        {button('Remove pending',()=>setPending(old=>old.filter((_,i)=>i!==index)))}
      </View>)}</View>
      <View style={line}>
        {button(busy?'Saving…':replacing?'Save replacement':'Save images',()=>void save(),busy||!pending.length)}
        {!!replacing && button('Cancel replacement',()=>{setReplacing(undefined);setPending([]);})}
      </View>
    </View>}
    {!!error && <View style={line}><Text accessibilityRole="alert" style={{color:c.critical}}>{error}</Text>
      {!loaded && button('Retry',()=>{setError('');setReload(value=>value+1);})}</View>}
    <Modal visible={!!preview} onRequestClose={()=>setPreview(undefined)}>
      <View style={{flex:1,padding:12,backgroundColor:c.bg,justifyContent:'center',gap:10}}>
        {preview && image(preview.path,preview.local,true)}
        {button('Close preview',()=>setPreview(undefined),false)}
      </View>
    </Modal>
  </View>;
}
