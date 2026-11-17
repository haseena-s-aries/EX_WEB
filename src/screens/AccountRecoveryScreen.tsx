import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import AuthReferenceLayout from '../components/AuthReferenceLayout';
import {requestPasswordCode, resetPasswordWithCode, resetPassword, verifyEmail} from '../api/account';
import {getApiErrorMessage} from '../api/errors';

export default function AccountRecoveryScreen({mode, token = '', onLogin, onHome}: {mode: 'forgot' | 'reset' | 'verify'; token?: string; onLogin: () => void; onHome?: () => void}) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false); const [code, setCode] = useState(''); const [cooldown, setCooldown] = useState(0);
  const sameScreenReset = mode === 'forgot' && codeSent;
  const title = mode === 'forgot' ? 'Forgot Password' : mode === 'reset' ? 'Reset Password' : 'Verify Email Address';
  useEffect(() => {if (done && (mode !== 'forgot' || codeSent)) {const timer = setTimeout(onLogin, 1500); return () => clearTimeout(timer);}}, [done, mode, codeSent, onLogin]);
  useEffect(() => {if (cooldown > 0) {const timer = setTimeout(() => setCooldown(v => v - 1), 1000); return () => clearTimeout(timer);}}, [cooldown]);
  const sendCode = async () => {
    if (busy || cooldown > 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError('Enter a valid email address.'); return;}
    setError(''); setBusy(true);
    try {await requestPasswordCode(email.trim()); setCodeSent(true); setCooldown(60);}
    catch (e) {setError(getApiErrorMessage(e, 'Could not send a verification code. Please try again.'));}
    finally {setBusy(false);}
  };
  const submit = async () => {
    if (busy || done) return; setError('');
    if (mode === 'forgot' && !codeSent) {await sendCode(); return;}
    if ((mode === 'reset' || sameScreenReset) && (!password.trim() || password.length > 256 || password !== confirm)) {setError('Enter a valid password and matching confirmation.'); return;}
    if (sameScreenReset && !/^[A-F0-9]{16}$/i.test(code.replace(/[-\s]/g, ''))) {setError('Enter the complete verification code from your email.'); return;}
    if (mode !== 'forgot' && !token) {setError('This link is incomplete. Request a new link.'); return;}
    setBusy(true);
    try {
      if (sameScreenReset) await resetPasswordWithCode(email.trim(), code.trim(), password, confirm);
      else if (mode === 'reset') await resetPassword(token, password, confirm);
      else await verifyEmail(token);
      setPassword(''); setConfirm(''); setCode(''); setDone(true);
    } catch (e) {setError(getApiErrorMessage(e, 'Could not complete this request. Please try again.'));}
    finally {setBusy(false);}
  };
  const input = (label: string, value: string, update: (v: string) => void, secure = false) => <View style={{gap: 6}}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={update} secureTextEntry={secure && !show} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={secure ? 256 : label === 'Verification Code' ? 32 : 320} keyboardType={label === 'Email Address' ? 'email-address' : 'default'} style={s.input} /></View>;
  return <AuthReferenceLayout mode="login" onBackToHome={onHome}><View style={s.form}>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    <Text style={s.body}>{mode === 'forgot' ? sameScreenReset ? 'Enter the code from your email and choose your new password below.' : 'Enter your registered email address. You can change your password here after verifying the emailed code.' : mode === 'reset' ? 'Choose your new password. Reset links expire after 20 minutes.' : 'Confirm this email change to use the verified address for future sign-ins.'}</Text>
    {done ? <><Text accessibilityLiveRegion="polite" style={s.success}>{mode !== 'verify' ? 'Password reset successfully. Sign in with your new password.' : 'Email verified. Sign in with your new email address.'}</Text><Pressable accessibilityRole="button" onPress={onLogin} style={s.button}><Text style={s.buttonText}>Back to Sign In →</Text></Pressable></>
      : <>{mode === 'forgot' && !codeSent && input('Email Address', email, setEmail)}{sameScreenReset && <><Text accessibilityLiveRegion="polite" style={s.success}>If an account exists with this email, a verification code has been sent.</Text><Text style={s.body}>{email.trim()}</Text>{input('Verification Code', code, setCode)}<Text style={s.body}>Copy the complete code, for example XXXX-XXXX-XXXX-XXXX. It expires in 20 minutes.</Text></>}{(mode === 'reset' || sameScreenReset) && <>{input('New Password', password, setPassword, true)}{input('Confirm New Password', confirm, setConfirm, true)}<Pressable accessibilityRole="button" onPress={() => setShow(v => !v)}><Text style={s.link}>{show ? 'Hide passwords' : 'Show passwords'}</Text></Pressable></>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[s.button, busy && {opacity: .5}]}><Text style={s.buttonText}>{busy ? 'Please wait…' : mode === 'forgot' && !codeSent ? 'Send Verification Code' : mode !== 'verify' ? 'Reset Password' : 'Verify Email Address'}</Text></Pressable>
        {sameScreenReset && <View style={{gap: 16}}><Pressable accessibilityRole="button" disabled={busy || cooldown > 0} onPress={() => void sendCode()}><Text style={[s.link, (busy || cooldown > 0) && {opacity: .5}]}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Verification Code'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => {setCodeSent(false); setCode(''); setPassword(''); setConfirm(''); setError(''); setCooldown(0);}}><Text style={s.link}>Use a different email</Text></Pressable></View>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={onLogin}><Text style={s.link}>← Back to Sign In</Text></Pressable>
      </>}
  </View></AuthReferenceLayout>;
}
const s = StyleSheet.create({form: {gap: 18}, title: {color: '#F5FAFF', fontSize: 27, fontWeight: '800'}, body: {fontSize: 14, lineHeight: 22, color: '#C0DAE9'}, label: {color: '#F5FAFF', fontSize: 13, fontWeight: '700'}, input: {minHeight: 48, padding: 13, borderRadius: 9, borderWidth: 1, borderColor: '#2C6679', backgroundColor: '#0C3048', color: '#F5FAFF', fontSize: 16}, button: {minHeight: 48, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#00D9EE'}, buttonText: {color: '#03192C', fontWeight: '800'}, link: {color: '#76E9F2', fontSize: 14}, error: {color: '#FF8A96'}, success: {color: '#8BE5C8', lineHeight: 24}});
