import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {getProject, updateProject} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ProjectDetailModal from '../components/ProjectDetailModal';

type UserOption = {id: string; displayName: string};
type Props = {
  projectId: string;
  onBack: () => void;
  surveyors: UserOption[];
  qcUsers: UserOption[];
  clients: UserOption[];
};
const first = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  return undefined;
};
const dateLabel = (value: any) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export default function ProjectDetailsScreen({projectId, onBack, surveyors, qcUsers, clients}: Props) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewingArea, setViewingArea] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProject(projectId);
      setProject(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load project details.'));
    } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const save = async (data: any) => {
    setSaving(true);
    try {
      await updateProject(projectId, data);
      setEditing(false);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save project changes.'));
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.state}><ActivityIndicator color="#8fa7f8" /><Text style={styles.stateText}>Loading project details…</Text></View>;
  if (!project) return <View style={styles.state}><Text style={styles.stateTitle}>Project unavailable</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={load} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity><TouchableOpacity onPress={onBack} style={styles.backAction}><Text style={styles.backText}>Back to projects</Text></TouchableOpacity></View>;

  const areas: any[] = Array.isArray(project.areas) ? project.areas : [];
  const status = String(first(project, 'status', 'projectStatus') || 'Pending').replace(/([a-z])([A-Z])/g, '$1 $2');
  const statusStyle = status.toLowerCase().includes('progress') || status.toLowerCase().includes('active')
    ? {backgroundColor: '#f0eeff', color: '#718be8'}
    : status.toLowerCase().includes('complete')
      ? {backgroundColor: '#e5eef7', color: '#3b68aa'}
      : status.toLowerCase().includes('hold')
        ? {backgroundColor: '#fde8e2', color: '#ba4e3c'}
        : {backgroundColor: '#fff0d7', color: '#a75a0b'};
  const assignedName = (id: string, people: UserOption[]) => people.find(person => person.id === id)?.displayName || 'Not assigned';

  return <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ Back to projects</Text></TouchableOpacity>
      <View style={styles.hero}>
        <View style={{flex: 1}}><Text style={styles.eyebrow}>PROJECT DETAILS</Text><Text style={styles.title}>{project.projectName}</Text><View style={styles.heroMeta}><Text style={styles.heroMetaText}>Job {project.jobNo || 'Not set'}</Text><Text style={styles.heroMetaText}>Created {dateLabel(project.createdAt)}</Text></View></View>
        <View style={styles.heroActions}><View style={[styles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}><Text style={[styles.statusText, {color: statusStyle.color}]}>{status}</Text></View><TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}><Text style={styles.editText}>Edit project</Text></TouchableOpacity></View>
      </View>
      {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <View style={styles.columns}>
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            <Detail label="Project Name" value={project.projectName} />
            <Detail label="Sector" value={project.sector} />
            <Detail label="Job Number" value={project.jobNo} />
            <Detail label="Location" value={project.location} />
            <Detail label="Vessel / Site Name" value={project.vesselOrSiteName} />
            <Detail label="Created Date" value={dateLabel(project.createdAt)} />
            <Detail label="Last Updated" value={dateLabel(project.updatedAt)} />
          </View>
        </View>
        <View style={styles.teamCard}>
          <Text style={styles.sectionTitle}>Assigned Team</Text>
          <TeamMember role="Surveyor" name={assignedName(project.assignedSurveyorId, surveyors)} />
          <TeamMember role="QC" name={assignedName(project.assignedQcId, qcUsers)} />
          <TeamMember role="Client" name={assignedName(project.assignedClientId, clients)} />
        </View>
      </View>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Project Areas</Text><Text style={styles.sectionHint}>Area layouts and equipment totals</Text></View><Text style={styles.areaCount}>{areas.length} areas</Text></View>
      {areas.length === 0 ? <View style={styles.empty}><Text style={styles.sectionTitle}>No areas added</Text><Text style={styles.sectionHint}>Use Edit project to add areas.</Text></View> : <View style={styles.areaGrid}>{areas.map((area: any, index: number) => {
        const photos = Array.isArray(area.photos) ? area.photos : [];
        const photoUrl = photos.map((photo: any) => first(photo, 'downloadUrl')).find(Boolean);
         const layoutPath = first(area, 'layoutImagePath', 'drawingPath');
         const path = photoUrl || (typeof layoutPath === 'string' && (/^https?:\/\//i.test(layoutPath) || layoutPath.startsWith('/api/')) ? layoutPath : undefined);
         const areaId = String(first(area, 'id', 'areaId') || index);
         const equipmentCount = first(area, 'equipmentCount') ??
           (Array.isArray(area.equipment) ? area.equipment.length : 0);
         return <View key={areaId} style={styles.areaCard}>
           <AuthenticatedImage path={path} style={styles.areaImage} resizeMode="contain" />
           <View style={styles.areaBody}><Text style={styles.areaName}>{first(area, 'areaName', 'name') || `Area ${index + 1}`}</Text><Text style={styles.areaMeta}>{photos.length} photos  |  {equipmentCount} equipment</Text>
            <TouchableOpacity onPress={() => setViewingArea({...area, imagePath: path})} style={styles.viewAreaButton}><Text style={styles.viewAreaText}>View Area</Text></TouchableOpacity>
          </View>
        </View>;
      })}</View>}
    </ScrollView>
    <ProjectDetailModal visible={editing} project={project} onClose={() => setEditing(false)} onSave={save} onAreasChanged={load} surveyors={surveyors} qcUsers={qcUsers} clients={clients} loading={saving} />
    <AreaDetailsModal area={viewingArea} onClose={() => setViewingArea(null)} />
  </>;
}

function AreaDetailsModal({area, onClose}: {area: any; onClose: () => void}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  if (!area) return null;
  const equipment: any[] = Array.isArray(area.equipment) ? area.equipment : [];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.areaModalBackdrop}>
      <View style={styles.areaModal}>
        <View style={styles.areaModalHeader}><View><Text style={styles.eyebrow}>AREA DETAILS</Text><Text style={styles.sectionTitle}>{area.areaName || 'Area'}</Text><Text style={styles.areaMeta}>{equipment.length} equipment items</Text></View><TouchableOpacity onPress={onClose} style={styles.modalClose}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity></View>
        <ScrollView style={styles.areaModalScroll} contentContainerStyle={styles.areaModalContent}>
          <Text style={styles.areaSectionTitle}>Area Layout</Text>
          <View style={[styles.areaLayoutCanvas, {aspectRatio}]}>
            <AuthenticatedImage path={area.imagePath || area.layoutImagePath} resizeMode="contain" onLoad={event => {const source = event?.nativeEvent?.source; if (source?.width > 0 && source?.height > 0) setAspectRatio(source.width / source.height);}} style={styles.areaLayoutImage} />
            {equipment.map((item, index) => <TouchableOpacity key={item.id || index} onPress={() => setSelectedEquipmentId(item.id)} style={[styles.areaPin, selectedEquipmentId === item.id && styles.areaPinSelected, {left: `${Math.max(0, Math.min(100, Number(item.xPercent) || 0))}%` as any, top: `${Math.max(0, Math.min(100, Number(item.yPercent) || 0))}%` as any}]}><Text style={styles.areaPinText}>{item.sequenceNo || index + 1}</Text></TouchableOpacity>)}
          </View>
          <View style={styles.areaEquipmentHeader}><Text style={styles.areaSectionTitle}>Equipment Details</Text><Text style={styles.areaMeta}>{equipment.length} total</Text></View>
          {equipment.length === 0 ? <Text style={styles.areaMeta}>No equipment listed in this area.</Text> : equipment.map((item, index) => <TouchableOpacity key={item.id || index} activeOpacity={0.95} onPress={() => setSelectedEquipmentId(item.id || '')} style={[styles.equipmentCard, selectedEquipmentId === item.id && styles.equipmentCardSelected]}>
            <View style={styles.equipmentHeading}><View style={[styles.areaPin, styles.equipmentSequencePin]}><Text style={styles.areaPinText}>{item.sequenceNo || index + 1}</Text></View><Text style={styles.areaName}>{item.tagNumber || `Equipment ${index + 1}`}</Text></View>
            <View style={styles.detailsGrid}><Detail label="Tag Number" value={item.tagNumber} /><Detail label="Equipment ID" value={item.equipmentCode} /><Detail label="Type" value={item.type} /><Detail label="Circuit ID" value={item.circuitId} /><Detail label="Location" value={item.location} /><Detail label="Manufacturer" value={item.manufacturer} /><Detail label="Protection Details" value={item.protectionDetails} /><Detail label="Certificate Number" value={item.certificateNumber} /></View>
          </TouchableOpacity>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function Detail({label, value}: {label: string; value?: any}) {
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label.toUpperCase()}</Text><Text style={styles.detailValue}>{value || 'Not set'}</Text></View>;
}

function TeamMember({role, name}: {role: string; name: string}) {
  return <View style={styles.teamRow}><View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View><View style={{flex: 1}}><Text style={styles.teamRole}>{role.toUpperCase()}</Text><Text style={styles.teamName}>{name}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'}, content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  back: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8}, backText: {fontSize: 12, color: '#8fa7f8', fontWeight: '800'},
  hero: {backgroundColor: '#242d52', borderRadius: 15, padding: 24, minHeight: 150, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800', letterSpacing: 1.2}, title: {fontSize: 25, color: '#fff', fontWeight: '800', marginTop: 8}, heroMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 15}, heroMetaText: {fontSize: 11, color: '#e3eaff', fontWeight: '700'},
  heroActions: {alignItems: 'flex-end', gap: 14}, statusBadge: {borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6}, statusText: {fontSize: 10, fontWeight: '800'}, editButton: {minHeight: 38, borderRadius: 7, backgroundColor: '#b8a5f8', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center'}, editText: {fontSize: 11, color: '#242d52', fontWeight: '800'},
  columns: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14}, detailsCard: {flex: 2, minWidth: 320, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6f0', borderRadius: 9, padding: 20}, teamCard: {flex: 1, minWidth: 250, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6f0', borderRadius: 9, padding: 20}, sectionTitle: {fontSize: 16, color: '#242d52', fontWeight: '800'}, detailsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18}, detailItem: {flexGrow: 1, flexBasis: 210, minWidth: 160}, detailLabel: {fontSize: 9, color: '#8b90a2', fontWeight: '800'}, detailValue: {fontSize: 12, color: '#292e4c', fontWeight: '700', marginTop: 5},
  teamRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eef0f5', marginTop: 9}, avatar: {width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center'}, avatarText: {fontSize: 12, color: '#8fa7f8', fontWeight: '800'}, teamRole: {fontSize: 8, color: '#9297a8', fontWeight: '800'}, teamName: {fontSize: 12, color: '#292e4c', fontWeight: '800', marginTop: 3},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12}, sectionHint: {fontSize: 11, color: '#7a7f93', marginTop: 4}, areaCount: {fontSize: 11, color: '#555b70', fontWeight: '700'}, areaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14}, areaCard: {width: 380, maxWidth: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6f0', borderRadius: 9, overflow: 'hidden'}, areaImage: {width: '100%', height: 190, backgroundColor: '#eef0f6'}, areaBody: {padding: 14}, areaName: {fontSize: 14, color: '#242d52', fontWeight: '800'}, areaMeta: {fontSize: 10, color: '#82879a', marginTop: 6}, viewAreaButton: {marginTop: 12, minHeight: 36, borderRadius: 7, backgroundColor: '#b8a5f8', alignItems: 'center', justifyContent: 'center'}, viewAreaText: {fontSize: 11, color: '#242d52', fontWeight: '800'}, equipmentCard: {padding: 14, borderWidth: 1, borderColor: '#e2e6f0', borderRadius: 8, backgroundColor: '#fff'}, equipmentCardSelected: {borderColor: '#7163dc', backgroundColor: '#faf9ff'}, empty: {minHeight: 140, padding: 24, borderRadius: 9, borderWidth: 1, borderColor: '#e2e6f0', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'},
  areaModalBackdrop: {flex: 1, backgroundColor: 'rgba(23, 29, 54, 0.62)', alignItems: 'center', justifyContent: 'center', padding: 18}, areaModal: {width: '100%', maxWidth: 1050, maxHeight: '94%', backgroundColor: '#f7f9ff', borderRadius: 12, overflow: 'hidden'}, areaModalHeader: {paddingHorizontal: 22, paddingVertical: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e6f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, modalClose: {borderRadius: 7, borderWidth: 1, borderColor: '#dce1ee', paddingVertical: 9, paddingHorizontal: 14}, modalCloseText: {fontSize: 11, color: '#424865', fontWeight: '800'}, areaModalScroll: {flexGrow: 0, flexShrink: 1}, areaModalContent: {padding: 20, gap: 12}, areaSectionTitle: {fontSize: 15, color: '#242d52', fontWeight: '800'}, areaLayoutCanvas: {width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#eef0f6', borderRadius: 8}, areaLayoutImage: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%'}, areaPin: {position: 'absolute', width: 27, height: 27, marginLeft: -13, marginTop: -13, borderRadius: 14, borderWidth: 2, borderColor: '#fff', backgroundColor: '#4b42ce', alignItems: 'center', justifyContent: 'center', zIndex: 2}, areaPinSelected: {width: 34, height: 34, marginLeft: -17, marginTop: -17, backgroundColor: '#ed8c35'}, areaPinText: {fontSize: 10, color: '#fff', fontWeight: '800'}, areaEquipmentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}, equipmentHeading: {flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8}, equipmentSequencePin: {position: 'relative', left: undefined, top: undefined, marginLeft: 0, marginTop: 0, width: 25, height: 25, borderWidth: 0},
  state: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#f7f9ff'}, stateTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'}, stateText: {fontSize: 12, color: '#777c8d', textAlign: 'center', marginTop: 8}, primaryButton: {marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 7, backgroundColor: '#b8a5f8'}, primaryButtonText: {fontSize: 11, color: '#242d52', fontWeight: '800'}, backAction: {marginTop: 15}, errorBox: {padding: 10, backgroundColor: '#fff0f0', borderRadius: 7, marginTop: 12}, errorText: {fontSize: 11, color: '#b3404c', fontWeight: '700'},
});
