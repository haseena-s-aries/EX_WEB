import React, {useMemo} from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import AuthenticatedImage from './AuthenticatedImage';

/** Uses the existing authorized logo endpoint; missing/unreadable logos stay neutral. */
export default function ProjectCompanyLogo({projectId, version, style}: {
  projectId: string; version?: unknown; style?: StyleProp<ViewStyle>;
}) {
  const path = useMemo(() => `/api/projects/${encodeURIComponent(projectId)}/client-logo?v=${Date.now()}`, [projectId, version]);
  return <View accessibilityLabel="Client Company Logo" style={[{width: 96, height: 68, borderRadius: 10, padding: 8, backgroundColor: '#f1f5f7', overflow: 'hidden', flexShrink: 0}, style]}>
    <AuthenticatedImage path={path} resizeMode="contain" placeholderText="▦" style={{width: '100%', height: '100%', backgroundColor: '#f1f5f7'}} />
  </View>;
}
