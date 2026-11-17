import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {AccountProfile, changeMyPassword, getMyProfile, removeProfilePhoto, requestEmailChange, updateMyProfile, uploadProfilePhoto} from '../api/account';
import {getApiErrorMessage} from '../api/errors';
import {Colors} from '../theme/palette';
import ClientLogoUpload from './ClientLogoUpload';
import {ClientLogoFile} from './clientLogo';
import AuthenticatedImage from './AuthenticatedImage';

export default function AccountSettingsPanel({section, colors: c, onProfileUpdated, onSessionEnd}: {section: 'My Profile' | 'Security'; colors: Colors; onProfileUpdated?: (profile: AccountProfile) => void; onSessionEnd?: () => void}) {
  const [profile, setProfile] = useState<AccountProfile>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [designation, setDesignation] = useState(''); const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<ClientLogoFile | null>(null); const [remove, setRemove] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [show, setShow] = useState(false); const [signedOut, setSignedOut] = useState(false);
  const restore = (p: AccountProfile) => {setName(p.displayName); setPhone(p.phoneNumber || ''); setDesignation(p.designation || ''); setEmail(p.email); setPhoto(null); setRemove(false); setCurrentPassword('');};
  const load = async () => {setBusy(true); setError(''); try {const p = (await getMyProfile()).data; setProfile(p); restore(p);} catch (e) {setError(getApiErrorMessage(e, 'Could not load your profile.'));} finally {setBusy(false);}};
  useEffect(() => {void load();}, []);
  const accept = (p: AccountProfile) => {setProfile(p); onProfileUpdated?.(p);};
  const save = async () => {
    if (busy || !profile) return; setError(''); setNotice('');
    if (!name.trim()) {setError('Full Name is required.'); return;}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError('Enter a valid email address.'); return;}
    if (email.trim().toLowerCase() !== profile.email.toLowerCase() && !currentPassword) {setError('Enter your current password to request an email change.'); return;}
    if (photo?.webFile?.size > 5 * 1024 * 1024) {setError('Choose a profile photo up to 5 MB.'); return;}
    setBusy(true);
    try {
      let saved = (await updateMyProfile({displayName: name.trim(), phoneNumber: phone.trim(), designation: designation.trim()})).data; accept(saved);
      if (photo) {saved = (await uploadProfilePhoto(photo)).data; accept(saved); setPhoto(null);}
      else if (remove) {saved = (await removeProfilePhoto()).data; accept(saved); setRemove(false);}
      if (email.trim().toLowerCase() !== profile.email.toLowerCase()) {saved = (await requestEmailChange(email.trim(), currentPassword)).data; accept(saved); setNotice('Profile saved. Verify the link sent to your new email address. Your current login email remains active until verification.');}
      else setNotice('Profile saved successfully.');
      restore(saved);
    } catch (e) {setError(getApiErrorMessage(e, 'Some changes could not be saved. Your successfully saved profile details are retained.'));}
    finally {setBusy(false);}
  };
  const changePassword = async () => {
    if (busy) return; setError(''); setNotice('');
    if (!currentPassword || !newPassword.trim() || newPassword !== confirm) {setError('Enter your current password, a new password, and matching confirmation.'); return;}
    setBusy(true);
    try {await changeMyPassword(currentPassword, newPassword, confirm); setCurrentPassword(''); setNewPassword(''); setConfirm(''); setSignedOut(true); setNotice('Password changed successfully. Sign in again with your new password.');}
    catch (e) {setError(getApiErrorMessage(e, 'Could not change your password.'));}
    finally {setBusy(false);}
  };
  const button = (label: string, onPress: () => void, primary = false) => <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={busy} style={{minHeight: 44, borderWidth: 1, borderColor: c.borderActive, borderRadius: 9, padding: 12, backgroundColor: primary ? c.cyan : c.elevated, opacity: busy ? .5 : 1}}><Text style={{color: primary ? c.onAmber : c.text, fontWeight: '800'}}>{label}</Text></TouchableOpacity>;
  const field = (label: string, value: string, update: (value: string) => void, password = false, maxLength = 200) => <View style={{gap: 6}}><Text style={{color: c.secondary, fontWeight: '700'}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={update} editable={!busy && !signedOut} secureTextEntry={password && !show} autoCapitalize="none" autoCorrect={false} maxLength={maxLength} style={{minHeight: 46, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, fontSize: 16, color: c.text, backgroundColor: c.elevated}} /></View>;
  return <View style={{gap: 16}}>
    {busy && <ActivityIndicator color={c.cyan} />}
    {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={{color: c.success, lineHeight: 22}}>{notice}</Text>}
    {!profile && !busy ? button('Retry loading profile', () => void load()) : profile && <>
      {section === 'My Profile' ? <>
        <View style={{gap: 10, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 14}}>
          {profile.profilePhotoUrl && !remove && !photo && <AuthenticatedImage path={profile.profilePhotoUrl} style={{width: 84, height: 84, borderRadius: 42}} />}
          <ClientLogoUpload label="Profile Photo" disabled={busy} value={photo} onChange={value => {setPhoto(value); if (value) setRemove(false);}} />
          <Text style={{color: c.muted}}>JPG, JPEG or PNG · Maximum 5 MB</Text>
          {profile.profilePhotoUrl && !remove && button('Remove Profile Photo', () => {setRemove(true); setPhoto(null);})}
          {remove && <Text style={{color: c.secondary}}>Photo will be removed when you save changes.</Text>}
        </View>
        {field('Full Name', name, setName)}{field('Email Address', email, setEmail, false, 320)}
        {!!profile.pendingEmail && <Text style={{color: c.amber}}>Verification pending: {profile.pendingEmail}. Current login: {profile.email}</Text>}
        {email.trim().toLowerCase() !== profile.email.toLowerCase() && field('Current Password for Email Change', currentPassword, setCurrentPassword, true, 256)}
        {field('Phone Number', phone, setPhone, false, 40)}{field('Designation', designation, setDesignation, false, 150)}
        <View style={{gap: 7, padding: 14, backgroundColor: c.elevated, borderRadius: 9}}><Text style={{color: c.secondary}}>User Role (read-only)</Text><Text style={{color: c.text, fontWeight: '800'}}>{profile.role}</Text><Text style={{color: c.secondary}}>Account Status (read-only)</Text><Text style={{color: c.text}}>{profile.isActive ? profile.approvalStatus : 'Disabled'}</Text></View>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>{button('Save Changes', () => void save(), true)}{button('Cancel', () => {restore(profile); setError(''); setNotice('');})}</View>
      </> : signedOut ? button('Sign In Again', () => onSessionEnd?.(), true) : profile.canChangePassword ? <>
        <Text style={{color: c.secondary, lineHeight: 22}}>Change your local account password. Existing online sessions will be signed out after a successful change.</Text>
        {field('Current Password', currentPassword, setCurrentPassword, true, 256)}{field('New Password', newPassword, setNewPassword, true, 256)}{field('Confirm New Password', confirm, setConfirm, true, 256)}
        {button(show ? 'Hide Passwords' : 'Show Passwords', () => setShow(!show))}{button('Change Password', () => void changePassword(), true)}
      </> : <Text style={{color: c.secondary}}>This account has no local password. Manage your password through your organization’s identity provider or contact your administrator.</Text>}
    </>}
  </View>;
}
