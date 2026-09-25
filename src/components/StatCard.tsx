import React, {useEffect, useRef} from 'react';
import {Animated, Text, View, StyleSheet, Platform} from 'react-native';

type Props = {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
  delay: number;
};

export default function StatCard({label, value, icon, color, bg, delay}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: Platform.OS !== 'web',
        speed: 14,
        bounciness: 6,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View
      style={[styles.card, {opacity, transform: [{translateY}]}]}>
      <View style={[styles.iconWrap, {backgroundColor: bg}]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, {color}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.accentBar, {backgroundColor: color}]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 155,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 18px rgba(26, 35, 126, 0.06)',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#1a237e',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {fontSize: 18},
  value: {fontSize: 28, fontWeight: '800'},
  label: {fontSize: 12.5, color: '#8a8fa3', marginTop: 3, fontWeight: '600'},
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
});