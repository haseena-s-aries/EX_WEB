// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Animated,
//   Platform,
// } from 'react-native';
// import NewProjectModal from '../components/NewProjectModal';
// import StatCard from '../components/StatCard';

// // TODO: replace these zeros with real counts once the Projects API is ready
// const STATS = [
//   {label: 'Total Projects', value: 0, icon: '📁', color: '#8fa7f8', bg: '#f0eeff'},
//   {label: 'Pending', value: 0, icon: '⏳', color: '#a75a0b', bg: '#fff0d7'},
//   {label: 'Active', value: 0, icon: '🟢', color: '#718be8', bg: '#f0eeff'},
//   {label: 'In Progress', value: 0, icon: '⚙️', color: '#8053a6', bg: '#f1eaf3'},
//   {label: 'Completed', value: 0, icon: '✅', color: '#3b68aa', bg: '#e5eef7'},
//   {label: 'On Hold', value: 0, icon: '⛔', color: '#ba4e3c', bg: '#fde8e2'},
// ];

// // TODO: replace with real data from the Projects API once it exists
// const RECENT_PROJECTS: {name: string; job: string; status: string}[] = [];

// const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
//   Pending: {bg: '#fff0d7', text: '#a75a0b'},
//   'On Hold': {bg: '#fde8e2', text: '#ba4e3c'},
//   'In Progress': {bg: '#f1eaf3', text: '#8053a6'},
//   Active: {bg: '#f0eeff', text: '#718be8'},
//   Completed: {bg: '#e5eef7', text: '#3b68aa'},
// };

// type UserOption = {id: string; displayName: string};

// type Props = {
//   userName: string;
//   surveyors?: UserOption[];
//   qcUsers?: UserOption[];
//   clients?: UserOption[];
// };

// export default function DashboardScreen({
//   userName,
//   surveyors = [],
//   qcUsers = [],
//   clients = [],
// }: Props) {
//   const [showNewProject, setShowNewProject] = useState(false);
//   const bannerOpacity = useRef(new Animated.Value(0)).current;
//   const bannerY = useRef(new Animated.Value(-12)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(bannerOpacity, {
//         toValue: 1,
//         duration: 400,
//         useNativeDriver: Platform.OS !== 'web',
//       }),
//       Animated.timing(bannerY, {
//         toValue: 0,
//         duration: 400,
//         useNativeDriver: Platform.OS !== 'web',
//       }),
//     ]).start();
//   }, [bannerOpacity, bannerY]);

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
//       <Animated.View
//         style={[
//           styles.headerBanner,
//           {opacity: bannerOpacity, transform: [{translateY: bannerY}]},
//         ]}>
//         <View style={styles.bannerGlowOne} />
//         <View style={styles.bannerGlowTwo} />
//         <View style={{flex: 1, zIndex: 1}}>
//           <View style={styles.dateRow}>
//             <View style={styles.dateDot} />
//             <Text style={styles.dateText}>
//               {new Date().toLocaleDateString(undefined, {
//                 weekday: 'long',
//                 day: '2-digit',
//                 month: 'long',
//                 year: 'numeric',
//               })}
//             </Text>
//           </View>
//           <Text style={styles.welcomeText}>Welcome back, {userName.split(' ')[0]} 👋</Text>
//           <Text style={styles.subText}>Here's an overview of your projects</Text>
//         </View>
//         <NewProjectButton onPress={() => setShowNewProject(true)} />
//       </Animated.View>

//       <View style={styles.statRow}>
//         {STATS.map((stat, i) => (
//           <StatCard key={stat.label} {...stat} delay={i * 70} />
//         ))}
//       </View>

