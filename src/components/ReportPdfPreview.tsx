import React, {useState} from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import Pdf from 'react-native-pdf';
import {GeneratedReport} from '../reports/types';

export default function ReportPdfPreview({report, onClose}: {report: GeneratedReport; onClose: () => void}) {
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [scale, setScale] = useState(1); const [error, setError] = useState('');
  const button = (title: string, press: () => void) => <TouchableOpacity onPress={press} style={{padding: 10, borderRadius: 8, backgroundColor: '#eceeff'}}><Text>{title}</Text></TouchableOpacity>;
  return <Modal visible onRequestClose={onClose}><View style={{flex: 1, padding: 12, backgroundColor: '#f8f9fc'}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{button('Close', onClose)}{button('−', () => setScale(s => Math.max(.5, s / 1.25)))}{button('+', () => setScale(s => Math.min(8, s * 1.25)))}{button('Previous', () => setPage(p => Math.max(1, p - 1)))}{button('Next', () => setPage(p => Math.min(pages, p + 1)))}<Text>{page} / {pages}</Text></View>
    {!!error && <Text style={{color: '#bf3441'}}>{error}</Text>}
    <Pdf source={{uri: `file://${report.uri}`}} page={page} scale={scale} minScale={.5} maxScale={8} fitPolicy={2} style={{flex: 1}} onLoadComplete={setPages} onPageChanged={setPage} onError={() => setError('Could not display this report.')} />
  </View></Modal>;
}
