import {typography} from './typography';
import {Platform, StyleSheet} from 'react-native';
import {Colors, tint} from './palette';
const web = (style: object) => Platform.select({web: style, default: {}}) as object;

export function makeDashboardStyles(c: Colors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    content: {padding: 16, paddingBottom: 110, maxWidth: 760, width: '100%', alignSelf: 'center'},
    contentWide: {maxWidth: 1600, padding: 24, paddingBottom: 48},

    brandRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18},
    logoBadge: {width: 74, height: 42, borderRadius: 8, backgroundColor: '#FFFFFF', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    logoImage: {width: '100%', height: '100%'},
    brandTitle: {color: c.text, fontSize: 21, fontWeight: '800'},
    brandSub: {color: c.secondary, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1},
    motto: {color: c.muted, fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textAlign: 'right', lineHeight: 12},

    profileRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16},
    userName: {color: c.text, fontSize: 19, fontWeight: '800'},
    roleBadge: {alignSelf: 'flex-start', marginTop: 6, backgroundColor: tint(c.yellow, '26'), borderWidth: 1, borderColor: tint(c.yellow, '66'), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
    roleBadgeText: {color: c.yellow, fontSize: 12, fontWeight: '800'},

    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16},
    kpiCard: {
      flexGrow: 1,
      flexBasis: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      minHeight: 104,
      ...web({boxShadow: c.shadow}),
    },
    kpiCardWide: {flexBasis: '22%'},
    iconBox: {width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    iconGlyph: {fontSize: 24},
    kpiBody: {flex: 1, minWidth: 0},
    kpiLabel: {...typography.label, color: c.text, },
    kpiValue: {...typography.kpi, color: c.text, marginTop: 2},
    kpiValueSub: {color: c.secondary, fontSize: 16, fontWeight: '600'},
    kpiFoot: {color: c.secondary, fontSize: 12, marginTop: 2},

    sectionHeading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
    sectionTitle: {...typography.section, color: c.text, },
    sectionHint: {color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 2},
    link: {color: c.amber, fontSize: 13, fontWeight: '800'},
    newBtn: {backgroundColor: c.amber, borderRadius: 12, minHeight: 50, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 24},
    newBtnText: {color: c.onAmber, fontSize: 15, fontWeight: '900'},

    projectCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, ...web({boxShadow: c.shadow})},
    projectName: {...typography.card, color: c.text, },
    projectLoc: {color: c.secondary, fontSize: 12.5, marginTop: 4},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
    badge: {borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4},
    badgeText: {...typography.badge, },
    projectRight: {alignItems: 'flex-end'},
    areaCount: {color: c.text, fontSize: 22, fontWeight: '900'},
    areaLabel: {color: c.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1},
    chevron: {color: c.muted, fontSize: 24},
    showMore: {alignItems: 'center', paddingVertical: 10},

    stateBox: {minHeight: 200, backgroundColor: c.card, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 28, borderWidth: 1, borderColor: c.border},
    stateTitle: {color: c.text, fontSize: 17, fontWeight: '800'},
    stateText: {color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center'},
    retryButton: {marginTop: 16, backgroundColor: c.amber, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10},
    retryText: {color: c.onAmber, fontWeight: '800', fontSize: 13},
  });
}
