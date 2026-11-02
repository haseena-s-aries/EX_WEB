import React, {createContext, useContext, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import ThemeToggle from '../components/ThemeToggle';
import {useThemeMode} from '../theme/useThemeMode';
import {
  AriesLogo,
  MailIcon,
  LockIcon,
  EyeIcon,
  ShieldIcon,
  BarsIcon,
  PeopleIcon,
  GoogleMark,
  MicrosoftMark,
  FaceIdIcon,
  RefineryScene,
} from '../components/LoginArt';

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'light' | 'dark';

export const LIGHT_COLORS = {
  primary: '#EA580C',
  primaryPressed: '#C2410C',
  gradFrom: '#D97706',
  gradTo: '#EA580C',
  onPrimary: '#FFFFFF',
  page: '#F8FAFC',
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  ssoBg: '#FFFFFF',
  ssoBorder: '#E2E8F0',
  text: '#0F172A',
  label: '#334155',
  muted: '#64748B',
  icon: '#94A3B8',
  error: '#EF4444',
  link: '#C2410C', // darker than the CTA so small link text stays AA-readable
  heroBg: '#EDF2F8',
  heroBgRgb: '237,242,248',
  heroRule: 'rgba(15,23,42,0.18)',
  footerBar: 'rgba(15,23,42,0.55)',
  focusGlow: 'rgba(234,88,12,0.15)',
  cardShadow: '0px 12px 40px rgba(15, 23, 42, 0.06)',
  sheetShadow: '0px -8px 30px rgba(15, 23, 42, 0.10)',
};

export const DARK_COLORS: typeof LIGHT_COLORS = {
  primary: '#F59E0B',
  primaryPressed: '#D97706',
  gradFrom: '#EA580C',
  gradTo: '#F59E0B',
  onPrimary: '#0B0F19', // dark text: white on amber only reaches ~2:1
  page: '#0B0F19',
  card: '#111827',
  sheet: '#0F172A',
  surfaceAlt: '#273449',
  border: '#1E293B',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  ssoBg: '#1E293B',
  ssoBorder: '#334155',
  text: '#F8FAFC',
  label: '#E2E8F0',
  muted: '#94A3B8',
  icon: '#94A3B8',
  error: '#F87171',
  link: '#FBBF24',
  heroBg: '#090D16',
  heroBgRgb: '9,13,22',
  heroRule: 'rgba(148,163,184,0.35)',
  footerBar: 'rgba(9,13,22,0.72)',
  focusGlow: 'rgba(245,158,11,0.22)',
  cardShadow: '0px 0px 80px rgba(245, 158, 11, 0.07)',
  sheetShadow: '0px -8px 30px rgba(0, 0, 0, 0.55)',
};

type Colors = typeof LIGHT_COLORS;

const web = (style: object) =>
  Platform.select({web: style, default: {}}) as object;

const FONT = web({
  fontFamily:
    "Inter, 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif",
});

function makeStyles(c: Colors, dark: boolean) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.page},

    /* brand */
    brandRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
    brandName: {
      ...(FONT as object),
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.4,
    },

    /* desktop split */
    split: {flex: 1, flexDirection: 'row', padding: 16, gap: 16},
    hero: {
      flex: 1.1,
      minHeight: 760,
      borderRadius: 20,
      overflow: 'hidden',
      justifyContent: 'space-between',
      backgroundColor: c.heroBg,
    },
    heroSky: dark
      ? {}
      : {
          backgroundColor: '#E6EDF6',
          ...web({
            backgroundImage:
              'linear-gradient(180deg, #D9E4F2 0%, #EEF2F8 52%, #FBEBD6 100%)',
          }),
        },
    heroContent: {paddingTop: 56, paddingHorizontal: 56, maxWidth: 520},
    heroTitle: {
      ...(FONT as object),
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.8,
      marginTop: 36,
    },
    heroBody: {
      ...(FONT as object),
      fontSize: 16,
      lineHeight: 24,
      color: c.label,
      marginTop: 16,
      maxWidth: 360,
    },
    pillRow: {flexDirection: 'row', marginTop: 40},
    pill: {paddingRight: 20, gap: 8, alignItems: 'flex-start'},
    pillDivider: {
      paddingLeft: 20,
      borderLeftWidth: 1,
      borderLeftColor: c.heroRule,
    },
    pillText: {...(FONT as object), fontSize: 12, lineHeight: 16, color: c.label},
    heroFooter: {
      height: 56,
      justifyContent: 'center',
      paddingHorizontal: 56,
      backgroundColor: '#8C9BB0',
    },
    heroFooterPhoto: {backgroundColor: c.footerBar},
    heroFooterText: {
      ...(FONT as object),
      fontSize: 12,
      letterSpacing: 2.2,
      fontWeight: '500',
      color: '#fff',
    },
    formPane: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    cardDesktop: {
      maxWidth: 440,
      padding: 36,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...web({boxShadow: c.cardShadow}),
      elevation: 2,
    },

    /* mobile */
    mobileHero: {height: 320, overflow: 'hidden', backgroundColor: c.heroBg},
    mobileHeroContent: {
      alignItems: 'center',
      paddingTop: Platform.OS === 'web' ? 36 : 56,
    },
    slogan: {
      ...(FONT as object),
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 21,
      color: c.label,
      marginTop: 10,
    },
    sheet: {
      maxWidth: '100%',
      flexGrow: 1,
      marginTop: -28,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 32,
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopWidth: 1,
      borderTopColor: c.border,
      ...web({boxShadow: c.sheetShadow}),
    },

    /* form */
    title: {...(FONT as object), color: c.text, fontWeight: '700'},
    titleWeb: {fontSize: 28, lineHeight: 36, letterSpacing: -0.5},
    titleMobile: {fontSize: 22, lineHeight: 28},
    subtitle: {
      ...(FONT as object),
      fontSize: 14,
      lineHeight: 20,
      color: c.muted,
      marginTop: 4,
      marginBottom: 24,
    },
    field: {marginBottom: 16},
    label: {
      ...(FONT as object),
      fontSize: 13,
      fontWeight: '600',
      color: c.label,
      marginBottom: 6,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.inputBg,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: c.text,
      paddingVertical: 0,
      height: '100%',
    },
    eyeBtn: {width: 24, height: 24, alignItems: 'center', justifyContent: 'center'},
    fieldError: {
      ...(FONT as object),
      fontSize: 12,
      lineHeight: 16,
      color: c.error,
      marginTop: 6,
    },

    optionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      marginTop: 2,
    },
    checkRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: dark ? c.muted : c.icon,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBg,
    },
    checkboxOn: {backgroundColor: c.primary, borderColor: c.primary},
    checkMark: {color: c.onPrimary, fontSize: 11, lineHeight: 13, fontWeight: '800'},
    meta: {
      ...(FONT as object),
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
      color: c.muted,
    },
    link: {
      ...(FONT as object),
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
      color: c.link,
    },

    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      width: '100%',
    },
    ctaText: {...(FONT as object), color: c.onPrimary, fontSize: 16, fontWeight: '600'},
    ctaArrow: {marginTop: -1},
    ctaSpinner: {marginLeft: 2},

    dividerRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22},
    dividerLine: {flex: 1, height: 1, backgroundColor: c.border},
    dividerText: {...(FONT as object), fontSize: 12, fontWeight: '500', color: c.muted},

    ssoRow: {flexDirection: 'row', gap: 12},
    sso: {
      flex: 1,
      height: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.ssoBorder,
      borderRadius: 8,
      backgroundColor: c.ssoBg,
    },
    ssoText: {...(FONT as object), fontSize: 14, fontWeight: '500', color: c.text},

    bio: {alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 4},
    bioText: {...(FONT as object), fontSize: 13, fontWeight: '500', color: c.text},

    footerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 24,
    },
  });
}

