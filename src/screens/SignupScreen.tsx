import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import FormInput from '../components/FormInput';
import RoleSelector from '../components/RoleSelector';
import PrimaryButton from '../components/PrimaryButton';

type Props = {
  onRegister: (data: {
    name: string;
    email: string;
    role: string;
    password: string;
  }) => void;
  onGoToLogin: () => void;
  loading?: boolean;
};

export default function SignupScreen({onRegister, onGoToLogin, loading}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Surveyor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    onRegister({name, email, role, password});
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Ex-Survey to get started</Text>

          <FormInput
            label="Full Name"
            value={name}
            onChangeText={t => {
              setName(t);
              setError('');
            }}
          />
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
          <RoleSelector value={role} onChange={setRole} />
          <FormInput
            label="Password"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={t => {
              setPassword(t);
              setError('');
            }}
            secureTextEntry
          />
          <FormInput
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={t => {
              setConfirmPassword(t);
              setError('');
            }}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Register" onPress={handleRegister} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.footerLink} onPress={onGoToLogin}>
              Login
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: '100vh', backgroundColor: '#eef1fb'},
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
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
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#7a7f93',
    marginBottom: 22,
    marginTop: 4,
  },
  error: {color: '#d64545', fontSize: 13, marginBottom: 8, textAlign: 'center'},
  footerRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 18},
  footerText: {fontSize: 13, color: '#6a6f83'},
  footerLink: {fontSize: 13, color: '#1a237e', fontWeight: '700'},
});