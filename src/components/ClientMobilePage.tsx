import React from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {DashboardButton, DashboardKpi, useDashboardPresentation} from './DashboardPresentation';
import {tint} from '../theme/palette';
export default function ClientMobilePage({heading, kpis, loading, error, refreshing = false, onRefresh, children, actions}: {title: string; heading: string; kpis?: DashboardKpi[]; loading: boolean; error: string; refreshing?: boolean; onRefresh: () => void; children: React.ReactNode; actions?: React.ReactNode}) {
  const {c, s} = useDashboardPresentation(); const {width} = useWindowDimensions();
  return <ScrollView style={s.screen} contentContainerStyle={[s.content, {paddingBottom: 32}]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.amber} />}>
    {!loading && kpis && <View style={s.kpiGrid}>{kpis.map(kpi => <View key={kpi.label} style={[s.kpiCard, width < 360 && {flexBasis: '100%'}, {minWidth: 0}]}><View style={[s.iconBox, {backgroundColor: tint(kpi.color, '1F')}]}><Text style={[s.iconGlyph, {color: kpi.color}]}>{kpi.icon}</Text></View><View style={s.kpiBody}><Text style={s.kpiLabel}>{kpi.label}</Text><Text style={s.kpiValue}>{kpi.count}</Text><Text style={s.kpiFoot}>{kpi.foot}</Text></View></View>)}</View>}
    {actions}<View style={[s.sectionHeading, !kpis && {justifyContent: 'flex-end'}]}>{kpis && <Text style={[s.sectionTitle, {flex: 1}]}>{heading}</Text>}<TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={{paddingVertical: 12, paddingLeft: 12}}><Text style={s.link}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={c.amber} style={{marginVertical: 40}} /> : error ? <View style={s.stateBox}><Text style={s.stateTitle}>Unable to load</Text><Text style={s.stateText}>{error}</Text><DashboardButton title="Try again" onPress={onRefresh} /></View> : children}
  </ScrollView>;
}
