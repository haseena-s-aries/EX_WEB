import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { getApiResourceUrl, getAuthToken } from '../api/client';
import { PlanViewerProps } from './hazardousAreaPlan';

export default function HazardousAreaPlanViewer({
  title,
  path,
  local,
  fileName,
  contentType,
  onClose,
  onDownload,
}: PlanViewerProps) {
  const { width, height } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const pdf =
    contentType === 'application/pdf' ||
    fileName?.toLowerCase().endsWith('.pdf');
  const source = {
    uri: local ? path : getApiResourceUrl(path),
    headers: local ? undefined : { Authorization: `Bearer ${getAuthToken()}` },
    cache: false,
  };
  const fit = size.width
    ? Math.min(1, (width - 24) / size.width, (height - 160) / size.height)
    : 1;
  const button = (label: string, action: () => void) => (
    <TouchableOpacity
      onPress={action}
      style={{ padding: 10, backgroundColor: '#f0eeff', borderRadius: 8 }}
    >
      <Text>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible onRequestClose={onClose}>
      <View
        style={{ flex: 1, backgroundColor: '#f8f9fc', padding: 12, gap: 10 }}
      >
        <Text style={{ fontWeight: '700' }}>
          {title || 'Hazardous Area Plan'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {button('Close', onClose)}
          {onDownload && button('Download', onDownload)}
          {button('−', () => setZoom(v => Math.max(0.5, v / 1.25)))}
          {button('+', () => setZoom(v => Math.min(8, v * 1.25)))}
          {button('Fit', () => setZoom(1))}
          {pdf && (
            <>
              {button('Previous page', () => setPage(v => Math.max(1, v - 1)))}
              <Text>
                {page} / {pages}
              </Text>
              {button('Next page', () => setPage(v => Math.min(pages, v + 1)))}
            </>
          )}
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: '#ba4e3c' }}>
            {error}
          </Text>
        )}
        {pdf ? (
          <Pdf
            source={source}
            trustAllCerts={false}
            page={page}
            scale={zoom}
            minScale={0.5}
            maxScale={8}
            fitPolicy={2}
            style={{ flex: 1 }}
            onLoadComplete={count => setPages(count)}
            onPageChanged={setPage}
            onError={() => setError('Could not load the PDF.')}
          />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            maximumZoomScale={8}
            minimumZoomScale={1}
            centerContent
          >
            <ScrollView
              horizontal
              contentContainerStyle={{
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: width - 24,
              }}
            >
              <Image
                source={{ uri: source.uri, headers: source.headers }}
                resizeMode="contain"
                onLoad={e =>
                  setSize({
                    width: e.nativeEvent.source.width,
                    height: e.nativeEvent.source.height,
                  })
                }
                onError={() => setError('Could not load the image.')}
                style={{
                  width: size.width ? size.width * fit * zoom : width - 24,
                  height: size.height ? size.height * fit * zoom : height - 160,
                }}
              />
            </ScrollView>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
