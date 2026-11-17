import React, {useState} from 'react';
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
const RoleChangePanel = React.lazy(() => import('./RoleChangePanel'));
const AccountSettingsPanel = React.lazy(() => import('./AccountSettingsPanel'));
import {AccountProfile} from '../api/account';
import {LIGHT} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {setThemeMode, useThemeMode} from '../theme/useThemeMode';

export default function AppearanceSettings({onClose, onProfileUpdated, onSessionEnd}: {onClose: () => void; onProfileUpdated?: (profile: AccountProfile) => void; onSessionEnd?: () => void}) {
  const [section, setSection] = useState<'My Profile' | 'Security' | 'Request Role Change' | 'Appearance'>('My Profile');
  const mode = useThemeMode();
  const colors = mode === 'dark' ? OPERATIONS_DARK : LIGHT;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={[styles.panel, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text accessibilityRole="header" style={[styles.title, {color: colors.text}]}>Settings</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{(['My Profile', 'Security', 'Request Role Change', 'Appearance'] as const).map(tab => <TouchableOpacity key={tab} accessibilityRole="tab" accessibilityState={{selected: section === tab}} onPress={() => setSection(tab)} style={[styles.choice, {borderColor: section === tab ? colors.cyan : colors.border}]}><Text style={{color: section === tab ? colors.cyan : colors.text, fontWeight: '700'}}>{tab}</Text></TouchableOpacity>)}</View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap: 14, paddingVertical: 8}}>
          {section === 'Request Role Change' ? <React.Suspense fallback={<Text style={{color: colors.secondary}}>Loading requests…</Text>}><RoleChangePanel colors={colors}/></React.Suspense> : section !== 'Appearance' ? <React.Suspense fallback={<Text style={{color: colors.secondary}}>Loading settings…</Text>}><AccountSettingsPanel key={section} section={section} colors={colors} onProfileUpdated={onProfileUpdated} onSessionEnd={onSessionEnd} /></React.Suspense> : <>
          <Text accessibilityRole="header" style={[styles.heading, {color: colors.text}]}>Appearance</Text>
          <Text style={{color: colors.secondary}}>Choose how Ex-Survey looks on this device.</Text>
          <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Appearance mode">
            {(['light', 'dark'] as const).map(option => (
              <TouchableOpacity key={option} accessibilityRole="radio"
                aria-checked={mode === option} onPress={() => setThemeMode(option)}
                style={[styles.choice, {backgroundColor: colors.elevated, borderColor: mode === option ? colors.cyan : colors.border}]}>
                <Text style={{color: mode === option ? colors.cyan : colors.text, fontWeight: '800'}}>
                  {option === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          </>}
          </ScrollView>
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={{color: colors.cyan, fontWeight: '800'}}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#02172AA8'},
  panel: {width: '100%', maxWidth: 640, maxHeight: '94%', padding: 24, gap: 12, borderWidth: 1, borderRadius: 18},
  title: {fontSize: 24, fontWeight: '900'},
  heading: {fontSize: 17, fontWeight: '800'},
  choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  choice: {flexGrow: 1, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: 10},
  close: {alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center'},
});
