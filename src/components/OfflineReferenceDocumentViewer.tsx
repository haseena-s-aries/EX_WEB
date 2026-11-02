import React,{useState} from 'react';
import {Image,Modal,Text,TouchableOpacity,View} from 'react-native';
import Pdf from 'react-native-pdf';

export default function OfflineReferenceDocumentViewer({uri,title,contentType,onClose}:{uri:string;title:string;contentType:string;onClose:()=>void}){
 const [error,setError]=useState('');
 const pdf=contentType==='application/pdf'||title.toLowerCase().endsWith('.pdf');
 return <Modal visible animationType="slide" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#f8f9fc',padding:12,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Text style={{fontWeight:'800',flex:1}} numberOfLines={2}>{title}</Text><TouchableOpacity accessibilityRole="button" onPress={onClose} style={{padding:10,backgroundColor:'#e6e9f2',borderRadius:7}}><Text>Close</Text></TouchableOpacity></View>{!!error&&<Text accessibilityRole="alert" style={{color:'#a32929'}}>{error}</Text>}{pdf?<Pdf source={{uri,cache:false}} trustAllCerts={false} style={{flex:1}} onError={()=>setError('Could not display the verified local PDF. Close the viewer and retry the download if the issue continues.')}/>:<Image source={{uri}} resizeMode="contain" onError={()=>setError('Could not display the verified local image. Close the viewer and retry the download if the issue continues.')} style={{flex:1,width:'100%'}}/>}</View></Modal>;
}
