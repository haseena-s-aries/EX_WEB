import React, {useMemo, useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
  TextInputKeyPressEvent,
  useWindowDimensions,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import {useThemeMode, ThemeMode} from '../theme/useThemeMode';

type Props = {
  email: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
  loading?: boolean;
  /** Starting theme; a choice saved from the login screen's toggle wins. */
  theme?: ThemeMode | 'system';
  /** Optional backdrop photo (e.g. plant towers by day, heavy machinery at dusk). */
  heroImage?: ImageSourcePropType | null;
};

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

/* ------------------------------------------------------------------ */
/* Shared OTP logic (both themes)                                      */
/* ------------------------------------------------------------------ */

function useOtp(onVerify: (otp: string) => void, onResend: () => void) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<React.ElementRef<typeof TextInput> | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const next = [...digits];
    let focusIdx = index;

    if (cleaned.length === 0) {
      next[index] = '';
    } else if (cleaned.length === 1 || (cleaned.length === 2 && digits[index])) {
      // typing, or typing over a filled box: keep the newly typed digit
      const ch =
        cleaned.length === 1
          ? cleaned
          : cleaned[0] === digits[index]
          ? cleaned[1]
          : cleaned[0];
      next[index] = ch;
      focusIdx = Math.min(index + 1, OTP_LENGTH - 1);
    } else {
      // pasted / autofilled code: spread it across the boxes
      const chars = cleaned.slice(0, OTP_LENGTH).split('');
      const start = cleaned.length >= OTP_LENGTH ? 0 : index;
      chars.forEach((ch, i) => {
        if (start + i < OTP_LENGTH) next[start + i] = ch;
      });
      focusIdx = Math.min(start + chars.length, OTP_LENGTH - 1);
    }

    setDigits(next);
    setError('');
    if (focusIdx !== index) {
      inputs.current[focusIdx]?.focus();
    }
  };

  const handleKeyPress = (
    e: TextInputKeyPressEvent,
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
    setSeconds(RESEND_SECONDS);
    inputs.current[0]?.focus();
    onResend();
  };

  return {digits, error, seconds, inputs, handleChange, handleKeyPress, handleVerify, handleResend};
}

export default function OtpScreen(props: Props) {
  const mode = useThemeMode(props.theme);
  return <OtpThemed {...props} mode={mode} />;
}

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const OTP_DARK = {
  canvas: '#0A0D12',
  card: '#12161D',
  sheet: '#0D1117',
  input: '#1A202A',
  inputActive: '#161C26',
  inputFilledBg: '#1A202A',
  inputBorder: '#232B36',
  filled: '#3B4758',
  border: '#232B36',
  amber: '#F59E0B',
  amberHover: '#D97706',
  accentText: '#F59E0B', // timer digits + "Resend Code"
  text: '#F8FAFC',
  secondary: '#94A3B8',
  muted: '#64748B',
  helper: '#7B8798', // a touch lighter than muted so 12px text stays readable
  onAccent: '#0A0D12',
  error: '#EF4444',
  topBarBg: 'rgba(10,13,18,0.85)',
  glowAmber: 'rgba(245,158,11,0.08)',
  glowSlate: 'rgba(71,85,105,0.20)',
  dimRgb: '10,13,18',
  dimDesktop: 0.78,
  dimMobile: 0.55,
  scrimRgb: '0,0,0',
  scrimAlpha: 0.8,
  boxGlow: '0 0 12px rgba(245,158,11,0.35)',
  boxGlowNative: 0.45,
  cardShadow: '0 24px 48px -12px rgba(0,0,0,0.7)',
  sheetShadow: '0 -8px 30px rgba(0,0,0,0.55)',
  ctaShadow: 'none',
  cardMax: 480,
  elevation: 12,
};

