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
      <View style={styles.copy}>
        <Text style={[styles.value, {color}]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 135,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: '#e5e9f6',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 5px 18px rgba(19, 42, 36, 0.06)',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#242d52',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.045,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  icon: {fontSize: 18},
  copy: {flex: 1},
  value: {fontSize: 24, fontWeight: '800'},
  label: {fontSize: 11.5, color: '#7a7f93', marginTop: 2, fontWeight: '600'},
});
