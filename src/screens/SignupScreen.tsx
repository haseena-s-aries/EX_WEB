import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import AnimatedCard from '../components/AnimatedCard';
import ThemeToggle from '../components/ThemeToggle';
import {
  AriesLogo,
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  ShieldIcon,
  BarsIcon,
  PeopleIcon,
} from '../components/LoginArt';
import {useThemeMode, ThemeMode} from '../theme/useThemeMode';

type Props = {
  onRegister: (data: {
    name: string;
    email: string;
    role: string;
    password: string;
  }) => void;
  onGoToLogin: () => void;
  loading?: boolean;
  /** Starting theme; a choice saved from the login screen's toggle wins. */
  theme?: ThemeMode | 'system';
  /** Overrides the bundled hero photo. Pass null for no photo. */
  heroImage?: ImageSourcePropType | null;
};

// Keep in sync with components/RoleSelector.tsx (Surveyor is the default role).
const ROLES = ['Admin', 'Surveyor', 'QC', 'Manager', 'Client'];
const MIN_PASSWORD_LENGTH = 6;

const LIGHT_PHOTO: ImageSourcePropType = require('../assets/refinery_towers_sharp.png');
const DARK_PHOTO: ImageSourcePropType = require('../assets/refinery_dark_theme_hero.png');

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const DARK = {
  canvas: '#0A0D12',
  card: '#12161D',
  input: '#161C26',
  inputFocusBg: '#161C26',
  inputBorder: '#232B36',
  chip: '#1A202A',
  chipActive: '#221C16',
  chipBorder: '#232B36',
  chipTextActive: '#F59E0B',
  border: '#232B36',
  amber: '#F59E0B',
  amberHover: '#D97706',
  link: '#F59E0B',
  eyebrow: '#F59E0B',
  heroAccent: '#F59E0B',
  text: '#F8FAFC',
  secondary: '#94A3B8',
  muted: '#64748B',
  placeholder: '#7B8798',
  icon: '#94A3B8',
  onAccent: '#0A0D12',
  error: '#EF4444',
  headerBg: 'rgba(10,13,18,0.85)',
  heroRgb: '10,13,18',
  skyline: '#232B36',
  cardShadow: '0 24px 48px -12px rgba(0,0,0,0.7)',
  ctaShadow: 'none',
  focusGlow: 'rgba(245,158,11,0.22)',
  elevation: 12,
};

const LIGHT: typeof DARK = {
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  input: '#F8FAFC',
  inputFocusBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  chip: '#FFFFFF',
  chipActive: '#FEF3C7',
  chipBorder: '#CBD5E1',
  chipTextActive: '#B45309',
  border: '#E2E8F0',
  amber: '#F59E0B',
  amberHover: '#D97706',
  link: '#B45309', // spec's #D97706 is only ~3:1 on white
  eyebrow: '#B45309',
  heroAccent: '#D97706',
  text: '#0F172A',
  secondary: '#475569',
  muted: '#64748B',
  placeholder: '#64748B',
  icon: '#94A3B8',
  onAccent: '#0F172A',
  error: '#DC2626',
  headerBg: '#FFFFFF',
  heroRgb: '248,250,252',
  skyline: '#CBD5E1',
  cardShadow: '0 12px 32px -4px rgba(15,23,42,0.08)',
  ctaShadow: '0 4px 8px rgba(245,158,11,0.25)',
  focusGlow: 'rgba(245,158,11,0.20)',
  elevation: 4,
};

type Colors = typeof DARK;

const web = (style: object) => Platform.select({web: style, default: {}}) as object;
const FONT = web({
  fontFamily:
    "Inter, 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif",
});

