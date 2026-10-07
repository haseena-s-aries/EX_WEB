import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import HazardousAreaPlanViewer from './HazardousAreaPlanViewer';
type Props = {
  project: {
    hazardousAreaPlanPath?: string | null;
    hazardousAreaPlanFileName?: string | null;
    hazardousAreaPlanContentType?: string | null;
  };
};
export default function HazardousAreaPlanSection({ project }: Props) {
  const [viewing, setViewing] = useState(false);
  const path = project.hazardousAreaPlanPath;
  return (
    <View style={{ gap: 10, marginVertical: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#5b6178' }}>
        Hazardous Area Plan
      </Text>
      {path ? (
        <>
          <TouchableOpacity
            onPress={() => setViewing(true)}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#718be8',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: '700', color: '#fff' }}>View Plan</Text>
          </TouchableOpacity>
          {viewing && (
            <HazardousAreaPlanViewer
              path={path}
              fileName={project.hazardousAreaPlanFileName}
              contentType={project.hazardousAreaPlanContentType}
              onClose={() => setViewing(false)}
            />
          )}
        </>
      ) : (
        <Text style={{ color: '#85899a' }}>Not Uploaded</Text>
      )}
    </View>
  );
}
