import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import apiClient, {getApiResourceUrl, getAuthToken} from '../api/client';
import {isPdfFile} from '../utils/isPdfFile';

type Props = {
  path?: string | null;
  fileName?: string | null;
  localUri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: (event: any) => void;
  placeholderText?: string;
};

export default function AuthenticatedImage({
  path,
  fileName,
  localUri,
  style,
  resizeMode = 'cover',
  onLoad,
  placeholderText = 'No image',
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [pdfResponse, setPdfResponse] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const pdfFile = isPdfFile(fileName || path || localUri);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    setPdfResponse(false);
    setShowPdf(false);
    if (localUri || pdfFile) {
      setUri(localUri || null);
      setLoading(false);
      return;
    }

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
        if (!active) return;
        if (response.data.type === 'application/pdf') {
          setPdfResponse(true);
          return;
        }
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
  }, [path, localUri, pdfFile]);

  const pdfPath = localUri || path;
  if ((pdfFile || pdfResponse) && pdfPath) {
    const Viewer = showPdf ? require('./HazardousAreaPlanViewer').default : null;
    return <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={fileName ? `Open PDF ${fileName}` : 'Open PDF'}
        onPress={event => {event.stopPropagation?.(); setShowPdf(true);}} style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>Open PDF</Text>
      </TouchableOpacity>
      {Viewer && <Viewer title={fileName || 'PDF attachment'} path={pdfPath} local={!!localUri}
        contentType="application/pdf" onClose={() => setShowPdf(false)} />}
    </>;
  }

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color="#8fa7f8" />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <Image
      resizeMode={resizeMode}
      source={{
        uri,
        ...(localUri || Platform.OS === 'web' || !getAuthToken()
          ? {}
          : {headers: {Authorization: `Bearer ${getAuthToken()}`}}),
      }}
      onLoad={onLoad}
      onError={() => setUri(null)}
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
