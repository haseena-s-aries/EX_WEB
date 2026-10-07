import React from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export type QcKpi = {label: string; count: number; background: string; color: string};
export function QcDashboardLayout({eyebrow, title, subtitle, kpis, heading, loading, error, empty,
  refreshing = false, onRefresh, onReload, children, actions}: {
  eyebrow: string; title: string; subtitle: string; kpis?: QcKpi[]; heading: string;
  loading: boolean; error: string; empty: boolean; refreshing?: boolean; onRefresh: () => void;
  children: React.ReactNode; actions?: React.ReactNode; onReload?: () => void;
}) {
  const styles = qcDashboardStyles;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
    <View style={styles.hero}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    {kpis && <View style={styles.counts}>{kpis.map(kpi => <View key={kpi.label} style={styles.countCard}>
      <Text style={[styles.count, {color: kpi.color}]}>{kpi.count}</Text><Text style={styles.countLabel}>{kpi.label}</Text>
      <View style={[styles.bar, {backgroundColor: kpi.background}]} />
    </View>)}</View>}
    {actions}
    <View style={styles.heading}><Text style={styles.headingText}>{heading}</Text><TouchableOpacity accessibilityRole="button" onPress={onReload || onRefresh}><Text style={styles.refresh}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color="#3f47d6" style={{margin: 32}} /> : error ? <View style={styles.empty}>
      <Text style={styles.projectTitle}>Projects unavailable</Text><Text style={styles.meta}>{error}</Text>
      <TouchableOpacity onPress={onReload || onRefresh}><Text style={styles.refresh}>Try again</Text></TouchableOpacity>
    </View> : empty ? <View style={styles.empty}><Text style={styles.projectTitle}>No projects assigned</Text><Text style={styles.meta}>QC assignments will appear here.</Text></View> : children}
  </ScrollView>;
}

export function QcProjectCard({name, jobNo, location, status, overdue = false, onPress, actionLabel = 'Open project', children}: {
  name: string; jobNo?: string; location?: string; status: string; overdue?: boolean;
  onPress: () => void; actionLabel?: string; children?: React.ReactNode;
}) {
  const styles = qcDashboardStyles;
  return <TouchableOpacity onPress={onPress} style={styles.project} accessibilityRole="button" accessibilityLabel={actionLabel}>
    <View style={styles.projectTop}><View style={{flex: 1}}><Text style={styles.projectTitle}>{name}</Text><Text style={styles.meta}>{jobNo || 'No job number'} · {location || 'Location not set'}</Text></View>
      <Text style={[styles.badge, {backgroundColor: overdue ? '#f1eaf3' : /approved/i.test(status) ? '#e5f6ec' : /change/i.test(status) ? '#fdebed' : '#fff0d7', color: overdue ? '#8053a6' : /approved/i.test(status) ? '#237348' : /change/i.test(status) ? '#bf3441' : '#a75a0b'}]}>{overdue ? 'Overdue' : status}</Text>
    </View>{children}<Text style={styles.open}>{actionLabel} ›</Text>
  </TouchableOpacity>;
}

export function QcProjectMetadata({fields}: {fields: Array<[string, string | number]>}) {
  return <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12}}>
    {fields.map(([name, content]) => <View key={name} style={{flexGrow: 1, flexBasis: 180}}>
      <Text style={qcDashboardStyles.meta}>{name}</Text><Text style={[qcDashboardStyles.meta, {fontWeight: '700'}]}>{content}</Text>
    </View>)}
  </View>;
}

export const qcDashboardStyles = StyleSheet.create({screen:{flex:1,backgroundColor:'#f7f9ff'},content:{padding:24,paddingBottom:48,maxWidth:1180,width:'100%',alignSelf:'center'},hero:{backgroundColor:'#242d52',borderRadius:14,padding:24,minHeight:140,justifyContent:'center'},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:'#b8a5f8'},title:{fontSize:25,fontWeight:'800',color:'#fff',marginTop:8},subtitle:{fontSize:13,color:'#d0d4e9',marginTop:6},counts:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:16},countCard:{flexGrow:1,flexBasis:180,minHeight:100,padding:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f6',borderRadius:10},count:{fontSize:26,fontWeight:'800'},countLabel:{fontSize:12,fontWeight:'700',color:'#4b5064',marginTop:4},bar:{height:3,borderRadius:2,marginTop:12},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:26,marginBottom:12},headingText:{fontSize:18,fontWeight:'800',color:'#242d52'},refresh:{color:'#3f47d6',fontWeight:'800',fontSize:12},project:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f6',borderRadius:10,padding:18,marginBottom:10},projectTop:{flexDirection:'row',alignItems:'flex-start',gap:12},projectTitle:{fontSize:15,fontWeight:'800',color:'#242d52'},meta:{fontSize:12,color:'#767b8e',marginTop:5},badge:{overflow:'hidden',borderRadius:20,paddingHorizontal:10,paddingVertical:6,fontSize:10,fontWeight:'800'},open:{alignSelf:'flex-end',marginTop:12,fontSize:12,color:'#3f47d6',fontWeight:'800'},empty:{backgroundColor:'#fff',padding:26,borderRadius:10,alignItems:'center'}});