//       <View style={styles.sectionHeader}>
//         <Text style={styles.sectionTitle}>Recent Projects</Text>
//         <TouchableOpacity>
//           <Text style={styles.viewAll}>View all →</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.projectList}>
//         {RECENT_PROJECTS.length === 0 ? (
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIconWrap}>
//               <Text style={styles.emptyIcon}>📁</Text>
//             </View>
//             <Text style={styles.emptyText}>No projects yet</Text>
//             <Text style={styles.emptySubtext}>
//               Projects you're assigned to will appear here
//             </Text>
//             <TouchableOpacity
//               style={styles.emptyCta}
//               onPress={() => setShowNewProject(true)}>
//               <Text style={styles.emptyCtaText}>+ Create your first project</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           RECENT_PROJECTS.map(project => {
//             const statusStyle = STATUS_COLORS[project.status] ?? STATUS_COLORS.Pending;
//             return (
//               <View key={project.name} style={styles.projectRow}>
//                 <View style={styles.projectIconWrap}>
//                   <Text style={styles.projectIcon}>📁</Text>
//                 </View>
//                 <View style={{flex: 1}}>
//                   <Text style={styles.projectName}>{project.name}</Text>
//                   <Text style={styles.projectJob}>{project.job}</Text>
//                 </View>
//                 <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
//                   <Text style={[styles.statusText, {color: statusStyle.text}]}>
//                     {project.status}
//                   </Text>
//                 </View>
//               </View>
//             );
//           })
//         )}
//       </View>

//       <NewProjectModal
//         visible={showNewProject}
//         onClose={() => setShowNewProject(false)}
//         surveyors={surveyors}
//         qcUsers={qcUsers}
//         clients={clients}
//         onCreate={data => {
//           // TODO: wire to real POST /api/projects once backend has it
//           console.log('Create project:', data);
//           alert('Backend Projects API not connected yet — this is a UI preview.');
//           setShowNewProject(false);
//         }}
//       />
//     </ScrollView>
//   );
// }

// function NewProjectButton({onPress}: {onPress: () => void}) {
//   const scale = useRef(new Animated.Value(1)).current;
//   const animateTo = (v: number) =>
//     Animated.spring(scale, {
//       toValue: v,
//       useNativeDriver: Platform.OS !== 'web',
//       speed: 30,
//       bounciness: 8,
//     }).start();

//   return (
//     <TouchableOpacity
//       onPressIn={() => animateTo(0.95)}
//       onPressOut={() => animateTo(1)}
//       onPress={onPress}
//       style={{zIndex: 1}}>
//       <Animated.View style={[styles.newProjectBtn, {transform: [{scale}]}]}>
//         <Text style={styles.newProjectBtnIcon}>+</Text>
//         <Text style={styles.newProjectBtnText}>New Project</Text>
//       </Animated.View>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   screen: {flex: 1, backgroundColor: '#f7f9ff'},
//   content: {padding: 28, minHeight: '100%' as any},
//   headerBanner: {
//     borderRadius: 22,
//     padding: 28,
//     marginBottom: 26,
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     justifyContent: 'space-between',
//     overflow: 'hidden',
//     position: 'relative',
//     backgroundColor: '#242d52',
//     ...Platform.select({
//       web: {
//         backgroundImage: 'linear-gradient(135deg, #718be8 0%, #718be8 55%, #8fa7f8 100%)',
//         boxShadow: '0px 12px 32px rgba(26, 35, 126, 0.28)',
//       },
//       default: {
//         shadowColor: '#718be8',
//         shadowOffset: {width: 0, height: 8},
//         shadowOpacity: 0.25,
//         shadowRadius: 20,
//         elevation: 8,
//       },
//     }),
//   },
//   bannerGlowOne: {
//     position: 'absolute',
//     width: 200,
//     height: 200,
//     borderRadius: 100,
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     top: -80,
//     right: -40,
//   },
//   bannerGlowTwo: {
//     position: 'absolute',
//     width: 140,
//     height: 140,
//     borderRadius: 70,
//     backgroundColor: 'rgba(255,255,255,0.05)',
//     bottom: -60,
//     right: 100,
//   },
//   dateRow: {flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10},
//   dateDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#6fe3a3'},
//   dateText: {color: '#b3b6e0', fontSize: 12.5, fontWeight: '600'},
//   welcomeText: {color: '#fff', fontSize: 24, fontWeight: '800'},
//   subText: {color: '#c7caf0', fontSize: 13.5, marginTop: 5},
//   newProjectBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: 'rgba(255,255,255,0.14)',
//     borderWidth: 1.5,
//     borderColor: 'rgba(255,255,255,0.35)',
//     borderRadius: 12,
//     paddingVertical: 12,
//     paddingHorizontal: 18,
//   },
//   newProjectBtnIcon: {color: '#fff', fontSize: 17, fontWeight: '800'},
//   newProjectBtnText: {color: '#fff', fontSize: 13.5, fontWeight: '700'},
//   statRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 30},
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 14,
//   },
//   sectionTitle: {fontSize: 17, fontWeight: '800', color: '#252f50'},
//   viewAll: {fontSize: 13, fontWeight: '700', color: '#8fa7f8'},
//   projectList: {
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     overflow: 'hidden',
//     ...Platform.select({
//       web: {boxShadow: '0px 4px 18px rgba(26, 35, 126, 0.06)'},
//       default: {
//         shadowColor: '#718be8',
//         shadowOffset: {width: 0, height: 4},
//         shadowOpacity: 0.06,
//         shadowRadius: 12,
//         elevation: 2,
//       },
//     }),
//   },
//   emptyState: {alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20},
//   emptyIconWrap: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f0eeff',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 14,
//   },
//   emptyIcon: {fontSize: 26},
//   emptyText: {fontSize: 15, fontWeight: '800', color: '#2a2d3b'},
//   emptySubtext: {fontSize: 12.5, color: '#9aa0b4', marginTop: 4, textAlign: 'center'},
//   emptyCta: {marginTop: 18, backgroundColor: '#f0eeff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18},
//   emptyCtaText: {fontSize: 12.5, fontWeight: '700', color: '#8fa7f8'},
//   projectRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f1f6',
//     gap: 12,
//   },
//   projectIconWrap: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center'},
//   projectIcon: {fontSize: 16},
//   projectName: {fontSize: 14, fontWeight: '700', color: '#252f50'},
//   projectJob: {fontSize: 12, color: '#8a8fa3', marginTop: 2},
//   statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10},
//   statusText: {fontSize: 11.5, fontWeight: '700'},
// });




