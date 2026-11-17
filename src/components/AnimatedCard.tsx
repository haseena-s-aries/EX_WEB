import React, {useEffect, useRef} from 'react';
import {AccessibilityInfo, Animated, StyleSheet, ViewStyle, Platform} from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function AnimatedCard({children, style}: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const start = (reduceMotion: boolean) => {
      if (!active || reduceMotion) return;
      opacity.setValue(.72);
      translateY.setValue(6);
      animation = Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: 240, useNativeDriver: Platform.OS !== 'web'}),
        Animated.timing(translateY, {toValue: 0, duration: 240, useNativeDriver: Platform.OS !== 'web'}),
      ]);
      animation.start();
    };
    if (Platform.OS === 'web') start(typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    else void AccessibilityInfo.isReduceMotionEnabled?.().then(start).catch(() => {});
    return () => {active = false; animation?.stop();};
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[styles.card, style, {opacity, transform: [{translateY}]}]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 32,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 28px 80px rgba(0, 0, 0, 0.28)',
      },
      default: {
        shadowColor: '#242d52',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.28,
        shadowRadius: 32,
      },
    }),
  },
});
