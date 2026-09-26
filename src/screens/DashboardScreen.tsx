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
//   {label: 'Total Projects', value: 0, icon: '📁', color: '#3f47d6', bg: '#e8ebfa'},
//   {label: 'Pending', value: 0, icon: '⏳', color: '#b8770a', bg: '#fdf1e0'},
//   {label: 'Active', value: 0, icon: '🟢', color: '#1f8a4c', bg: '#e2f7ec'},
//   {label: 'In Progress', value: 0, icon: '⚙️', color: '#5a3fd6', bg: '#f0ecfc'},
//   {label: 'Completed', value: 0, icon: '✅', color: '#2a5fb0', bg: '#e6f0fb'},
//   {label: 'On Hold', value: 0, icon: '⛔', color: '#c93838', bg: '#fde6e6'},
// ];

// // TODO: replace with real data from the Projects API once it exists
// const RECENT_PROJECTS: {name: string; job: string; status: string}[] = [];

// const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
//   Pending: {bg: '#fdf1e0', text: '#b8770a'},
//   'On Hold': {bg: '#fde6e6', text: '#c93838'},
//   'In Progress': {bg: '#eae7fc', text: '#5a3fd6'},
//   Active: {bg: '#e2f7ec', text: '#1f8a4c'},
//   Completed: {bg: '#e6f0fb', text: '#2a5fb0'},
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
//   screen: {flex: 1, backgroundColor: '#f4f6fb'},
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
//     backgroundColor: '#161a4d',
//     ...Platform.select({
//       web: {
//         backgroundImage: 'linear-gradient(135deg, #1a1f5c 0%, #2a2f8a 55%, #3f47d6 100%)',
//         boxShadow: '0px 12px 32px rgba(26, 35, 126, 0.28)',
//       },
//       default: {
//         shadowColor: '#1a237e',
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
//   sectionTitle: {fontSize: 17, fontWeight: '800', color: '#1a1d2b'},
//   viewAll: {fontSize: 13, fontWeight: '700', color: '#3f47d6'},
//   projectList: {
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     overflow: 'hidden',
//     ...Platform.select({
//       web: {boxShadow: '0px 4px 18px rgba(26, 35, 126, 0.06)'},
//       default: {
//         shadowColor: '#1a237e',
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
//     backgroundColor: '#eef1fb',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 14,
//   },
//   emptyIcon: {fontSize: 26},
//   emptyText: {fontSize: 15, fontWeight: '800', color: '#2a2d3b'},
//   emptySubtext: {fontSize: 12.5, color: '#9aa0b4', marginTop: 4, textAlign: 'center'},
//   emptyCta: {marginTop: 18, backgroundColor: '#eef1fb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18},
//   emptyCtaText: {fontSize: 12.5, fontWeight: '700', color: '#3f47d6'},
//   projectRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f1f6',
//     gap: 12,
//   },
//   projectIconWrap: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#eef1fb', alignItems: 'center', justifyContent: 'center'},
//   projectIcon: {fontSize: 16},
//   projectName: {fontSize: 14, fontWeight: '700', color: '#1a1d2b'},
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
import StatCard from '../components/StatCard';
import {getProjects, createProject} from '../api/projects';

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  Pending: {bg: '#fdf1e0', text: '#b8770a'},
  'On Hold': {bg: '#fde6e6', text: '#c93838'},
  'In Progress': {bg: '#eae7fc', text: '#5a3fd6'},
  Active: {bg: '#e2f7ec', text: '#1f8a4c'},
  Completed: {bg: '#e6f0fb', text: '#2a5fb0'},
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
    {label: 'Total Projects', value: projects.length, icon: '📁', color: '#3f47d6', bg: '#e8ebfa'},
    {label: 'Pending', value: projects.filter(p => statusOf(p) === 'Pending').length, icon: '⏳', color: '#b8770a', bg: '#fdf1e0'},
    {label: 'Active', value: projects.filter(p => statusOf(p) === 'Active').length, icon: '🟢', color: '#1f8a4c', bg: '#e2f7ec'},
    {label: 'In Progress', value: projects.filter(p => statusOf(p) === 'In Progress').length, icon: '⚙️', color: '#5a3fd6', bg: '#f0ecfc'},
    {label: 'Completed', value: projects.filter(p => statusOf(p) === 'Completed').length, icon: '✅', color: '#2a5fb0', bg: '#e6f0fb'},
    {label: 'On Hold', value: projects.filter(p => statusOf(p) === 'On Hold').length, icon: '⛔', color: '#c93838', bg: '#fde6e6'},
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
    status: string;
  }) => {
    setCreating(true);
    try {
      await createProject({
        projectName: data.projectName,
        sector: data.sector,
        jobNo: data.jobNumber,
        location: data.location,
        vesselOrSiteName: data.vesselName,
        assignedSurveyorId: data.surveyorId,
        assignedQcId: data.qcId,
        assignedClientId: data.clientId,
        // NOTE: backend's POST /api/projects doesn't accept a `status` field yet —
        // ask backend whether status needs to be set via a separate PUT call.
      });
      setShowNewProject(false);
      await loadProjects();
    } catch (err: any) {
      const errData = err?.response?.data;
      Alert.alert('Error', errData?.error || errData?.message || 'Could not create project');
    } finally {
      setCreating(false);
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
        <View style={styles.bannerGlowOne} />
        <View style={styles.bannerGlowTwo} />
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
            Welcome back, {userName.split(' ')[0]} 👋
          </Text>
          <Text style={styles.subText}>Here's an overview of your projects</Text>
        </View>
        <NewProjectButton
          fullWidth={isPhone}
          onPress={() => setShowNewProject(true)}
        />
      </Animated.View>

      {loadingProjects ? (
        <ActivityIndicator color="#1a237e" style={{marginVertical: 30}} />
      ) : (
        <>
          <View style={styles.statRow}>
            {stats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i * 70} />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Projects</Text>
            <TouchableOpacity onPress={loadProjects}>
              <Text style={styles.viewAll}>Refresh ↻</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.projectList}>
            {recentProjects.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.emptyIcon}>📁</Text>
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
              recentProjects.map(project => {
                const status = statusOf(project);
                const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
                return (
                  <View key={project.id} style={styles.projectRow}>
                    <View style={styles.projectIconWrap}>
                      <Text style={styles.projectIcon}>📁</Text>
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
                  </View>
                );
              })
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
        <Text style={styles.newProjectBtnText}>New Project</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f4f6fb'},
  content: {padding: 28, minHeight: '100%' as any},
  contentPhone: {padding: 16, paddingBottom: 28},
  headerBanner: {
    borderRadius: 22,
    padding: 28,
    marginBottom: 26,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161a4d',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #1a1f5c 0%, #2a2f8a 55%, #3f47d6 100%)',
        boxShadow: '0px 12px 32px rgba(26, 35, 126, 0.28)',
      },
      default: {
        shadowColor: '#1a237e',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  headerBannerPhone: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    flexDirection: 'column',
    gap: 18,
  },
  bannerGlowOne: {position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -40},
  bannerGlowTwo: {position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -60, right: 100},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10},
  dateDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#6fe3a3'},
  dateText: {color: '#b3b6e0', fontSize: 12.5, fontWeight: '600'},
  welcomeText: {color: '#fff', fontSize: 24, fontWeight: '800'},
  welcomeTextPhone: {fontSize: 20},
  subText: {color: '#c7caf0', fontSize: 13.5, marginTop: 5},
  newProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  newProjectBtnIcon: {color: '#fff', fontSize: 17, fontWeight: '800'},
  newProjectBtnText: {color: '#fff', fontSize: 13.5, fontWeight: '700'},
  newProjectButtonWrap: {zIndex: 1},
  fullWidth: {width: '100%'},
  newProjectBtnPhone: {width: '100%', justifyContent: 'center'},
  statRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 30},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  sectionTitle: {fontSize: 17, fontWeight: '800', color: '#1a1d2b'},
  viewAll: {fontSize: 13, fontWeight: '700', color: '#3f47d6'},
  projectList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      web: {boxShadow: '0px 4px 18px rgba(26, 35, 126, 0.06)'},
      default: {shadowColor: '#1a237e', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2},
    }),
  },
  emptyState: {alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20},
  emptyIconWrap: {width: 60, height: 60, borderRadius: 30, backgroundColor: '#eef1fb', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  emptyIcon: {fontSize: 26},
  emptyText: {fontSize: 15, fontWeight: '800', color: '#2a2d3b'},
  emptySubtext: {fontSize: 12.5, color: '#9aa0b4', marginTop: 4, textAlign: 'center'},
  emptyCta: {marginTop: 18, backgroundColor: '#eef1fb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18},
  emptyCtaText: {fontSize: 12.5, fontWeight: '700', color: '#3f47d6'},
  projectRow: {flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f1f6', gap: 12},
  projectIconWrap: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#eef1fb', alignItems: 'center', justifyContent: 'center'},
  projectIcon: {fontSize: 16},
  projectName: {fontSize: 14, fontWeight: '700', color: '#1a1d2b'},
  projectJob: {fontSize: 12, color: '#8a8fa3', marginTop: 2},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10},
  statusText: {fontSize: 11.5, fontWeight: '700'},
});
