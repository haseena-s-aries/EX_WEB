import React, {useRef} from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Platform,
} from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}>
      <Animated.View
        style={[
          styles.button,
          style,
          {transform: [{scale}]},
          (disabled || loading) && styles.buttonDisabled,
        ]}>
        {loading ? (
          <ActivityIndicator color="#242d52" />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#b8a5f8',
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {
    color: '#242d52',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