type ThemeValue = {
  c: Colors;
  s: ReturnType<typeof makeStyles>;
  dark: boolean;
};
const ThemeCtx = createContext<ThemeValue | null>(null);
const useTheme = () => useContext(ThemeCtx) as ThemeValue;

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

const LIGHT_PHOTO: ImageSourcePropType = require('../assets/refinery_towers_sharp.png');
// Despite the file names: "_mobile" is the portrait shot, "_hero" the landscape one.
const DARK_PHOTO_TALL: ImageSourcePropType = require('../assets/refinery_dark_theme_hero.png');
const DARK_PHOTO_WIDE: ImageSourcePropType = require('../assets/refinery_dark_theme_hero.png');
const LIGHT_PHOTO_ASPECT = 1800 / 1201;

const PHOTOS: Record<ThemeMode, {desktop: ImageSourcePropType; mobile: ImageSourcePropType}> = {
  light: {desktop: LIGHT_PHOTO, mobile: LIGHT_PHOTO},
  dark: {desktop: DARK_PHOTO_TALL, mobile: DARK_PHOTO_WIDE},
};

/**
 * Hero photo. Either anchored to the bottom and fading into the hero
 * background (`fadeHeight`), or filling the whole panel (`fill`) with an
 * optional left-to-right `scrim` so overlaid text stays readable.
 */
