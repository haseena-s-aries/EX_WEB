import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import type {Colors} from '../theme/palette';

export type HaerGridProps = {
  columns: readonly {label: string; width: number}[];
  rows: {id: string; cells: React.ReactNode[]; selected?: boolean; onPress?: () => void}[];
  colors: Colors;
  label?: string;
  fullWidth?: boolean;
  columnGroup?: {label:string; start:number; count:number};
};

export default function HaerGrid({columns, rows, colors, columnGroup}: HaerGridProps) {
  return <ScrollView horizontal>
    <View style={{borderLeftWidth: 1, borderTopWidth: 1, borderColor: colors.border}}>
      {columnGroup && <View style={{flexDirection:'row',backgroundColor:'#a9cbe8'}}>
        <View style={{width:columns.slice(0,columnGroup.start).reduce((sum,col)=>sum+col.width,0)}}/>
        <Text style={{width:columns.slice(columnGroup.start,columnGroup.start+columnGroup.count).reduce((sum,col)=>sum+col.width,0),
          padding:8,textAlign:'center',color:'#142d46',fontWeight:'700'}}>{columnGroup.label}</Text>
      </View>}
      <View style={{flexDirection: 'row'}}>
        {columns.map((column, index) => <Text key={index} style={{width: column.width, padding: 8, backgroundColor: '#a9cbe8', color: '#142d46', fontWeight: '700', borderBottomWidth: 1, borderRightWidth: 1, borderColor: colors.border}}>{column.label}</Text>)}
      </View>
      {rows.map(row => {
        const Row = row.onPress ? Pressable : View;
        return <Row key={row.id} {...(row.onPress ? {onPress:row.onPress} : {})} style={{flexDirection: 'row'}}>
        {row.cells.map((cell, index) => <View key={index} style={{width: columns[index].width, padding: 7, minHeight: 43, backgroundColor: row.selected ? colors.elevated : colors.card, borderBottomWidth: 1, borderRightWidth: 1, borderColor: colors.border}}>{cell}</View>)}
        </Row>;
      })}
    </View>
  </ScrollView>;
}