/** Translucent strips = gradient that works on every platform. */
function Scrim({
  rgb,
  from,
  to,
  style,
}: {
  rgb: string;
  from: number;
  to: number;
  style?: object;
}) {
  const steps = 16;
  return (
    <View pointerEvents="none" style={[{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}, style]}>
      {Array.from({length: steps}).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(${rgb},${(from + ((to - from) * i) / (steps - 1)).toFixed(2)})`,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Width / height of an image source. `Image.resolveAssetSource` only exists on
 * native; react-native-web has no such method (the bundler hands back a URL
 * string or a {uri, width, height} object), so fall back to those / getSize.
 */
function useImageAspect(source: ImageSourcePropType, fallback = 0.8): number {
  const sync = useMemo(() => {
    const resolve = (Image as any).resolveAssetSource;
    let asset: any = typeof resolve === 'function' ? resolve(source) : source;
    if (asset && typeof asset === 'object' && asset.default) {
      asset = asset.default; // ESM-style asset module
    }
    if (asset && typeof asset === 'object' && asset.width && asset.height) {
      return asset.width / asset.height;
    }
    return 0;
  }, [source]);

  const [measured, setMeasured] = useState(0);
  React.useEffect(() => {
    if (sync) {
      return;
    }
    let alive = true;
    const resolve = (Image as any).resolveAssetSource;
    const asset: any = typeof resolve === 'function' ? resolve(source) : source;
    const uri: string | undefined =
      typeof asset === 'string' ? asset : asset?.uri ?? asset?.default;
    if (uri && typeof Image.getSize === 'function') {
      Image.getSize(
        uri,
        (w, h) => alive && h && setMeasured(w / h),
        () => {},
      );
    }
    return () => {
      alive = false;
    };
  }, [source, sync]);

  return sync || measured || fallback;
}

/** Mobile header photo: cropped to the towers, washed for text, fading into the page. */
function MobileHeroPhoto({
  source,
  isDark,
  width,
  height,
  c,
}: {
  source: ImageSourcePropType;
  isDark: boolean;
  width: number;
  height: number;
  c: Colors;
}) {
  const aspect = useImageAspect(source);
  const imgH = Math.max(width / aspect, height);
  // slide the picture up so the towers (not empty sky / ground) fill the strip
  const top = -Math.min((isDark ? 0.2 : 0.1) * imgH, imgH - height);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={source}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{position: 'absolute', left: 0, top, width, height: imgH}}
      />
      <View
        style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(${c.heroRgb},${isDark ? 0.4 : 0.35})`}]}
      />
      <Scrim rgb={c.heroRgb} from={0} to={1} style={{top: '55%'}} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Brand({size, c, s, hex = 30}: {size: number; c: Colors; s: Styles; hex?: number}) {
  return (
    <View style={s.brandRow}>
      <AriesLogo size={hex} />
      <Text style={[s.brandName, {fontSize: size}]}>
        <Text style={{color: c.amber}}>Ex-</Text>Survey
      </Text>
    </View>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  secure,
  height,
  keyboardType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  c,
  s,
}: {
  icon: 'user' | 'mail' | 'lock';
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  secure?: boolean;
  height: number;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'name' | 'email' | 'new-password';
  returnKeyType?: 'next' | 'go';
  onSubmitEditing?: () => void;
  c: Colors;
  s: Styles;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? c.error : focused ? c.amber : c.inputBorder;
  const borderWidth = focused || error ? 2 : 1;
  return (
    <View>
      <View
        style={[
          s.inputBox,
          {
            height,
            borderColor,
            borderWidth,
            paddingLeft: 15 - borderWidth,
            paddingRight: 13 - borderWidth,
            backgroundColor: focused ? c.inputFocusBg : c.input,
          },
          focused && !error ? web({boxShadow: `0 0 0 3px ${c.focusGlow}`}) : null,
        ]}>
        {icon === 'user' ? (
          <UserIcon color={c.icon} />
        ) : icon === 'mail' ? (
          <MailIcon color={c.icon} />
        ) : (
          <LockIcon color={c.icon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          accessibilityLabel={placeholder}
          secureTextEntry={secure && hidden}
          autoCapitalize={icon === 'user' ? 'words' : 'none'}
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
            <EyeIcon off={hidden} color={c.icon} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

const VALUES = [
  {label: 'Ensure\nCompliance', Icon: ShieldIcon},
  {label: 'Drive\nEfficiency', Icon: BarsIcon},
  {label: 'Build A\nSafer Tomorrow', Icon: PeopleIcon},
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function SignupScreen(props: Props) {
  const mode = useThemeMode(props.theme);
  return <SignupThemed {...props} mode={mode} />;
}

function SignupThemed({
  mode,
  onRegister,
  onGoToLogin,
  loading,
  heroImage,
}: Props & {mode: ThemeMode}) {
  const isDark = mode === 'dark';
  const c = isDark ? DARK : LIGHT;
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);

  const {width, height: winHeight} = useWindowDimensions();
  const isMobile = width < 768;
  const isSplit = width >= 1024;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Surveyor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clear = (key: string) => setErrors(e => (e[key] ? {...e, [key]: ''} : e));

  const handleRegister = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter your full name';
    if (!email.trim()) next.email = 'Enter your email';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Please enter a valid email';
    if (!password) next.password = 'Enter a password';
    else if (password.length < MIN_PASSWORD_LENGTH)
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (!confirmPassword) next.confirm = 'Re-enter your password';
    else if (password && password !== confirmPassword) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) {
      return;
    }
    onRegister({name: name.trim(), email: email.trim(), role, password});
  };

  const fieldH = isMobile ? 50 : 48;
  const ctaH = isMobile ? 52 : 48;

  // 5 chips fit one row when each gets >= 60px, otherwise 3 + 2
  const formInner = isMobile ? width - 48 - (isDark ? 0 : 40) : 388;
  const oneRow = (formInner - 4 * 8) / ROLES.length >= 60;

  const formBody = (
    <>
      <View style={s.fields}>
        <Field
          icon="user"
          placeholder="Full Name"
          value={name}
          onChangeText={t => {
            setName(t);
            clear('name');
          }}
          error={errors.name}
          height={fieldH}
          autoComplete="name"
          returnKeyType="next"
          c={c}
          s={s}
        />
        <Field
          icon="mail"
          placeholder="Email"
          value={email}
          onChangeText={t => {
            setEmail(t);
            clear('email');
          }}
          error={errors.email}
          height={fieldH}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          c={c}
          s={s}
        />

        <Text style={s.roleLabel}>Role</Text>
        <View style={s.roleRow} accessibilityRole="radiogroup">
          {ROLES.map(item => {
            const active = role === item;
            return (
              <Pressable
                key={item}
                onPress={() => setRole(item)}
                accessibilityRole="radio"
                accessibilityState={{selected: active}}
                style={[
                  s.chip,
                  oneRow ? {flex: 1} : {flexBasis: '30%', flexGrow: 1},
                  active && s.chipActive,
                ]}>
                <Text style={[s.chipText, FONT, active && s.chipTextActive]} numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          icon="lock"
          placeholder="Password"
          value={password}
          onChangeText={t => {
            setPassword(t);
            clear('password');
          }}
          error={errors.password}
          secure
          height={fieldH}
          autoComplete="new-password"
          returnKeyType="next"
          c={c}
          s={s}
        />
        <Field
          icon="lock"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={t => {
            setConfirmPassword(t);
            clear('confirm');
          }}
          error={errors.confirm}
          secure
          height={fieldH}
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
          c={c}
          s={s}
        />
      </View>

      <Pressable
        onPress={handleRegister}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Create account"
        accessibilityState={{disabled: !!loading, busy: !!loading}}>
        {(state: any) => (
          <View
            style={[
              s.cta,
              {height: ctaH},
              web({boxShadow: c.ctaShadow}),
              !loading && (state.pressed || state.hovered) && {backgroundColor: c.amberHover},
              loading && {opacity: 0.85},
            ]}>
            {loading ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={[s.ctaText, FONT]}>Create Account</Text>
            )}
          </View>
        )}
      </Pressable>

      <View style={s.footerRow}>
        <Text style={[s.footerText, FONT]}>Already have an account? </Text>
        <Text onPress={onGoToLogin} accessibilityRole="link" style={[s.footerLink, FONT]}>
          Sign In
        </Text>
      </View>
    </>
  );

  const photo = heroImage === undefined ? (isDark ? DARK_PHOTO : LIGHT_PHOTO) : heroImage;
  const MOBILE_HERO_H = 280;

  /* ---------------- mobile ---------------- */
  if (isMobile) {
    return (
      <KeyboardAvoidingView
        style={[s.screen, {minHeight: winHeight}]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.mobileScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={[s.mobileHero, {height: MOBILE_HERO_H}]}>
            {photo ? (
              <MobileHeroPhoto
                source={photo}
                isDark={isDark}
                width={Math.min(width, 480)}
                height={MOBILE_HERO_H}
                c={c}
              />
            ) : null}
            <View style={s.mobileHeader}>
              <AriesLogo size={46} />
              <Text style={[s.mobileBrand, FONT]}>
                <Text style={{color: c.amber}}>Ex-</Text>Survey
              </Text>
              <Text style={[s.tracking, FONT]}>INSPECT  |  TRACK  |  BUILD SAFER</Text>
            </View>
          </View>

          <View style={s.mobileBody}>
            <Text style={[s.title, {fontSize: 22, textAlign: 'center'}]}>Create Your Account</Text>
            <Text style={[s.subtitle, {textAlign: 'center', marginBottom: 20}]}>
              Get started with a safer, smarter way to manage inspections.
            </Text>

            {isDark ? (
              <View style={s.mobileForm}>{formBody}</View>
            ) : (
              <AnimatedCard style={s.mobileCard}>{formBody}</AnimatedCard>
            )}
          </View>
        </ScrollView>
        <ThemeToggle />
      </KeyboardAvoidingView>
    );
  }

  /* ---------------- desktop / tablet ---------------- */
  const card = (
    <AnimatedCard style={s.cardDesktop}>
      <View style={s.eyebrowRow}>
        <View style={s.eyebrowDash} />
        <Text style={[s.eyebrow, FONT]}>JOIN EX-SURVEY</Text>
      </View>
      <Text style={[s.title, {fontSize: 28, lineHeight: 36}]}>Create Your Account</Text>
      <Text style={[s.subtitle, {marginBottom: 22}]}>
        Get started with a safer, smarter way to manage inspections.
      </Text>
      {formBody}
    </AnimatedCard>
  );

  return (
    <KeyboardAvoidingView style={[s.screen, {minHeight: winHeight}]}>
      <View style={s.header}>
        <Brand size={20} c={c} s={s} />
        <View style={s.headerRight}>
          <Text style={[s.headerText, FONT]}>Already registered?</Text>
          <Text onPress={onGoToLogin} accessibilityRole="link" style={[s.headerLink, FONT]}>
            Sign In
          </Text>
          <ThemeToggle floating={false} size={34} />
        </View>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled">
        <View style={[s.body, {minHeight: winHeight - 64}]}>
          {isSplit ? (
            <View style={s.hero}>
              {photo ? (
                <>
                  <Image
                    source={photo}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                    style={StyleSheet.absoluteFill}
                  />
                  {isDark ? (
                    <>
                      <View style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(${c.heroRgb},0.25)`}]} />
                      <Scrim rgb={c.heroRgb} from={0} to={0.94} style={{top: '35%'}} />
                    </>
                  ) : (
                    <>
                      <View style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(${c.heroRgb},0.06)`}]} />
                      <Scrim rgb={c.heroRgb} from={0} to={0.95} style={{top: '38%'}} />
                    </>
                  )}
                </>
              ) : null}

              <View style={s.heroContent}>
                <Text style={[s.heroTitle, FONT]}>GREATER{'\n'}INSIGHTS</Text>
                <Text style={[s.heroTitle, {color: c.heroAccent}, FONT]}>SAFER{'\n'}OPERATIONS</Text>
                <View style={s.heroRule} />
                <Text style={[s.heroBody, FONT]}>
                  Digital inspection and survey management for a more compliant, resilient
                  tomorrow.
                </Text>
                <View style={s.valueRow}>
                  {VALUES.map(({label, Icon}) => (
                    <View key={label} style={s.valueItem}>
                      <Icon color={c.amber} />
                      <Text style={[s.valueText, FONT]}>{label.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          <View style={s.formPane}>{card}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.canvas},

    brandRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
    brandName: {...(FONT as object), fontWeight: '800', color: c.text, letterSpacing: 0.3},

    /* desktop */
    header: {
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 40,
      backgroundColor: c.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 2,
      ...web({backdropFilter: 'blur(12px)'}),
    },
    headerRight: {flexDirection: 'row', alignItems: 'center', gap: 12},
    headerText: {fontSize: 14, color: c.secondary},
    headerLink: {fontSize: 14, fontWeight: '700', color: c.link},

    body: {flex: 1, flexDirection: 'row'},
    hero: {width: '46%', overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: c.canvas},
    heroContent: {paddingHorizontal: 56, paddingBottom: 56, paddingTop: 56},
    heroTitle: {
      fontSize: 40,
      lineHeight: 44,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    heroRule: {width: 44, height: 3, backgroundColor: c.amber, marginTop: 20, marginBottom: 16},
    heroBody: {fontSize: 15, lineHeight: 22, color: c.secondary, maxWidth: 380},
    valueRow: {flexDirection: 'row', gap: 28, marginTop: 32},
    valueItem: {gap: 8, alignItems: 'flex-start'},
    valueText: {fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '600', color: c.text},

    formPane: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
    cardDesktop: {
      maxWidth: 460,
      paddingTop: 36,
      paddingBottom: 32,
      paddingHorizontal: 36,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...web({boxShadow: c.cardShadow}),
      elevation: c.elevation,
    },
    eyebrowRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
    eyebrowDash: {width: 18, height: 2, backgroundColor: c.amber},
    eyebrow: {fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: c.eyebrow},

    /* mobile */
    mobileScroll: {
      flexGrow: 1,
      paddingBottom: 28,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    mobileHero: {overflow: 'hidden', backgroundColor: c.canvas, alignItems: 'center'},
    mobileBody: {paddingHorizontal: 24},
    mobileHeader: {alignItems: 'center', paddingTop: Platform.OS === 'web' ? 32 : 60},
    mobileBrand: {fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: 0.4, marginTop: 10},
    tracking: {fontSize: 10, letterSpacing: 1.8, color: c.secondary, marginTop: 4, fontWeight: '500'},
    mobileForm: {width: '100%'},
    mobileCard: {
      maxWidth: '100%',
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...web({boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}),
      elevation: 2,
    },

    /* shared form */
    title: {...(FONT as object), fontWeight: '700', color: c.text},
    subtitle: {...(FONT as object), fontSize: 14, lineHeight: 20, color: c.secondary, marginTop: 6},
    fields: {gap: 14, marginBottom: 22},
    inputBox: {flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12},
    input: {flex: 1, fontSize: 15, color: c.text, paddingVertical: 0, height: '100%'},
    eyeBtn: {width: 24, height: 24, alignItems: 'center', justifyContent: 'center'},
    fieldError: {...(FONT as object), fontSize: 12, lineHeight: 16, color: c.error, marginTop: 6},

    roleLabel: {
      ...(FONT as object),
      fontSize: 13,
      fontWeight: '600',
      color: c.secondary,
      marginBottom: -6,
    },
    roleRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    chip: {
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.chipBorder,
      backgroundColor: c.chip,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    chipActive: {borderWidth: 1.5, borderColor: c.amber, backgroundColor: c.chipActive},
    chipText: {fontSize: 13, fontWeight: '500', color: c.secondary},
    chipTextActive: {color: c.chipTextActive, fontWeight: '700'},

    cta: {
      width: '100%',
      borderRadius: 12,
      backgroundColor: c.amber,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {color: c.onAccent, fontSize: 15, fontWeight: '700', letterSpacing: 0.3},
    footerRow: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16},
    footerText: {fontSize: 14, color: c.secondary},
    footerLink: {fontSize: 14, fontWeight: '700', color: c.link},
  });
}
