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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <AnimatedCard>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EX</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Login to Ex-Survey</Text>

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
  screen: {flex: 1, minHeight: '100vh', backgroundColor: '#eef1fb'},
  scrollContent: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a237e',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  logoText: {color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1},
  title: {fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#1a1d2b'},
  subtitle: {fontSize: 13, textAlign: 'center', color: '#7a7f93', marginBottom: 22, marginTop: 4},
  error: {color: '#d64545', fontSize: 13, marginBottom: 8, textAlign: 'center'},
  footerRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 18},
  footerText: {fontSize: 13, color: '#6a6f83'},
  footerLink: {fontSize: 13, color: '#1a237e', fontWeight: '700'},
});