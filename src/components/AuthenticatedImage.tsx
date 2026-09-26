import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import apiClient, {getApiResourceUrl, getAuthToken} from '../api/client';

type Props = {
  path?: string | null;
  style?: StyleProp<ImageStyle>;
};

export default function AuthenticatedImage({path, style}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;

    if (!path) {
      setUri(null);
      setLoading(false);
      return () => undefined;
    }

    setLoading(true);
    if (Platform.OS !== 'web') {
      setUri(getApiResourceUrl(path));
      setLoading(false);
      return () => undefined;
    }

    apiClient
      .get(getApiResourceUrl(path), {responseType: 'blob'})
      .then(response => {
        const browserUrl = (globalThis as any).URL;
        objectUrl = browserUrl.createObjectURL(response.data);
        if (active) {
          setUri(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setUri(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        (globalThis as any).URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color="#3f47d6" />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }

  return (
    <Image
      resizeMode="cover"
      source={{
        uri,
        ...(Platform.OS === 'web' || !getAuthToken()
          ? {}
          : {headers: {Authorization: `Bearer ${getAuthToken()}`}}),
      }}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#eef0f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {color: '#85899a', fontSize: 12, fontWeight: '600'},
});
