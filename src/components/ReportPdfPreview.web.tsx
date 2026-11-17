import React from 'react';
import {Modal} from 'react-native';
import {ReportPdfPreviewProps} from '../reports/types';

export default function ReportPdfPreview({report, projectName, busy, error, onClose, onGenerate}: ReportPdfPreviewProps) {
  const h = React.createElement;
  const control = {
    border: '1px solid #208098', borderRadius: 8, padding: '9px 13px',
    background: '#0a3148', color: '#e4f2fa', fontWeight: 700,
  };
  return <Modal visible onRequestClose={() => {if (!busy) onClose();}}>
    {h('div', {style: {height: '100dvh', display: 'flex', flexDirection: 'column', background: '#03192c', color: '#f5faff'}},
      h('header', {style: {padding: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderBottom: '1px solid #126078'}},
        h('button', {onClick: onClose, disabled: busy, style: control}, 'Back to Reports'),
        h('strong', {style: {flex: '1 1 180px', overflowWrap: 'anywhere'}}, projectName ? `${projectName} · Inspection Report` : 'Inspection Report'),
        h('a', {href: report.uri, download: report.fileName, style: control}, 'Download PDF'),
        onGenerate && h('button', {onClick: onGenerate, disabled: busy, style: {...control, background: '#00d9ee', color: '#03192c'}}, busy ? 'Preparing…' : 'Generate PDF')),
      error && h('div', {role: 'alert', style: {padding: 12, color: '#ff9bab'}}, error),
      busy && h('div', {role: 'status', style: {padding: 8}}, 'Working on your report…'),
      h('iframe', {src: report.uri, title: 'Project inspection PDF', style: {flex: 1, width: '100%', border: 0}}))}
  </Modal>;
}