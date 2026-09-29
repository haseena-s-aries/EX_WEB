import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
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
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AnimatedCard style={styles.authCard}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>EX</Text></View>
          <View>
            <Text style={styles.brandName}>EX-SURVEY</Text>
            <Text style={styles.brandSub}>FIELD OPERATIONS</Text>
          </View>
        </View>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✉</Text>
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 4-digit code to{'\n'}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: '100vh', overflow: 'hidden', backgroundColor: '#dce8ff', ...Platform.select({web: {backgroundImage: 'linear-gradient(135deg, #dce8ff 0%, #e9e5ff 56%, #d7e7ff 100%)'}, default: {}})},
  orbLarge: {position: 'absolute', width: 520, height: 520, borderRadius: 260, borderWidth: 1, borderColor: 'rgba(113,139,232,0.28)', top: -190, right: -100},
  orbSmall: {position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: 'rgba(241,120,88,0.12)', bottom: -180, left: -100},
  scrollContent: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  authCard: {maxWidth: 440, paddingHorizontal: 38, paddingVertical: 38, borderRadius: 25, backgroundColor: '#fff', ...Platform.select({web: {boxShadow: '0px 28px 80px rgba(0, 0, 0, 0.28)'}, default: {shadowColor: '#242d52', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.28, shadowRadius: 32, elevation: 8}})},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 32},
  brandMark: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242d52'},
  brandMarkText: {color: '#b8a5f8', fontSize: 13, fontWeight: '900', letterSpacing: 0.6},
  brandName: {fontSize: 12, letterSpacing: 1.4, color: '#252f50', fontWeight: '900'},
  brandSub: {fontSize: 9, letterSpacing: 1.5, color: '#8b958e', fontWeight: '800', marginTop: 3},
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f0eeff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  iconText: {fontSize: 22, color: '#718be8'},
  title: {fontSize: 24, fontWeight: '800', textAlign: 'left', color: '#252f50', letterSpacing: -0.4},
  subtitle: {
    fontSize: 13,
    textAlign: 'left',
    color: '#7a857d',
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 19,
  },
  emailText: {color: '#718be8', fontWeight: '700'},
  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#dce5dd',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#252f50',
    backgroundColor: '#f8f9fc',
  },
  otpBoxFilled: {borderColor: '#718be8', backgroundColor: '#fff'},
  error: {color: '#d64545', fontSize: 13, marginBottom: 8, textAlign: 'center'},
  footerRow: {flexDirection: 'row', justifyContent: 'flex-start', marginTop: 18},
  footerText: {fontSize: 13, color: '#6a6f83'},
  footerLink: {fontSize: 13, color: '#718be8', fontWeight: '700'},
  backLink: {textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9aa0b4'},
});