import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import NewProjectModal from '../components/NewProjectModal';
import ProjectDetailModal from '../components/ProjectDetailModal';
import StatCard from '../components/StatCard';
import {getProjects, createProject, addProjectArea, updateProject} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  Pending: {bg: '#fff0d7', text: '#a75a0b'},
  'On Hold': {bg: '#fde8e2', text: '#ba4e3c'},
  'In Progress': {bg: '#f1eaf3', text: '#8053a6'},
  Active: {bg: '#f0eeff', text: '#718be8'},
  Completed: {bg: '#e5eef7', text: '#3b68aa'},
};

type UserOption = {id: string; displayName: string};

type Props = {
  userName: string;
  surveyors?: UserOption[];
  qcUsers?: UserOption[];
  clients?: UserOption[];
};

export default function DashboardScreen({
  userName,
  surveyors = [],
  qcUsers = [],
  clients = [],
}: Props) {
  const {width} = useWindowDimensions();
  const isPhone = width < 600;
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerY = useRef(new Animated.Value(-12)).current;

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await getProjects();
      setProjects(res.data);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(bannerY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [bannerOpacity, bannerY]);

  // TODO: confirm the exact status field name/values with backend —
  // assuming `status` for now, defaulting to "Pending" if missing.
  const statusOf = (p: any) => p.status || p.projectStatus || 'Pending';

  const stats = [
    {label: 'Total Projects', value: projects.length, icon: '📁', color: '#8fa7f8', bg: '#f0eeff'},
    {label: 'Pending', value: projects.filter(p => statusOf(p) === 'Pending').length, icon: '⏳', color: '#a75a0b', bg: '#fff0d7'},
    {label: 'Active', value: projects.filter(p => statusOf(p) === 'Active').length, icon: '🟢', color: '#718be8', bg: '#f0eeff'},
    {label: 'In Progress', value: projects.filter(p => statusOf(p) === 'In Progress').length, icon: '⚙️', color: '#8053a6', bg: '#f1eaf3'},
    {label: 'Completed', value: projects.filter(p => statusOf(p) === 'Completed').length, icon: '✅', color: '#3b68aa', bg: '#e5eef7'},
    {label: 'On Hold', value: projects.filter(p => statusOf(p) === 'On Hold').length, icon: '⛔', color: '#ba4e3c', bg: '#fde8e2'},
  ];

  const recentProjects = [...projects]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 6);

  const handleCreate = async (data: {
  projectName: string;
  sector: string;
  jobNumber: string;
  location: string;
  vesselName: string;
  surveyorId: string;
  qcId: string;
  clientId: string;
  areas: {name: string; file: any; fileName: string}[];
}) => {
  setCreating(true);
  try {
    const res = await createProject({
      projectName: data.projectName,
      sector: data.sector,
      jobNo: data.jobNumber,
      location: data.location,
      vesselOrSiteName: data.vesselName,
      assignedSurveyorId: data.surveyorId,
      assignedQcId: data.qcId,
      assignedClientId: data.clientId,
    });

    const projectId = res.data.id;
    const failedAreas: string[] = [];

    for (const area of data.areas) {
      try {
        await addProjectArea(projectId, area.name, area.file);
      } catch (err) {
        console.error('Failed to add area', area.name, err);
        failedAreas.push(`${area.name}: ${getApiErrorMessage(err, 'image upload failed')}`);
      }
    }

    if (failedAreas.length > 0) {
      Alert.alert(
        'Project created',
        `Project was created, but these areas could not be saved with their images:\n${failedAreas.join('\n')}`,
      );
    }

    setShowNewProject(false);
    await loadProjects();
  } catch (err: any) {
    const errData = err?.response?.data;
    Alert.alert('Error', errData?.error || errData?.message || 'Could not create project');
  } finally {
    setCreating(false);
  }
};

  const handleSaveProject = async (data: {
    projectName: string;
    sector: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId: string;
    status: string;
  }) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id || selectedProject.projectId;
    setSavingProject(true);
    try {
      await updateProject(projectId, data);
      setSelectedProject(null);
      await loadProjects();
    } catch (err: any) {
      const errData = err?.response?.data;
      Alert.alert('Error', errData?.error || errData?.message || 'Could not save project changes');
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, isPhone && styles.contentPhone]}>
      <Animated.View
        style={[
          styles.headerBanner,
          isPhone && styles.headerBannerPhone,
          {opacity: bannerOpacity, transform: [{translateY: bannerY}]},
        ]}>
        <View style={{flex: 1, zIndex: 1}}>
          <View style={styles.dateRow}>
            <View style={styles.dateDot} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          <Text style={[styles.welcomeText, isPhone && styles.welcomeTextPhone]}>
            Welcome back, {userName.split(' ')[0]}
          </Text>
          <Text style={styles.subText}>Your project portfolio at a glance</Text>
        </View>
        <NewProjectButton
          fullWidth={isPhone}
          onPress={() => setShowNewProject(true)}
        />
      </Animated.View>

      {loadingProjects ? (
        <ActivityIndicator color="#718be8" style={{marginVertical: 30}} />
      ) : (
        <>
          <View style={styles.statRow}>
            {stats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i * 70} />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project portfolio</Text>
            <TouchableOpacity onPress={loadProjects}>
              <Text style={styles.viewAll}>Refresh ↻</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.projectList}>
            {recentProjects.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.emptyIcon}>▦</Text>
                </View>
                <Text style={styles.emptyText}>No projects yet</Text>
                <Text style={styles.emptySubtext}>
                  Projects you're assigned to will appear here
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => setShowNewProject(true)}>
                  <Text style={styles.emptyCtaText}>+ Create your first project</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.projectTableHead}>
                  <Text style={styles.projectTableLabel}>PROJECT</Text>
                  <Text style={styles.projectTableLabel}>STATUS</Text>
                </View>
                {recentProjects.map(project => {
                  const status = statusOf(project);
                  const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={styles.projectRow}
                      onPress={() => setSelectedProject(project)}
                      activeOpacity={0.6}>
                      <View style={styles.projectIconWrap}>
                        <Text style={styles.projectIcon}>▦</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.projectName}>{project.projectName}</Text>
                        <Text style={styles.projectJob}>
                          {project.jobNo ? `${project.jobNo} · ` : ''}
                          {project.location}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
                        <Text style={[styles.statusText, {color: statusStyle.text}]}>
                          {status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        </>
      )}

      <NewProjectModal
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={creating}
        onCreate={handleCreate}
      />

      <ProjectDetailModal
        visible={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onSave={handleSaveProject}
        onAreasChanged={loadProjects}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={savingProject}
      />
    </ScrollView>
  );
}

