import React, {useState} from 'react';
import {ActivityIndicator, Modal, Text, TouchableOpacity, View} from 'react-native';
import Pdf from 'react-native-pdf';
import {ReportPdfPreviewProps} from '../reports/types';

export default function ReportPdfPreview({report, projectName, busy, error, onClose, onDownload, onGenerate}: ReportPdfPreviewProps) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [renderError, setRenderError] = useState('');
  const button = (title: string, press: () => void, disabled = false) =>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={press}
      style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0a3148', opacity: disabled ? .55 : 1}}>
      <Text style={{color: '#e4f2fa', fontWeight: '700'}}>{title}</Text>
    </TouchableOpacity>;
  return <Modal visible onRequestClose={() => {if (!busy) onClose();}}>
    <View style={{flex: 1, padding: 12, gap: 8, backgroundColor: '#03192c'}}>
      <Text accessibilityRole="header" style={{color: '#f5faff', fontSize: 18, fontWeight: '800'}}>
        {projectName ? `${projectName} · Inspection Report` : 'Inspection Report'}
      </Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8}}>
        {button('Back to Reports', onClose, busy)}
        {onDownload && button('Download PDF', onDownload, busy)}
        {onGenerate && button('Generate PDF', onGenerate, busy)}
        {button('Zoom out', () => setScale(s => Math.max(.5, s / 1.25)))}
        {button('Zoom in', () => setScale(s => Math.min(8, s * 1.25)))}
        {button('Previous', () => setPage(p => Math.max(1, p - 1)), page <= 1)}
        {button('Next', () => setPage(p => Math.min(pages, p + 1)), page >= pages)}
        <Text style={{color: '#e4f2fa'}}>{page} / {pages}</Text>
      </View>
      {busy && <ActivityIndicator color="#00d9ee" />}
      {!!(error || renderError) && <Text accessibilityRole="alert" style={{color: '#ff9bab'}}>{error || renderError}</Text>}
      {!renderError && <Pdf source={{uri: `file://${report.uri}`}} page={page} scale={scale} minScale={.5} maxScale={8}
        fitPolicy={2} style={{flex: 1, backgroundColor: '#03192c'}} onLoadComplete={setPages}
        onPageChanged={setPage} onError={() => setRenderError('Could not display this PDF.')} />}
    </View>
  </Modal>;
}