import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

const MARINE_ART = require('../assets/landing/industry-1.jpg');

export default function ProjectFormBannerArt() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={MARINE_ART} resizeMode="cover" accessible={false} style={styles.photo} />
      <View nativeID="ex-project-form-banner-shade" style={[StyleSheet.absoluteFill, styles.shade]} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {position: 'absolute', right: 0, width: '60%', height: '100%'},
  shade: {backgroundColor: '#03192C66'},
});
