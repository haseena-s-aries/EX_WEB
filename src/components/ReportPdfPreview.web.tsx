import React from 'react';
import {Modal} from 'react-native';
import {GeneratedReport} from '../reports/types';

export default function ReportPdfPreview({report, onClose}: {report: GeneratedReport; onClose: () => void}) {
  const h = React.createElement;
  return <Modal visible onRequestClose={onClose}>{h('div', {style: {height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: '#111827'}},
    h('div', {style: {padding: 12, backgroundColor: '#f8f9fc', display: 'flex', gap: 16, alignItems: 'center'}},
      h('button', {onClick: onClose, style: {padding: '8px 16px'}}, 'Close'), h('strong', {}, 'Explosion Proof Survey Report'),
      h('a', {href: report.uri, download: report.fileName}, 'Download PDF')),
    h('iframe', {src: report.uri, title: 'Project report PDF preview', style: {flex: 1, width: '100%', border: 0}}))}</Modal>;
}
