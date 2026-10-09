import React from 'react';
import {ActivityIndicator, Image, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {makeDashboardStyles} from '../theme/dashboardStyles';

const ARIES_LOGO = require('../assets/aries-logo.png');
import {projectDetailStyles as detail} from '../theme/projectDetailStyles';
import {DARK, LIGHT, tint} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import ThemeToggle from './ThemeToggle';

export function useDashboardPresentation() {
  const mode = useThemeMode(); const c = mode === 'dark' ? DARK : LIGHT;
  return {c, s: React.useMemo(() => makeDashboardStyles(c), [c])};
}
const wrap = Platform.select({web: {overflowWrap: 'anywhere'} as any, default: {}});
export function DashboardButton({title, onPress, disabled = false}: {title: string; onPress: () => void; disabled?: boolean}) {
  const {s} = useDashboardPresentation();
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.retryButton, {alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 8, maxWidth: '100%'}, disabled && {opacity: .5}]}><Text style={[s.retryText, wrap]}>{title}</Text></TouchableOpacity>;
}
export function DashboardSection({title, children}: {title: string; children: React.ReactNode}) {
  const {c, s} = useDashboardPresentation();
  return <View style={[s.projectCard, {flexDirection: 'column', alignItems: 'stretch', marginTop: 16, gap: 12, minWidth: 0}]}>
    <DashboardSectionHeader title={title} color={c.cyan} textColor={c.text} lineColor={c.border} compact />{children}
  </View>;
}
export function DashboardSectionHeader({color, icon, title, textColor, lineColor, compact = false}: {color: string; icon?: string; title: string; textColor?: string; lineColor?: string; compact?: boolean}) {
  return <View style={[detail.sectionHeader, compact && {marginTop: 0, marginBottom: 0}]}><View style={[detail.sectionDot, {backgroundColor: color}]} />{icon && <Text style={detail.sectionIcon}>{icon}</Text>}<Text style={[detail.sectionTitle, compact && {flexShrink: 1}, textColor ? {color: textColor} : null, compact && wrap]}>{title}</Text><View style={[detail.sectionLine, lineColor ? {backgroundColor: lineColor} : null]} /></View>;
}
export function DashboardMetadata({fields}: {fields: Array<[string, unknown]>}) {
  const {c} = useDashboardPresentation(); const {width} = useWindowDimensions();
  return <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12}}>{fields.map(([name, value]) => <View key={name} style={{flexGrow: 1, flexBasis: width < 430 ? '100%' : '46%', minWidth: 0}}><Text style={[detail.label, {color: c.secondary}]}>{name}</Text><Text style={[detail.readValue, detail.informationValue, {color: c.text}, wrap]}>{value === undefined || value === null || value === '' ? '-' : String(value)}</Text></View>)}</View>;
}
export function DashboardStatusBadge({status}: {status: string}) {
  const {c, s} = useDashboardPresentation();
  const color = /change|hold|open/i.test(status) ? c.critical : /approved|closed|complete/i.test(status) ? c.success : /pending|review/i.test(status) ? c.yellow : /progress/i.test(status) ? c.cyan : c.indigo;
  return <View style={[s.badge, {alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: tint(color, '26')}]}><Text style={[s.badgeText, {color}, wrap]}>{status.toUpperCase()}</Text></View>;
}
export function DashboardProjectCard({name, jobNo, location, status, onPress, actionLabel = 'View Project', children}: {name: string; jobNo?: string; location?: string; status: string; onPress: () => void; actionLabel?: string; children?: React.ReactNode}) {
  const {s} = useDashboardPresentation();
  return <View style={[s.projectCard, {flexDirection: 'column', alignItems: 'stretch', marginBottom: 12, minWidth: 0}]}><View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}><View style={{flex: 1, minWidth: 0}}><Text style={[s.projectName, wrap]}>{name}</Text><Text style={[s.projectLoc, wrap]}>{location || 'Location not set'}</Text><View style={s.badgeRow}><DashboardStatusBadge status={status} />{!!jobNo && <Text style={[s.badgeText, s.badge, wrap]}>{jobNo}</Text>}</View></View><Text style={s.chevron}>›</Text></View>{children}<TouchableOpacity accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onPress} style={{alignSelf: 'flex-end', paddingVertical: 12}}><Text style={s.link}>{actionLabel} ›</Text></TouchableOpacity></View>;
}
export type DashboardKpi = {label: string; count: number; icon: string; color: string; foot: string};
export function DashboardEmptyState({title, message}: {title: string; message: string}) {
  const {s} = useDashboardPresentation();
  return <View style={s.stateBox}><Text style={s.stateTitle}>{title}</Text><Text style={s.stateText}>{message}</Text></View>;
}
export function DashboardLayout({title, heading, kpis, loading, error, refreshing = false, onRefresh, children, actions, showBrand = false, accessory, onLogout}: {
  title: string; heading: string; kpis?: DashboardKpi[]; loading: boolean; error: string; refreshing?: boolean; onRefresh: () => void; children: React.ReactNode; actions?: React.ReactNode; showBrand?: boolean; accessory?: React.ReactNode; onLogout?: () => void;
}) {
  const {c, s} = useDashboardPresentation(); const {width} = useWindowDimensions(); const wide = width >= 900;
  return <ScrollView style={s.screen} contentContainerStyle={[s.content, wide && s.contentWide]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.amber} />}>
    {showBrand && <View style={s.brandRow}><View style={s.logoBadge}><Image source={ARIES_LOGO} style={s.logoImage} resizeMode="contain" accessibilityLabel="Aries logo" /></View><View style={{flex: 1}}><Text style={s.brandTitle}>Ex-Survey</Text></View></View>}
    <View style={s.profileRow}><View style={{flex: 1, minWidth: 0}}><Text style={[s.userName, wrap]}>{title}</Text><View style={s.roleBadge}><Text style={s.roleBadgeText}>⚡ Client</Text></View></View>{accessory}<ThemeToggle floating={false} size={34} />{onLogout && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} style={{alignSelf: 'flex-end', paddingVertical: 9, paddingLeft: 14}}><Text style={s.link}>Log out</Text></TouchableOpacity>}</View>
    {!loading && kpis && <View style={s.kpiGrid}>{kpis.map(kpi => <View key={kpi.label} style={[s.kpiCard, wide && s.kpiCardWide, width < 360 && {flexBasis: '100%'}, {minWidth: 0}]}><View style={[s.iconBox, {backgroundColor: tint(kpi.color, '1F')}]}><Text style={[s.iconGlyph, {color: kpi.color}]}>{kpi.icon}</Text></View><View style={s.kpiBody}><Text style={s.kpiLabel}>{kpi.label}</Text><Text style={s.kpiValue}>{kpi.count}</Text><Text style={s.kpiFoot}>{kpi.foot}</Text></View></View>)}</View>}
    {actions}<View style={s.sectionHeading}><Text style={[s.sectionTitle, {flex: 1}, wrap]}>{heading}</Text><TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={{paddingVertical: 12, paddingLeft: 12}}><Text style={s.link}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={c.amber} style={{marginVertical: 40}} /> : error ? <View style={s.stateBox}><Text style={s.stateTitle}>Unable to load</Text><Text style={s.stateText}>{error}</Text><DashboardButton title="Try again" onPress={onRefresh} /></View> : children}
  </ScrollView>;
}
