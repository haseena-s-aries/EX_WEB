import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';

type Props = {
  onLogin: (email: string, password: string) => void;
  onGoToSignup: () => void;
  loading?: boolean;
};

export default function LoginScreen({onLogin, onGoToSignup, loading}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    onLogin(email, password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <AnimatedCard style={styles.authCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>EX</Text></View>
            <View>
              <Text style={styles.brandName}>EX-SURVEY</Text>
              <Text style={styles.brandSub}>FIELD OPERATIONS</Text>
            </View>
          </View>
          <View style={styles.kickerRow}><View style={styles.kickerDot} /><Text style={styles.kicker}>SECURE TEAM ACCESS</Text></View>
          <Text style={styles.title}>Good to see you.</Text>
          <Text style={styles.subtitle}>Sign in to pick up where your team left off.</Text>

          <FormInput
            label="Email"
            value={email}
            onChangeText={t => {
              setEmail(t);
              setError('');
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={t => {
              setPassword(t);
              setError('');
            }}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Login" onPress={handleLogin} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text style={styles.footerLink} onPress={onGoToSignup}>
              Sign up
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: '100vh', overflow: 'hidden', backgroundColor: '#dce8ff', ...Platform.select({web: {backgroundImage: 'linear-gradient(135deg, #dce8ff 0%, #e9e5ff 56%, #d7e7ff 100%)'}, default: {}})},
  orbLarge: {position: 'absolute', width: 520, height: 520, borderRadius: 260, borderWidth: 1, borderColor: 'rgba(113,139,232,0.28)', top: -190, right: -100},
  orbSmall: {position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: 'rgba(241,120,88,0.12)', bottom: -180, left: -100},
  scrollContent: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40},
  authCard: {maxWidth: 440, paddingHorizontal: 38, paddingVertical: 38, borderRadius: 25, backgroundColor: '#fff', ...Platform.select({web: {boxShadow: '0px 28px 80px rgba(0, 0, 0, 0.28)'}, default: {shadowColor: '#242d52', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.28, shadowRadius: 32, elevation: 8}})},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 34},
  brandMark: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242d52'},
  brandMarkText: {color: '#b8a5f8', fontSize: 13, fontWeight: '900', letterSpacing: 0.6},
  brandName: {fontSize: 12, letterSpacing: 1.4, color: '#252f50', fontWeight: '900'},
  brandSub: {fontSize: 9, letterSpacing: 1.5, color: '#8b958e', fontWeight: '800', marginTop: 3},
  kickerRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  kickerDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#f17858'},
  kicker: {fontSize: 9, fontWeight: '900', color: '#65756c', letterSpacing: 1.5},
  title: {fontSize: 30, fontWeight: '800', color: '#252f50', letterSpacing: -0.7},
  subtitle: {fontSize: 13, lineHeight: 20, color: '#7a857d', marginBottom: 28, marginTop: 7},
  error: {color: '#d64545', fontSize: 13, marginBottom: 8, textAlign: 'center'},
  footerRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 18},
  footerText: {fontSize: 13, color: '#6a6f83'},
  footerLink: {fontSize: 13, color: '#718be8', fontWeight: '800'},
});