const OTP_LIGHT: typeof OTP_DARK = {
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  input: '#F1F5F9',
  inputActive: '#FFFFFF',
  inputFilledBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  filled: '#94A3B8',
  border: '#E2E8F0',
  amber: '#F59E0B',
  amberHover: '#D97706',
  accentText: '#B45309', // spec's #D97706 is only ~3:1 on white; this stays readable outdoors
  text: '#0F172A',
  secondary: '#475569',
  muted: '#64748B',
  helper: '#64748B', // spec's #94A3B8 is ~2.6:1 on white at 12px
  onAccent: '#0F172A',
  error: '#DC2626',
  topBarBg: '#FFFFFF',
  glowAmber: 'rgba(245,158,11,0.12)',
  glowSlate: 'rgba(148,163,184,0.22)',
  dimRgb: '248,250,252',
  dimDesktop: 0.92,
  dimMobile: 0,
  scrimRgb: '248,250,252',
  scrimAlpha: 0.85,
  boxGlow: '0 0 10px rgba(245,158,11,0.25)',
  boxGlowNative: 0.25,
  cardShadow: '0 12px 32px -4px rgba(15,23,42,0.08)',
  sheetShadow: '0 -8px 24px rgba(0,0,0,0.06)',
  ctaShadow: '0 4px 8px rgba(245,158,11,0.25)',
  cardMax: 460,
  elevation: 4,
};

type OtpColors = typeof OTP_DARK;

const web = (style: object) => Platform.select({web: style, default: {}}) as object;
const FONT = web({
  fontFamily:
    "Inter, 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif",
});

