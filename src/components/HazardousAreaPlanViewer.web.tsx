import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import apiClient, { getApiResourceUrl } from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import { PlanViewerProps } from './hazardousAreaPlan';

export default function HazardousAreaPlanViewer({
  title,
  path,
  fileName,
  contentType,
  onClose,
}: PlanViewerProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const viewport = useRef<any>(null);
  const [bounds, setBounds] = useState({ width: 1, height: 1 });
  const pdf =
    contentType === 'application/pdf' ||
    fileName?.toLowerCase().endsWith('.pdf');
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = '';
    apiClient
      .get(getApiResourceUrl(path), {
        responseType: 'blob',
        signal: abort.signal,
      })
      .then(response => {
        if (abort.signal.aborted) return;
        objectUrl = (globalThis as any).URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(requestError => {
        if (!abort.signal.aborted)
          setError(
            getApiErrorMessage(requestError, 'Could not load the plan.'),
          );
      });
    return () => {
      abort.abort();
      if (objectUrl) (globalThis as any).URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () =>
      setBounds({
        width: element.clientWidth - 24,
        height: element.clientHeight - 24,
      });
    measure();
    const observer = new (globalThis as any).ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [url]);
  const fit = size.width
    ? Math.min(1, bounds.width / size.width, bounds.height / size.height)
    : 1;
  const scale = fit * zoom;
  const h = React.createElement;
  const button = (label: string, action: () => void) =>
    h(
      'button',
      {
        onClick: action,
        style: {
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #e5e9f6',
          background: '#fff',
          color: '#5b6178',
        },
      },
      label,
    );
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      {h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            background: '#111827',
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: 12,
              background: '#f8f9fc',
            },
          },
          h(
            'strong',
            { style: { flex: 1, overflowWrap: 'anywhere' } },
            title || 'Hazardous Area Plan',
          ),
          !pdf &&
            button('Zoom out', () => setZoom(v => Math.max(0.25, v / 1.25))),
          !pdf && button('Zoom in', () => setZoom(v => Math.min(32, v * 1.25))),
          !pdf && button('Fit to screen', () => setZoom(1)),
          !pdf && button('100% original size', () => setZoom(1 / fit)),
          !pdf && h('span', null, `${Math.round(scale * 100)}%`),
          button('Close', onClose),
        ),
        !url &&
          h(
            'p',
            {
              style: { color: '#fff', padding: 20 },
              role: error ? 'alert' : 'status',
            },
            error || 'Loading original plan…',
          ),
        !!url &&
          !!error &&
          h(
            'p',
            { style: { color: '#fff', padding: 20 }, role: 'alert' },
            error,
          ),
        !!url &&
          pdf &&
          h('iframe', {
            title: 'Hazardous Area Plan PDF',
            src: `${url}#view=FitH`,
            style: { border: 0, width: '100%', flex: 1 },
          }),
        !!url &&
          !pdf &&
          h(
            'div',
            {
              ref: viewport,
              style: { flex: 1, overflow: 'auto', padding: 12, minHeight: 0 },
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  minWidth: '100%',
                  minHeight: '100%',
                  width: size.width * scale || '100%',
                  height: size.height * scale || '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              },
              h('img', {
                src: url,
                alt: title || 'Hazardous Area Plan',
                draggable: false,
                onLoad: (e: any) =>
                  setSize({
                    width: e.target.naturalWidth,
                    height: e.target.naturalHeight,
                  }),
                onError: () => setError('Could not display the image.'),
                style: {
                  display: 'block',
                  width: size.width ? size.width * scale : 'auto',
                  height: size.height ? size.height * scale : 'auto',
                  maxWidth: 'none',
                  objectFit: 'contain',
                },
              }),
            ),
          ),
      )}
    </Modal>
  );
}
