import React from 'react';
import {Modal,Text,TouchableOpacity,View} from 'react-native';

export default function OfflineReferenceDocumentViewer({title,onClose}:{uri:string;title:string;contentType:string;onClose:()=>void}){
 return <Modal visible onRequestClose={onClose}><View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24,gap:12,backgroundColor:'#f8f9fc'}}><Text style={{fontWeight:'800'}}>{title}</Text><Text>Encrypted offline document viewing is available in the Android application.</Text><TouchableOpacity accessibilityRole="button" onPress={onClose}><Text>Close</Text></TouchableOpacity></View></Modal>;
}
