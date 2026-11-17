import React from 'react';
import {Text, View} from 'react-native';
import {DefectRegisterReport} from '../api/reports';
import type {Colors} from '../theme/palette';
import AuthenticatedImage from './AuthenticatedImage';
import HaerGrid from './HaerGrid';

const columns = [
  ['ACTION NO',120],['DATE',110],['ITEM #',110],['AOSD ID',110],['FAULT CATEGORY A, B, C',100],
  ['FAULT CODE',110],['AREA',150],['TYPE OF INSPECTION',140],['EQUIPMENT DESCRIPTION',220],
  ['OBSERVATION',240],['RECOMMENDATION',240],['STATUS',150],['PHOTO',160],['PHOTO',160],['REMARKS',220],['REMARKS',220],
].map(([label,width])=>({label:String(label),width:Number(width)}));

export default function DefectReportRegisterPreview({report,colors}:{report:DefectRegisterReport;colors:Colors}) {
  const text = (value?:string|null) => <Text style={{color:colors.text,fontSize:14}}>{value || '—'}</Text>;
  return <View style={{gap:12}}>
    <Text accessibilityRole="header" style={{color:colors.text,fontSize:18,fontWeight:'800'}}>Defect Register · {report.items.length} records</Text>
    <Text style={{color:colors.muted}}>{report.siteName} · {report.location} · Inspectors: {report.inspectors || '—'}</Text>
    {!report.items.length ? text('No defects recorded for this project.') : <HaerGrid colors={colors} columns={columns} label="Defect report register" rows={report.items.map(row=>({id:row.id,cells:[
      text(row.actionNo),text(row.date),text(row.itemNumber),text(row.aosdId || 'NA'),text(row.faultCategory),text(row.faultCode),text(row.area),text(row.grade),text(row.equipmentDescription),text(row.observation),text(row.recommendation),text(row.status),
      ...[1,2].map(slot=><View style={{gap:8}}>{row.photos.filter(p=>p.slot===slot).map(photo=><View key={photo.id} style={{gap:4}}><AuthenticatedImage path={photo.url} fileName={photo.fileName} resizeMode="contain" style={{width:130,height:100}}/>{text(photo.fileName)}</View>)}</View>),
      text(row.remarks),text(row.additionalRemarks),
    ]}))}/>}
  </View>;
}