function NewProjectButton({
  onPress,
  fullWidth = false,
}: {
  onPress: () => void;
  fullWidth?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 8,
    }).start();

  return (
    <TouchableOpacity
      onPressIn={() => animateTo(0.95)}
      onPressOut={() => animateTo(1)}
      onPress={onPress}
      style={[styles.newProjectButtonWrap, fullWidth && styles.fullWidth]}>
      <Animated.View
        style={[
          styles.newProjectBtn,
          fullWidth && styles.newProjectBtnPhone,
          {transform: [{scale}]},
        ]}>
        <Text style={styles.newProjectBtnIcon}>+</Text>
        <Text style={styles.newProjectBtnText}>Create project</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 36, minHeight: '100%' as any, maxWidth: 1500, width: '100%', alignSelf: 'center'},
  contentPhone: {padding: 16, paddingBottom: 28},
  headerBanner: {
    borderRadius: 0,
    padding: 0,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'visible',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  headerBannerPhone: {marginBottom: 24, flexDirection: 'column', gap: 16},
  bannerGlowOne: {position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -40},
  bannerGlowTwo: {position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -60, right: 100},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10},
  dateDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#8fa7f8'},
  dateText: {color: '#7a7f93', fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  welcomeText: {color: '#252f50', fontSize: 29, fontWeight: '800', letterSpacing: -0.6},
  welcomeTextPhone: {fontSize: 24},
  subText: {color: '#7a7f93', fontSize: 13.5, marginTop: 6},
  newProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b8a5f8',
    borderWidth: 1,
    borderColor: '#b8a5f8',
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 19,
  },
  newProjectBtnIcon: {color: '#242d52', fontSize: 17, fontWeight: '900'},
  newProjectBtnText: {color: '#242d52', fontSize: 12.5, fontWeight: '900'},
  newProjectButtonWrap: {zIndex: 1},
  fullWidth: {width: '100%'},
  newProjectBtnPhone: {width: '100%', justifyContent: 'center'},
  statRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 38},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  sectionTitle: {fontSize: 20, fontWeight: '800', color: '#252f50', letterSpacing: -0.3},
  viewAll: {fontSize: 13, fontWeight: '700', color: '#8fa7f8'},
  projectList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      web: {boxShadow: '0px 8px 24px rgba(19, 42, 36, 0.07)'},
      default: {shadowColor: '#242d52', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2},
    }),
  },
  projectTableHead: {
    minHeight: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f6',
  },
  projectTableLabel: {fontSize: 9, fontWeight: '800', color: '#8a8fa3', letterSpacing: 1},
  emptyState: {alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20},
  emptyIconWrap: {width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  emptyIcon: {fontSize: 26},
  emptyText: {fontSize: 15, fontWeight: '800', color: '#2a2d3b'},
  emptySubtext: {fontSize: 12.5, color: '#9aa0b4', marginTop: 4, textAlign: 'center'},
  emptyCta: {marginTop: 18, backgroundColor: '#f0eeff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18},
  emptyCtaText: {fontSize: 12.5, fontWeight: '700', color: '#8fa7f8'},
  projectRow: {flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f1f6', gap: 12},
  projectIconWrap: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center'},
  projectIcon: {fontSize: 16},
  projectName: {fontSize: 14, fontWeight: '700', color: '#252f50'},
  projectJob: {fontSize: 12, color: '#8a8fa3', marginTop: 2},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10},
  statusText: {fontSize: 11.5, fontWeight: '700'},
});
