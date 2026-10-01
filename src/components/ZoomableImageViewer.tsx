import React, {useEffect, useRef, useState} from 'react';
import {Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AuthenticatedImage from './AuthenticatedImage';

export type ViewerPin = {
  id: string;
  label: string; // number shown inside the pin
  xPercent: number;
  yPercent: number;
  title?: string; // shown in the popup when the pin is pressed
  lines?: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  images: string[]; // API paths, loaded through AuthenticatedImage
  startIndex?: number;
  title?: string;
  subtitle?: string;
  pins?: ViewerPin[]; // optional equipment markers drawn on the image
};

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.25;
const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

export default function ZoomableImageViewer({visible, onClose, images, startIndex = 0, title, subtitle, pins = []}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [viewport, setViewport] = useState({width: 0, height: 0});
  const [selectedPinId, setSelectedPinId] = useState('');
  const viewportRef = useRef<any>(null);

  // Reset whenever the viewer is opened or the picture changes.
  useEffect(() => {
    if (visible) { setIndex(startIndex); setScale(1); setSelectedPinId(''); }
  }, [visible, startIndex]);
  useEffect(() => { setScale(1); setSelectedPinId(''); }, [index]);

  // Mouse-wheel zoom on web.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return undefined;
    const node = viewportRef.current as any;
    if (!node?.addEventListener) return undefined;
    const onWheel = (event: any) => {
      event.preventDefault();
      setScale(current => clamp(event.deltaY < 0 ? current * 1.15 : current / 1.15));
    };
    node.addEventListener('wheel', onWheel, {passive: false});
    return () => node.removeEventListener('wheel', onWheel);
  }, [visible, viewport.width]);

  if (!visible) return null;

  const path = images[index];
  // Fit the whole image inside the viewport at 100%, then multiply by the zoom scale.
  const availableW = Math.max(viewport.width - 24, 100);
  const availableH = Math.max(viewport.height - 24, 100);
  const fitW = Math.min(availableW, availableH * aspectRatio);
  const fitH = fitW / aspectRatio;
  const canvasW = fitW * scale;
  const canvasH = fitH * scale;
  const selectedPin = pins.find(pin => pin.id === selectedPinId);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.header}>
        <View style={{flex: 1, minWidth: 0}}>
          {!!title && <Text numberOfLines={1} style={styles.title}>{title}</Text>}
          {!!subtitle && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}{images.length > 1 ? `  ·  ${index + 1} / ${images.length}` : ''}</Text>}
        </View>
        <View style={styles.controls}>
          <TouchableOpacity accessibilityLabel="Zoom out" disabled={scale <= MIN_SCALE} onPress={() => setScale(current => clamp(current / STEP))} style={[styles.ctrl, scale <= MIN_SCALE && styles.ctrlDisabled]}><Text style={styles.ctrlText}>−</Text></TouchableOpacity>
          <Text style={styles.percent}>{Math.round(scale * 100)}%</Text>
          <TouchableOpacity accessibilityLabel="Zoom in" disabled={scale >= MAX_SCALE} onPress={() => setScale(current => clamp(current * STEP))} style={[styles.ctrl, scale >= MAX_SCALE && styles.ctrlDisabled]}><Text style={styles.ctrlText}>+</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Reset zoom" onPress={() => setScale(1)} style={styles.ctrlWide}><Text style={styles.ctrlText}>Reset</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
        </View>
      </View>

      <View ref={viewportRef} style={styles.viewport} onLayout={event => setViewport({width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height})}>
        {viewport.width > 0 && <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={{minWidth: viewport.width, justifyContent: 'center'}}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{minHeight: viewport.height, justifyContent: 'center', alignItems: 'center'}}>
            <View style={{width: canvasW, height: canvasH, margin: 12}}>
              <AuthenticatedImage
                path={path}
                resizeMode="stretch"
                onLoad={event => {
                  const source = event?.nativeEvent?.source;
                  if (source?.width > 0 && source?.height > 0) setAspectRatio(source.width / source.height);
                }}
                style={styles.image}
              />
              {pins.map(pin => <TouchableOpacity
                key={pin.id}
                accessibilityLabel={`Equipment ${pin.label}`}
                onPress={() => setSelectedPinId(current => (current === pin.id ? '' : pin.id))}
                style={[styles.pin, selectedPinId === pin.id && styles.pinSelected, {left: `${Math.max(0, Math.min(100, Number(pin.xPercent) || 0))}%` as any, top: `${Math.max(0, Math.min(100, Number(pin.yPercent) || 0))}%` as any}]}>
                <Text style={styles.pinText}>{pin.label}</Text>
              </TouchableOpacity>)}
            </View>
          </ScrollView>
        </ScrollView>}

        {images.length > 1 && <>
          <TouchableOpacity accessibilityLabel="Previous image" onPress={() => setIndex(current => (current - 1 + images.length) % images.length)} style={[styles.nav, {left: 10}]}><Text style={styles.navText}>‹</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Next image" onPress={() => setIndex(current => (current + 1) % images.length)} style={[styles.nav, {right: 10}]}><Text style={styles.navText}>›</Text></TouchableOpacity>
        </>}

        {!!selectedPin && <View style={styles.popup}>
          <View style={styles.popupHead}>
            <Text style={styles.popupTitle}>{selectedPin.title || `Equipment ${selectedPin.label}`}</Text>
            <TouchableOpacity accessibilityLabel="Close equipment details" onPress={() => setSelectedPinId('')} style={styles.popupClose}><Text style={styles.popupCloseText}>×</Text></TouchableOpacity>
          </View>
          {(selectedPin.lines || []).filter(Boolean).map((line, i) => <Text key={i} style={styles.popupLine}>{line}</Text>)}
        </View>}
      </View>
      <Text style={styles.hint}>{Platform.OS === 'web' ? 'Scroll wheel or +/− to zoom · drag the scrollbars to pan' : 'Use +/− to zoom · swipe to pan'}</Text>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(14, 18, 36, 0.92)', padding: 14},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10},
  title: {fontSize: 16, color: '#fff', fontWeight: '800'},
  subtitle: {fontSize: 11, color: '#c9d1f0', marginTop: 2},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 6},
  ctrl: {width: 34, height: 34, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  ctrlWide: {height: 34, paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  ctrlDisabled: {opacity: 0.45},
  ctrlText: {fontSize: 15, color: '#242d52', fontWeight: '800'},
  percent: {minWidth: 46, textAlign: 'center', fontSize: 11, color: '#fff', fontWeight: '800'},
  close: {height: 34, paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#4b42ce', alignItems: 'center', justifyContent: 'center', marginLeft: 6},
  closeText: {fontSize: 12, color: '#fff', fontWeight: '800'},
  viewport: {flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1b2142'},
  image: {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'},
  pin: {position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, borderWidth: 2, borderColor: '#fff', backgroundColor: '#4b42ce', alignItems: 'center', justifyContent: 'center', zIndex: 2},
  pinSelected: {width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17, backgroundColor: '#ed8c35'},
  pinText: {fontSize: 11, color: '#fff', fontWeight: '800'},
  nav: {position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 5},
  navText: {fontSize: 26, color: '#242d52', fontWeight: '800', marginTop: -3},
  popup: {position: 'absolute', left: 14, bottom: 14, maxWidth: 320, padding: 12, borderRadius: 10, backgroundColor: '#fff', zIndex: 6, gap: 3},
  popupHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  popupTitle: {flex: 1, fontSize: 13, color: '#242d52', fontWeight: '800'},
  popupClose: {width: 24, height: 24, borderRadius: 12, backgroundColor: '#eef0f6', alignItems: 'center', justifyContent: 'center'},
  popupCloseText: {fontSize: 15, color: '#424865', fontWeight: '800', marginTop: -2},
  popupLine: {fontSize: 11, color: '#5a6078'},
  hint: {fontSize: 10, color: '#aab3d6', textAlign: 'center', paddingTop: 8},
});
