import React from 'react';
import {Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {AriesLogo, BarsIcon, PeopleIcon, ShieldIcon} from './LoginArt';

const copy = {
  login: {
    photo: require('../assets/landing/industry-3.jpg'),
    body: 'Sign in to access your projects, inspections, reports, and more.',
    features: [
      [ShieldIcon, 'Secure Access', 'Role-based, enterprise-grade security'],
      [PeopleIcon, 'Manage Inspections', 'From field data to final reports'],
      [BarsIcon, 'Track Progress', 'Real-time project and asset visibility'],
    ],
  },
  register: {
    photo: require('../assets/landing/industry-9.jpg'),
    body: 'Join the inspection workspace and manage your industrial surveys with confidence.',
    features: [
      [PeopleIcon, 'Collaborate with Your Team', ''],
      [ShieldIcon, 'Access Project Inspections', ''],
      [BarsIcon, 'Generate Professional Reports', ''],
    ],
  },
} as const;

export default function AuthReferenceLayout({mode, onSwitch, onBackToHome, photo, children}: {
  mode: 'login' | 'register'; onSwitch?: () => void;
  onBackToHome?: () => void;
  photo?: ImageSourcePropType | null; children: React.ReactNode;
}) {
  const {width, height} = useWindowDimensions();
  const compact = width < 700;
  const content = copy[mode];
  const source = photo === undefined ? content.photo : photo;
  return <ScrollView keyboardShouldPersistTaps="handled" style={s.screen}
    contentContainerStyle={s.page}>
    <View nativeID={mode === 'register' ? 'ex-register' : 'ex-auth'} style={[s.scene, {minHeight: compact ? height : Math.max(560, height)}]}>
      {source && <Image source={source} resizeMode="cover" style={[s.photo, mode === 'register' ? s.registerPhoto : s.loginPhoto]} />}
      <View nativeID="ex-auth-vignette" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View nativeID="ex-auth-stripes" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={[s.brand, compact && s.brandCompact]}>
        <AriesLogo size={48} />
        <View><Text style={s.brandName}>Ex-Survey</Text><Text style={s.brandSubtitle}>Industrial Survey &amp; Inspection Platform</Text></View>
      </View>
      {onBackToHome && (
        <Pressable accessibilityRole="link" onPress={onBackToHome} style={[s.backLink, compact && s.backLinkCompact]}>
          <Text style={s.backText}>← Back to home</Text>
        </Pressable>
      )}
      <View style={[s.split, compact && s.stack]}>
        <View style={[s.intro, compact && s.introCompact]}>
          <Text accessibilityRole="header" style={[s.title, compact && s.titleCompact]}>
            {mode === 'login' ? 'Welcome Back\nto ' : 'Create Your\n'}<Text style={s.accent}>Ex-Survey</Text>{mode === 'register' ? ' Account' : ''}
          </Text>
          <Text style={s.description}>{content.body}</Text>
          {!compact && <View style={s.features}>{content.features.map(([Icon, label, detail]) =>
            <View key={label} style={s.feature}><View style={s.icon}><Icon color="#00e6f5" /></View>
              <View><Text style={s.featureTitle}>{label}</Text>{!!detail && <Text style={s.featureDetail}>{detail}</Text>}</View>
            </View>)}</View>}
        </View>
        <View nativeID="ex-auth-glass" style={[s.panel, compact && s.panelCompact]}>
          <View style={s.tabs}>
            {(['login', 'register'] as const).filter(tab => tab === mode || onSwitch).map(tab => {
              const active = tab === mode;
              return <Pressable key={tab} accessibilityRole="button" accessibilityState={{selected: active}}
                onPress={active ? undefined : onSwitch} style={[s.tab, active && s.activeTab]}>
                <Text style={s.tabText}>{tab === 'login' ? 'Sign In' : 'Register'}</Text>
              </Pressable>;
            })}
          </View>
          {children}
        </View>
      </View>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#031c34'},
  page: {flexGrow: 1},
  scene: {width: '100%', backgroundColor: '#031c34', overflow: 'hidden'},
  photo: {position: 'absolute', bottom: 0, left: 0, width: '100%', height: '76%'},
  loginPhoto: {transform: [{scaleX: -1}]},
  registerPhoto: {width: '74%', height: '72%'},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 25, paddingHorizontal: 38},
  brandCompact: {paddingTop: 15, paddingHorizontal: 17},
  backLink: {alignSelf: 'flex-start', marginLeft: 38, marginTop: 8, minHeight: 44, justifyContent: 'center'},
  backLinkCompact: {marginLeft: 17},
  backText: {color: '#8ff5ff', fontSize: 14, fontWeight: '700'},
  brandName: {fontSize: 24, fontWeight: '800', color: '#f5fbff'},
  brandSubtitle: {fontSize: 10, color: '#e0f3ff'},
  split: {flex: 1, width: '100%', maxWidth: 1440, alignSelf: 'center', flexDirection: 'row', gap: 34, paddingHorizontal: 40, paddingTop: 24, paddingBottom: 45, alignItems: 'center'},
  stack: {flexDirection: 'column', alignItems: 'stretch', gap: 18, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24},
  intro: {flex: .9, paddingBottom: 36},
  introCompact: {flex: 0, paddingBottom: 0},
  title: {color: '#f7fbff', fontSize: 50, lineHeight: 55, fontWeight: '900', letterSpacing: -1.4},
  titleCompact: {fontSize: 34, lineHeight: 38},
  accent: {color: '#00e5f5'},
  description: {fontSize: 16, color: '#e4f3ff', lineHeight: 23, marginTop: 15, maxWidth: 340},
  features: {gap: 15, marginTop: 26},
  feature: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  icon: {width: 36, height: 36, borderRadius: 18, borderColor: '#24b9e052', borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  featureTitle: {color: '#f4faff', fontWeight: '800', fontSize: 14},
  featureDetail: {color: '#c2deef', fontSize: 12, marginTop: 3},
  panel: {flex: 1.1, maxWidth: 580, minWidth: 0, padding: 25, borderRadius: 22, borderWidth: 1, borderColor: '#2583a3', backgroundColor: '#062c49ed'},
  panelCompact: {flex: 0, maxWidth: 580, width: '100%', alignSelf: 'center', padding: 17},
  tabs: {flexDirection: 'row', gap: 3, padding: 3, backgroundColor: '#164260', borderRadius: 13, marginBottom: 17},
  tab: {flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent'},
  activeTab: {backgroundColor: '#063d59', borderColor: '#077795', borderBottomColor: '#00e5f5'},
  tabText: {color: '#f3fbff', fontSize: 14, fontWeight: '800'},
});