/** Vertical stack of translucent strips = a gradient that works on every platform. */
function Fade({
  height,
  rgb,
  from,
  maxAlpha = 1,
}: {
  height: number;
  rgb: string;
  from: 'top' | 'bottom';
  maxAlpha?: number;
}) {
  const steps = 12;
  return (
    <View
      pointerEvents="none"
      style={{position: 'absolute', left: 0, right: 0, height, [from]: 0}}>
      {Array.from({length: steps}).map((_, i) => {
        const t = from === 'top' ? 1 - i / (steps - 1) : i / (steps - 1);
        return (
          <View
            key={i}
            style={{height: height / steps, backgroundColor: `rgba(${rgb},${(t * maxAlpha).toFixed(2)})`}}
          />
        );
      })}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Backdrop({
  photo,
  desktop,
  c,
  s,
}: {
  photo?: ImageSourcePropType | null;
  desktop: boolean;
  c: OtpColors;
  s: Styles;
}) {
  const dim = desktop ? c.dimDesktop : c.dimMobile;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {photo ? (
        <>
          <Image
            source={photo}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            style={StyleSheet.absoluteFill}
          />
          {dim > 0 ? (
            <View
              style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(${c.dimRgb},${dim})`}]}
            />
          ) : null}
        </>
      ) : (
        <>
          {/* no photo supplied: soft amber work-light glow + cool slate haze */}
          <View style={[s.glow, desktop ? s.glowAmberLarge : s.glowAmberSmall]} />
          <View style={[s.glow, desktop ? s.glowSlateLarge : s.glowSlateSmall]} />
        </>
      )}
    </View>
  );
}

function Brand({size = 22, c, s}: {size?: number; c: OtpColors; s: Styles}) {
  return (
    <Text style={[s.brand, {fontSize: size}]}>
      <Text style={{color: c.amber}}>Ex-</Text>Survey
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Screen (light + dark share one layout)                              */
/* ------------------------------------------------------------------ */

function OtpThemed({
  mode,
  email,
  onVerify,
  onResend,
  onBack,
  loading,
  heroImage,
}: Props & {mode: ThemeMode}) {
  const isDark = mode === 'dark';
  const c = isDark ? OTP_DARK : OTP_LIGHT;
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);

  const {width, height} = useWindowDimensions();
  const isDesktop = width >= 768;
  const showSlogan = width >= 1024;
  const {digits, error, inputs, seconds, handleChange, handleKeyPress, handleVerify, handleResend} =
    useOtp(onVerify, onResend);
  const [activeIdx, setActiveIdx] = useState(0);

  const boxW = isDesktop ? 56 : 54;
  const boxH = isDesktop ? 64 : 62;
  const boxR = isDesktop ? 12 : 12;
  const ctaH = isDesktop ? 48 : 52;
  const ctaR = isDesktop ? 10 : 12;
  const mm = `00:${seconds < 10 ? `0${seconds}` : seconds}`;

  const card = (
    <>
      {isDesktop ? <Brand c={c} s={s} /> : null}
      <Text style={[s.title, isDesktop && {marginTop: 16}, {fontSize: isDesktop ? 24 : 22}]}>
        Verify Your Identity
      </Text>
      <Text style={s.subtitle}>Enter the 4-digit code sent to your email.</Text>
      {email ? (
        <Text style={s.email} numberOfLines={1}>
          {email}
        </Text>
      ) : null}

      <View style={s.otpRow}>
        {digits.map((digit, index) => {
          const active = activeIdx === index;
          return (
            <TextInput
              key={index}
              ref={ref => {
                inputs.current[index] = ref;
              }}
              value={digit}
              onChangeText={t => handleChange(t, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              onFocus={() => setActiveIdx(index)}
              onSubmitEditing={index === OTP_LENGTH - 1 ? handleVerify : undefined}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectionColor={c.amber}
              autoFocus={index === 0}
              autoComplete={index === 0 ? 'sms-otp' : 'off'}
              textContentType={index === 0 ? 'oneTimeCode' : 'none'}
              accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
              style={[
                s.box,
                FONT,
                {width: boxW, height: boxH, borderRadius: boxR},
                digit ? {borderColor: c.filled, backgroundColor: c.inputFilledBg} : null,
                active && s.boxActive,
                !!error && {borderColor: c.error},
                web({outlineStyle: 'none', caretColor: c.text}),
                active && !error ? web({boxShadow: c.boxGlow}) : null,
              ]}
            />
          );
        })}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.timerRow}>
        {seconds > 0 ? (
          <Text style={s.timerText}>
            Resend in <Text style={s.timerDigits}>{mm}</Text>
          </Text>
        ) : (
          <Pressable onPress={handleResend} accessibilityRole="link" hitSlop={8}>
            <Text style={s.resend}>Resend Code</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={handleVerify}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Verify and proceed"
        accessibilityState={{disabled: !!loading, busy: !!loading}}>
        {(state: any) => (
          <View
            style={[
              s.cta,
              {height: ctaH, borderRadius: ctaR},
              web({boxShadow: c.ctaShadow}),
              !loading && (state.pressed || state.hovered) && {backgroundColor: c.amberHover},
              loading && {opacity: 0.85},
            ]}>
            {loading ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={[s.ctaText, FONT]}>Verify & Proceed</Text>
            )}
          </View>
        )}
      </Pressable>

      <Text style={[s.helper, FONT]}>
        Didn't receive the code? Check your spam folder or try again later.
      </Text>
      <Text style={[s.back, FONT]} onPress={onBack} accessibilityRole="link">
        ← Back
      </Text>
    </>
  );

  /* ---------------- desktop ---------------- */
  if (isDesktop) {
    return (
      <View style={[s.screen, {minHeight: height}]}>
        <Backdrop photo={heroImage} desktop c={c} s={s} />
        <View style={[s.topBar, web({backdropFilter: 'blur(12px)'})]}>
          <Brand c={c} s={s} />
        </View>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={s.desktopBody}
          keyboardShouldPersistTaps="handled">
          {showSlogan ? (
            <View style={s.sloganCol}>
              <View style={s.sloganRule} />
              <Text style={[s.sloganTitle, FONT]}>SAFER SITES</Text>
              <Text style={[s.sloganTitle, s.sloganTitleMuted, FONT]}>STRONGER TOMORROWS</Text>
              <Text style={[s.sloganSub, FONT]}>
                REAL INSIGHTS. SAFER PEOPLE. BRIGHTER OUTCOMES.
              </Text>
            </View>
          ) : null}
          <View style={s.cardCol}>
            <AnimatedCard style={s.cardDesktop}>{card}</AnimatedCard>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ---------------- mobile ---------------- */
  const heroH = Math.max(200, Math.round(height * 0.3));
  return (
    <View style={[s.screen, {minHeight: height}]}>
      <ScrollView
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled">
        <View style={[s.mobileHero, {height: heroH}]}>
          <Backdrop photo={heroImage} desktop={false} c={c} s={s} />
          <Fade height={heroH * 0.4} rgb={c.scrimRgb} from="top" maxAlpha={c.scrimAlpha} />
          <View style={s.mobileHeroBar}>
            <Brand size={20} c={c} s={s} />
          </View>
        </View>
        <AnimatedCard style={s.sheet}>{card}</AnimatedCard>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: OtpColors, isDark: boolean) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.canvas, overflow: 'hidden'},

    glow: {position: 'absolute'},
    glowAmberLarge: {
      width: 720,
      height: 720,
      borderRadius: 360,
      left: -240,
      bottom: -300,
      backgroundColor: c.glowAmber,
    },
    glowSlateLarge: {
      width: 640,
      height: 640,
      borderRadius: 320,
      right: -220,
      top: -260,
      backgroundColor: c.glowSlate,
    },
    glowAmberSmall: {
      width: 320,
      height: 320,
      borderRadius: 160,
      left: -120,
      bottom: -140,
      backgroundColor: c.glowAmber,
    },
    glowSlateSmall: {
      width: 300,
      height: 300,
      borderRadius: 150,
      right: -110,
      top: -120,
      backgroundColor: c.glowSlate,
    },

    brand: {...(FONT as object), fontWeight: '800', color: c.text, letterSpacing: 0.4},

    /* desktop */
    topBar: {
      height: 64,
      justifyContent: 'center',
      paddingHorizontal: 40,
      backgroundColor: c.topBarBg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 2,
    },
    desktopBody: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 56,
      paddingVertical: 40,
      gap: 48,
    },
    sloganCol: {flex: 1, maxWidth: 560},
    sloganRule: {width: 48, height: 3, backgroundColor: c.amber, marginBottom: 24},
    sloganTitle: {
      fontSize: 44,
      lineHeight: 48,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    sloganTitleMuted: {color: c.secondary},
    sloganSub: {
      marginTop: 24,
      fontSize: 12,
      letterSpacing: 2.4,
      color: c.muted,
      fontWeight: '500',
    },
    cardCol: {flex: 1, alignItems: 'center', minWidth: 360},
    cardDesktop: {
      maxWidth: c.cardMax,
      paddingTop: 40,
      paddingBottom: 40,
      paddingHorizontal: 36,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      ...web({boxShadow: c.cardShadow}),
      elevation: c.elevation,
    },

    /* mobile */
    mobileHero: {overflow: 'hidden', backgroundColor: c.canvas},
    mobileHeroBar: {
      paddingTop: Platform.OS === 'web' ? 24 : 52,
      paddingHorizontal: 20,
    },
    sheet: {
      maxWidth: '100%',
      flexGrow: 1,
      marginTop: -28,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 32,
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopWidth: 1,
      borderTopColor: c.border,
      alignItems: 'center',
      ...web({boxShadow: c.sheetShadow}),
    },

    /* content */
    title: {...(FONT as object), fontWeight: '700', color: c.text, textAlign: 'center'},
    subtitle: {
      ...(FONT as object),
      fontSize: 14,
      lineHeight: 20,
      color: c.secondary,
      textAlign: 'center',
      marginTop: 8,
    },
    email: {
      ...(FONT as object),
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
      marginTop: 4,
      maxWidth: '100%',
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 28,
      marginBottom: 16,
    },
    box: {
      backgroundColor: c.input,
      borderWidth: 1.5,
      borderColor: c.inputBorder,
      color: c.text,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      padding: 0,
    },
    boxActive: {
      borderWidth: 2,
      borderColor: c.amber,
      backgroundColor: c.inputActive,
      shadowColor: c.amber,
      shadowOffset: {width: 0, height: isDark ? 0 : 2},
      shadowOpacity: c.boxGlowNative,
      shadowRadius: isDark ? 8 : 6,
    },
    error: {
      ...(FONT as object),
      fontSize: 13,
      color: c.error,
      textAlign: 'center',
      marginBottom: 8,
    },
    timerRow: {marginTop: 8, marginBottom: 24, minHeight: 20, alignItems: 'center'},
    timerText: {...(FONT as object), fontSize: 14, color: isDark ? c.muted : c.secondary},
    timerDigits: {color: c.accentText, fontWeight: '700'},
    resend: {
      ...(FONT as object),
      fontSize: 14,
      color: c.accentText,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    cta: {
      width: '100%',
      minWidth: 280,
      alignSelf: 'stretch',
      backgroundColor: c.amber,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {color: c.onAccent, fontSize: 16, fontWeight: '700', letterSpacing: 0.3},
    helper: {
      marginTop: 20,
      fontSize: 12,
      lineHeight: 18,
      color: c.helper,
      textAlign: 'center',
    },
    back: {marginTop: 16, fontSize: 13, color: c.secondary, textAlign: 'center'},
  });
}
