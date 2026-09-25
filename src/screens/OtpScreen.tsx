import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import PrimaryButton from '../components/PrimaryButton';

type Props = {
  email: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
  loading?: boolean;
};

const OTP_LENGTH = 4;

export default function OtpScreen({email, onVerify, onResend, onBack, loading}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleChange = (text: string, index: number) => {
    const value = text.replace(/[^0-9]/g, '');
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    setError('');
    if (value && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 4-digit code');
      return;
    }
    setError('');
    onVerify(code);
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setDigits(Array(OTP_LENGTH).fill(''));
    setSeconds(30);
    onResend();
  };

  return (
    <View style={styles.screen}>
      <AnimatedCard>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✉</Text>
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputs.current[index] = ref;
              }}
              value={digit}
              onChangeText={t => handleChange(t, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              style={[styles.otpBox, digit && styles.otpBoxFilled]}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton title="Verify" onPress={handleVerify} loading={loading} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            {seconds > 0 ? `Resend code in ${seconds}s` : "Didn't get the code?"}
          </Text>
          {seconds === 0 && (
            <Text style={styles.footerLink} onPress={handleResend}>
              {' '}
              Resend
            </Text>
          )}
        </View>

        <Text style={styles.backLink} onPress={onBack}>
          ← Back
        </Text>
      </AnimatedCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: '100vh', backgroundColor: '#eef1fb', alignItems: 'center', justifyContent: 'center', padding: 20},
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8ebfa',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  iconText: {fontSize: 22, color: '#1a237e'},
  title: {fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#1a1d2b'},
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#7a7f93',
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 19,
  },
  emailText: {color: '#1a237e', fontWeight: '700'},
  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e1e4ee',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1d2b',
    backgroundColor: '#f8f9fc',
  },
  otpBoxFilled: {borderColor: '#1a237e', backgroundColor: '#fff'},
  error: {color: '#d64545', fontSize: 13, marginBottom: 8, textAlign: 'center'},
  footerRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 18},
  footerText: {fontSize: 13, color: '#6a6f83'},
  footerLink: {fontSize: 13, color: '#1a237e', fontWeight: '700'},
  backLink: {textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9aa0b4'},
});