function HeroPhoto({
  source,
  fadeHeight = 0,
  height,
  fill,
  dim = 0,
  scrim,
}: {
  source: ImageSourcePropType;
  fadeHeight?: number;
  height?: number;
  fill?: boolean;
  dim?: number;
  scrim?: boolean;
}) {
  const {c} = useTheme();
  const steps = 14;
  const box: StyleProp<ViewStyle> = fill
    ? StyleSheet.absoluteFill
    : [
        {position: 'absolute', left: 0, bottom: 0, width: '100%'},
        height ? {height} : {aspectRatio: LIGHT_PHOTO_ASPECT},
      ];
  return (
    <View pointerEvents="none" style={box}>
      <Image
        source={source}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={StyleSheet.absoluteFill}
      />
      {dim > 0 ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {backgroundColor: `rgba(${c.heroBgRgb},${dim})`},
          ]}
        />
      ) : null}
      {scrim ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '85%',
            flexDirection: 'row',
          }}>
          {Array.from({length: steps}).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: `rgba(${c.heroBgRgb},${(0.88 * (1 - i / (steps - 1))).toFixed(2)})`,
              }}
            />
          ))}
        </View>
      ) : null}
      {fadeHeight > 0 ? (
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: fadeHeight}}>
          {Array.from({length: steps}).map((_, i) => (
            <View
              key={i}
              style={{
                height: fadeHeight / steps,
                backgroundColor: `rgba(${c.heroBgRgb},${(1 - i / (steps - 1)).toFixed(2)})`,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Brand({size = 40, nameSize = 26}: {size?: number; nameSize?: number}) {
  const {c, s, dark} = useTheme();
  return (
    <View style={s.brandRow}>
      <AriesLogo size={size} />
      <Text style={[s.brandName, {fontSize: nameSize}]}>
        {dark ? (
          <>
            Ex-<Text style={{color: c.primary}}>Survey</Text>
          </>
        ) : (
          'Ex-Survey'
        )}
      </Text>
    </View>
  );
}

type FieldProps = {
  label: string;
  icon: 'mail' | 'lock';
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  error?: string;
  height: number;
  radius: number;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'email' | 'current-password';
  returnKeyType?: 'next' | 'go';
  onSubmitEditing?: () => void;
};

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  height,
  radius,
  secure,
  keyboardType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
}: FieldProps) {
  const {c, s} = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? c.error : focused ? c.primary : c.inputBorder;
  const borderWidth = focused || error ? 2 : 1;

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View
        style={[
          s.inputBox,
          {
            height,
            borderRadius: radius,
            borderColor,
            borderWidth,
            paddingLeft: 15 - borderWidth,
            paddingRight: 13 - borderWidth,
          },
          focused && !error ? web({boxShadow: `0 0 0 3px ${c.focusGlow}`}) : null,
        ]}>
        {icon === 'mail' ? <MailIcon color={c.icon} /> : <LockIcon color={c.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          accessibilityLabel={label}
          secureTextEntry={secure && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, FONT, web({outlineStyle: 'none'})]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={s.eyeBtn}>
            <EyeIcon off={hidden} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SignInButton({
  onPress,
  loading,
  height,
  radius,
}: {
  onPress: () => void;
  loading?: boolean;
  height: number;
  radius: number;
}) {
  const {c, s} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Sign in"
      accessibilityState={{disabled: !!loading, busy: !!loading}}>
      {(state: any) => {
        const active = !loading && (state.pressed || state.hovered);
        return (
          <View
            style={[
              s.cta,
              {height, borderRadius: radius},
              active
                ? {
                    backgroundColor: c.primaryPressed,
                    ...web({backgroundImage: 'none'}),
                  }
                : web({
                    backgroundImage: `linear-gradient(90deg, ${c.gradFrom} 0%, ${c.gradTo} 100%)`,
                  }),
              loading && {opacity: 0.85},
            ]}>
            <Text style={s.ctaText}>Sign In</Text>
            {loading ? (
              <ActivityIndicator color={c.onPrimary} style={s.ctaSpinner} />
            ) : (
              <View
                style={[
                  s.ctaArrow,
                  {transform: [{translateX: active ? 4 : 0}]},
                  web({transition: 'transform 150ms ease'}),
                ]}>
                <Text style={s.ctaText}>→</Text>
              </View>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

function Divider({label}: {label: string}) {
  const {s} = useTheme();
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function SsoButton({
  label,
  mark,
  onPress,
}: {
  label: string;
  mark: React.ReactNode;
  onPress: () => void;
}) {
  const {c, s} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      style={({pressed}: any) => [s.sso, pressed && {backgroundColor: c.surfaceAlt}]}>
      {mark}
      <Text style={s.ssoText}>{label}</Text>
    </Pressable>
  );
}

const PILLS = [
  {label: 'Safer\nOperations', Icon: ShieldIcon},
  {label: 'Greater\nVisibility', Icon: BarsIcon},
  {label: 'A More Secure\nTomorrow', Icon: PeopleIcon},
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  /** Starting theme. 'system' (default) follows the device / browser setting. */
  theme?: ThemeMode | 'system';
  /** Show the sun/moon button in the corner (default true). */
  showThemeToggle?: boolean;
  /** Called when the person taps the toggle, e.g. to persist the choice on native. */
  onThemeChange?: (mode: ThemeMode) => void;
  onLogin: (email: string, password: string, rememberMe?: boolean) => void;
  onOfflineLogin?: (email: string,password:string) => void;
  onGoToSignup: () => void;
  loading?: boolean;
  /** Overrides the bundled photo. Pass null for no photo (light theme draws an illustration). */
  heroImage?: ImageSourcePropType | null;
  /** Each of these only renders its control when the handler is supplied. */
  onForgotPassword?: () => void;
  onGoogleSignIn?: () => void;
  onMicrosoftSignIn?: () => void;
  onBiometricSignIn?: () => void;
  showRememberMe?: boolean;
};

export default function LoginScreen(props: Props) {
  const mode: ThemeMode = useThemeMode(props.theme);

  const value = useMemo<ThemeValue>(() => {
    const dark = mode === 'dark';
    const c = dark ? DARK_COLORS : LIGHT_COLORS;
    return {c, s: makeStyles(c, dark), dark};
  }, [mode]);

  return (
    <ThemeCtx.Provider value={value}>
      <View style={value.s.screen}>
        <LoginBody {...props} mode={mode} />
        {props.showThemeToggle === false ? null : <ThemeToggle onChange={props.onThemeChange} />}
      </View>
    </ThemeCtx.Provider>
  );
}

function LoginBody({
  mode,
  onLogin,
  onOfflineLogin,
  onGoToSignup,
  loading,
  heroImage,
  onForgotPassword,
  onGoogleSignIn,
  onMicrosoftSignIn,
  onBiometricSignIn,
  showRememberMe,
}: Props & {mode: ThemeMode}) {
  const {c, s, dark} = useTheme();
  const {width, height: winHeight} = useWindowDimensions();
  const isDesktop = width >= 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const inputHeight = isDesktop ? 48 : 52;
  const radius = isDesktop ? 8 : 12;

  const desktopPhoto = heroImage === undefined ? PHOTOS[mode].desktop : heroImage;
  const mobilePhoto = heroImage === undefined ? PHOTOS[mode].mobile : heroImage;

  const handleLogin = () => {
    const trimmed = email.trim();
    const eErr = !trimmed
      ? 'Enter your email address'
      : !EMAIL_RE.test(trimmed)
      ? 'Invalid company email format'
      : '';
    const pErr = password ? '' : 'Enter your password';
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      return;
    }
    onLogin(trimmed, password, remember);
  };

  const hasSso = !!(onGoogleSignIn || onMicrosoftSignIn);

  const form = (
    <>
      <Text
        style={[
          s.title,
          isDesktop ? s.titleWeb : s.titleMobile,
          !isDesktop && {textAlign: 'center'},
        ]}>
        Welcome Back
      </Text>
      <Text style={[s.subtitle, !isDesktop && {textAlign: 'center', marginBottom: 20}]}>
        {isDesktop ? 'Sign in to your Ex-Survey account' : 'Sign in to your account'}
      </Text>

      <Field
        label="Email Address"
        icon="mail"
        value={email}
        onChangeText={t => {
          setEmail(t);
          setEmailError('');
        }}
        placeholder="you@company.com"
        error={emailError}
        height={inputHeight}
        radius={radius}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />
      <Field
        label="Password"
        icon="lock"
        value={password}
        onChangeText={t => {
          setPassword(t);
          setPasswordError('');
        }}
        placeholder="Enter your password"
        error={passwordError}
        height={inputHeight}
        radius={radius}
        secure
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      {showRememberMe || onForgotPassword ? (
        <View style={s.optionsRow}>
          {showRememberMe ? (
            <Pressable
              onPress={() => setRemember(r => !r)}
              accessibilityRole="checkbox"
              accessibilityState={{checked: remember}}
              style={s.checkRow}>
              <View style={[s.checkbox, remember && s.checkboxOn]}>
                {remember ? <Text style={s.checkMark}>✓</Text> : null}
              </View>
              <Text style={[s.meta, {color: c.label}]}>Remember me</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {onForgotPassword ? (
            <Text onPress={onForgotPassword} accessibilityRole="link" style={s.link}>
              Forgot password?
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{height: 4}} />
      )}

      <SignInButton
        onPress={handleLogin}
        loading={loading}
        height={inputHeight}
        radius={radius}
      />

      {hasSso && isDesktop ? (
        <>
          <Divider label="Or continue with" />
          <View style={s.ssoRow}>
            {onGoogleSignIn ? (
              <SsoButton label="Google" mark={<GoogleMark />} onPress={onGoogleSignIn} />
            ) : null}
            {onMicrosoftSignIn ? (
              <SsoButton label="Microsoft" mark={<MicrosoftMark />} onPress={onMicrosoftSignIn} />
            ) : null}
          </View>
        </>
      ) : null}

      {onBiometricSignIn && !isDesktop ? (
        <>
          <Divider label="or" />
          <Pressable
            onPress={onBiometricSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Face ID"
            style={s.bio}>
            <FaceIdIcon color={dark ? c.primary : c.text} />
            <Text style={s.bioText}>Sign in with Face ID</Text>
          </Pressable>
        </>
      ) : null}

      <View style={s.footerRow}>
        <Text style={s.meta}>Don't have an account? </Text>
        <Text onPress={onGoToSignup} accessibilityRole="link" style={[s.meta, s.link]}>
          Request access
        </Text>
      </View>
      {onOfflineLogin ? <Pressable accessibilityRole="button" onPress={() => onOfflineLogin(email.trim(),password)} style={{alignSelf:'center',paddingVertical:12}}><Text style={[s.meta,s.link]}>Open downloaded offline inspections</Text><Text style={[s.meta,{textAlign:'center',fontSize:11}]}>Enter the email and password from your last online sign-in</Text></Pressable> : null}
    </>
  );

  /* ---------------- desktop: split screen ---------------- */
  if (isDesktop) {
    const heroInner = (
      <>
        <View style={s.heroContent}>
          <Brand size={46} nameSize={30} />
          <Text style={s.heroTitle}>Inspection Intelligence for a Safer Tomorrow</Text>
          <Text style={s.heroBody}>
            Streamline inspections, ensure compliance, and keep your people and
            assets safe.
          </Text>
          <View style={s.pillRow}>
            {PILLS.map(({label, Icon}, i) => (
              <View key={label} style={[s.pill, i > 0 && s.pillDivider]}>
                <Icon color={c.text} />
                <Text style={s.pillText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.heroFooter, desktopPhoto ? s.heroFooterPhoto : null]}>
          <Text style={s.heroFooterText}>PEOPLE  |  PLANTS  |  A SAFER TOMORROW</Text>
        </View>
      </>
    );

    return (
      <KeyboardAvoidingView style={[s.screen, {minHeight: winHeight}]}>
        <ScrollView
          contentContainerStyle={{flexGrow: 1, minHeight: winHeight}}
          keyboardShouldPersistTaps="handled">
          <View style={s.split}>
            <View style={[s.hero, !desktopPhoto && s.heroSky]}>
              {desktopPhoto ? (
                dark ? (
                  <HeroPhoto source={desktopPhoto} fill dim={0.3} scrim />
                ) : (
                  <HeroPhoto source={desktopPhoto} fadeHeight={90} />
                )
              ) : dark ? null : (
                <RefineryScene variant="desktop" groundHeight={56} />
              )}
              {heroInner}
            </View>
            <View style={s.formPane}>
              <AnimatedCard style={s.cardDesktop}>{form}</AnimatedCard>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ---------------- mobile: hero + bottom sheet ---------------- */
  return (
    <KeyboardAvoidingView
      style={[s.screen, {minHeight: winHeight}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{flexGrow: 1}} keyboardShouldPersistTaps="handled">
        <View style={[s.mobileHero, !mobilePhoto && s.heroSky]}>
          {mobilePhoto ? (
            <HeroPhoto
              source={mobilePhoto}
              fadeHeight={56}
              height={210}
              dim={dark ? 0.25 : 0}
            />
          ) : dark ? null : (
            <RefineryScene variant="mobile" />
          )}
          <View style={s.mobileHeroContent}>
            <Brand size={34} nameSize={24} />
            <Text style={s.slogan}>Same commitment.{'\n'}On the go.</Text>
          </View>
        </View>
        <AnimatedCard style={s.sheet}>{form}</AnimatedCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
