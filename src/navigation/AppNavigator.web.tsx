import {restoreBrowserSession} from '../api/restoreBrowserSession';
import {readBrowserSession} from '../api/browserSession';
﻿import {establishFieldwork, unlockFieldwork, lockFieldwork, OFFLINE_WINDOW_MS} from '../offline/fieldworkStore';
import {browserFieldworkEnabled} from '../offline/fieldworkConfig';
import {pendingOperations} from '../offline/fieldwork';
import {setSessionProfile} from '../api/profileState';
// import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
// import ReportsScreen from '../screens/ReportsScreen';
// import useQcPendingCount from '../hooks/useQcPendingCount';
// import React, {useMemo, useState} from 'react';
// import {
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   useWindowDimensions,
//   View,
// } from 'react-native';
// import SignupScreen from '../screens/SignupScreen';
// import OtpScreen from '../screens/OtpScreen';
// import LoginScreen from '../screens/LoginScreen';
// import DashboardScreen from '../screens/DashboardScreen';
// import ProjectsScreen from '../screens/ProjectsScreen';
// import SurveyorDashboardScreen from '../screens/SurveyorDashboardScreen';
// import SurveyorProjectDetailsScreen from '../screens/SurveyorProjectDetailsScreen';
// import SurveyorAreaDetailsScreen from '../screens/SurveyorAreaDetailsScreen';
// import SurveyorEquipmentDetailsScreen from '../screens/SurveyorEquipmentDetailsScreen';
// import UserManagementScreen from '../screens/UserManagementScreen';
// import QcDashboardScreen from '../screens/QcDashboardScreen';
// import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
// import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
// import Sidebar from '../components/Sidebar';
// import NotificationBell from '../components/NotificationBell';
// import type {AppNotification} from '../notifications/notifications';
// import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
// import {getAssignmentOptions} from '../api/projects';
// import {setAuthToken} from '../api/client';
// import MobileDrawer, {MenuButton, AppTab} from '../components/MobileDrawer';
// import AdminEquipmentListScreen from '../screens/AdminEquipmentListScreen';
// import {useThemeMode} from '../theme/useThemeMode';
// import {Colors, DARK, LIGHT} from '../theme/palette';

// type Screen =
//   | 'Signup'
//   | 'Otp'
//   | 'Login'
//   | 'Dashboard'
//   | 'Projects'
//   | 'UserManagement'
//   | 'SurveyorProjectDetails'
//   | 'SurveyorAreaDetails'
//   | 'QcProjectDetails'
//   | 'QcProjects'
//   | 'ProjectDetails'
//   | 'SurveyorEquipmentDetails'
//   | 'SurveyorInspection'
//   | 'AdminEquipmentList'
//   | 'ManagerQcReview'
//   | 'Reports'
//   | 'QcPending';

// export default function AppNavigator() {
//   const {width} = useWindowDimensions();
//   const isMobile = width < 768;
//   const [screen, setScreen] = useState<Screen>('Login');
//   const [pendingEmail, setPendingEmail] = useState('');
//   const [pendingPassword, setPendingPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [currentUser, setCurrentUser] = useState<{name: string; role: string} | null>(null);
//   const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
//   const [selectedProjectId, setSelectedProjectId] = useState('');
//   const [selectedAreaId, setSelectedAreaId] = useState('');
//   const [qcProjectId, setQcProjectId] = useState('');
//   const [qcProjectSummary, setQcProjectSummary] = useState<any>(null);
//   const [qcProjectReturnScreen, setQcProjectReturnScreen] = useState<
//     'Dashboard' | 'QcProjects' | 'QcPending'
//   >('Dashboard');
//   const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
//   const [projectDetailsReturnScreen, setProjectDetailsReturnScreen] = useState<'Dashboard' | 'Projects' | 'AdminEquipmentList'>('Dashboard');
//   const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);
//   const themeMode = useThemeMode();
//   const styles = useMemo(() => makeStyles(themeMode === 'dark' ? DARK : LIGHT), [themeMode]);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const qcPendingCount = useQcPendingCount(currentUser, screen);
//   if (screen === 'Otp') {
//     return (
//       <OtpScreen
//         email={pendingEmail}
//         loading={loading}
//         onVerify={async otp => {
//           setLoading(true);
//           try {
//             await verifyOtp(pendingEmail, otp);
//             await completeRegistration(pendingEmail, pendingPassword);
//             setScreen('Login');
//           } catch (err: any) {
//             const data = err?.response?.data;
//             alert(data?.error || data?.message || 'Invalid or expired OTP');
//           } finally {
//             setLoading(false);
//           }
//         }}
//         onResend={() => console.log('Resend OTP to', pendingEmail)}
//         onBack={() => setScreen('Signup')}
//       />
//     );
//   }

//   if (screen === 'Login') {
//     return (
//       <LoginScreen
//         loading={loading}
//         onLogin={async (email, password) => {
//           setLoading(true);
//           try {
//             const res = await loginUser(email, password);
//             const {accessToken, user} = res.data;
//             setAuthToken(accessToken);
//             setCurrentUser({name: user.displayName, role: user.role});

//             if (user.role === 'Admin' || user.role === 'Manager') {
//               try {
//                 const optionsRes = await getAssignmentOptions();
//                 setApprovedUsers(optionsRes.data);
//               } catch (err) {
//                 console.error('Could not load assignment options', err);
//               }
//             } else {
//               setApprovedUsers([]);
//             }

//             setScreen('Dashboard');
//           } catch (err: any) {
//             const data = err?.response?.data;
//             alert(data?.error || data?.message || 'Login failed');
//           } finally {
//             setLoading(false);
//           }
//         }}
//         onGoToSignup={() => setScreen('Signup')}
//       />
//     );
//   }

//   if (
//     screen === 'Dashboard' ||
//     screen === 'Projects' ||
//     screen === 'Reports' ||
//     screen === 'UserManagement' ||
//     screen === 'SurveyorProjectDetails' ||
//     screen === 'SurveyorAreaDetails' ||
//     screen === 'QcProjectDetails' ||
//     screen === 'QcProjects' ||
//     screen === 'SurveyorEquipmentDetails' ||
//     screen === 'SurveyorInspection' ||
//     screen === 'QcPending' ||
//     screen === 'ManagerQcReview' ||
//     screen === 'AdminEquipmentList' ||
//     screen === 'ProjectDetails'
//   ) {
//     if (!currentUser) {
//       setScreen('Login');
//       return null;
//     }
//     const logout = () => {
//       setAuthToken(null);
//       setCurrentUser(null); setAuthState('unauthenticated');
//       setApprovedUsers([]);
//       setSelectedProjectId('');
//       setSelectedAreaId('');
//       setSelectedEquipmentId('');
//       setQcProjectId('');
//       setQcProjectSummary(null);
//       setScreen('Login');
//     };
//     const canManageUsers =
//       currentUser.role === 'Admin' || currentUser.role === 'Manager';
//     // Admin / Manager phone layout: brand header on the dashboard + bottom tab bar.
//     const adminMobile = isMobile && canManageUsers;
//     const tc = themeMode === 'dark' ? DARK : LIGHT;
//     const activeTab: AppTab =
//       screen === 'QcPending' || (screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending')
//         ? 'QCPending'
//         : screen === 'Reports' ? 'Reports'
//         : screen === 'ManagerQcReview'
//         ? 'QCReview'
//         : screen === 'Dashboard'
//         ? 'Home'
//         : screen === 'Projects' || screen === 'ProjectDetails'
//           ? 'Surveys'
//           : screen === 'AdminEquipmentList'
//             ? 'Equipment'
//             : 'User'; // UserManagement
//     const onTabChange = (tab: AppTab) => {
//       setSelectedProjectId('');
//       setSelectedAreaId('');
//       setSelectedEquipmentId('');
//       setScreen(
//         tab === 'Reports' ? 'Reports'
//           : tab === 'QCPending'
//           ? 'QcPending'
//           : tab === 'QCReview'
//           ? 'ManagerQcReview'
//           : tab === 'Home'
//           ? 'Dashboard'
//           : tab === 'Surveys'
//             ? 'Projects'
//             : tab === 'Equipment'
//               ? 'AdminEquipmentList'
//               : 'UserManagement',
//       );
//     };
//     const SECTION_TITLES: Record<AppTab, string> = {
//       Home: 'Home',
//       Surveys: 'Surveys',
//       Equipment: 'HAER',
//       Reports: 'Reports',
//       QCPending: 'QC Pending',
//       QCReview: 'QC Review',
//       User: 'User Management',
//     };
//     const openNotification = (notification: AppNotification) => {
//       const target = notification.target;
//       if (!target) return;
//       if (target.kind === 'qcProject') {
//         setQcProjectId(target.projectId);
//         setQcProjectSummary(target.summary || null);
//         setQcProjectReturnScreen('Dashboard');
//         setScreen('QcProjectDetails');
//       } else if (target.kind === 'project') {
//         if (!canManageUsers) return;
//         setSelectedProjectId(target.projectId);
//         setScreen('ProjectDetails');
//       } else if (target.kind === 'users') {
//         if (canManageUsers) setScreen('UserManagement');
//       } else if (target.kind === 'surveyorProject') {
//         setProjectDetailsReturnScreen('Dashboard');
//         setSelectedProjectId(target.projectId);
//         setSelectedAreaId('');
//         setScreen('SurveyorProjectDetails');
//       } else if (target.kind === 'surveyorEquipment') {
//         setProjectDetailsReturnScreen('Dashboard');
//         setSelectedProjectId(target.projectId);
//         setSelectedAreaId(target.areaId);
//         setSelectedEquipmentId(target.equipmentId);
//         setScreen('SurveyorEquipmentDetails');
//       }
//     };
//     const bell = (compact?: boolean) => (
//       <NotificationBell
//         role={currentUser.role}
//         userKey={`${currentUser.role}:${currentUser.name}`}
//         refreshKey={screen}
//         onSelect={openNotification}
//         compact={compact}
//       />
//     );

//     return (
//       <View
//         style={[
//           styles.appShell,
//           isMobile && styles.appShellMobile,
//           {backgroundColor: tc.bg},
//         ]}>
//         {adminMobile && screen !== 'Dashboard' ? (
//           <View style={[styles.adminTopBar, {backgroundColor: tc.bg, borderBottomColor: tc.border}]}>
//             <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} />
//             <View style={styles.adminTopTitleWrap}>
//               <Text numberOfLines={1} style={[styles.adminTopTitle, {color: tc.text}]}>{SECTION_TITLES[activeTab]}</Text>
//               <Text numberOfLines={1} style={[styles.adminTopSub, {color: tc.muted}]}>Ex-Survey</Text>
//             </View>
//             {bell(true)}
//           </View>
//         ) : null}
//         {adminMobile ? null : isMobile ? (
//           <View style={styles.mobileHeader}>
//             <View style={styles.mobileBrandRow}>
//               <View style={styles.mobileLogo}>
//                 <Text style={styles.mobileLogoText}>EX</Text>
//               </View>
//               <View style={styles.mobileIdentity}>
//                 <Text style={styles.mobileBrand}>Ex-Survey</Text>
//                 <Text style={styles.mobileRole}>{currentUser.role}</Text>
//               </View>
//               {bell(true)}
//               <TouchableOpacity onPress={logout} style={styles.mobileLogout}>
//                 <Text style={styles.mobileLogoutText}>Log out</Text>
//               </TouchableOpacity>
//             </View>
//             <View style={styles.mobileNav}>
//               <TouchableOpacity
//                 onPress={() => setScreen('Dashboard')}
//                 style={[
//                   styles.mobileNavItem,
//                   screen === 'Dashboard' && styles.mobileNavItemActive,
//                 ]}>
//                 <Text
//                   style={[
//                     styles.mobileNavText,
//                     screen === 'Dashboard' && styles.mobileNavTextActive,
//                   ]}>
//                   Dashboard
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() =>
//                   setScreen(
//                     currentUser.role.toLowerCase() === 'qc'
//                       ? 'QcProjects'
//                       : 'Projects',
//                   )
//                 }
//                 style={[
//                   styles.mobileNavItem,
//                   ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails', 'QcProjectDetails',
//                   'SurveyorEquipmentDetails','SurveyorInspection', 'QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavItemActive,
//                 ]}>
//                 <Text
//                   style={[
//                     styles.mobileNavText,
//                     ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails', 'QcProjectDetails',
//                      'SurveyorEquipmentDetails', 'SurveyorInspection','QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavTextActive,
//                   ]}>
//                   Projects
//                 </Text>
//               </TouchableOpacity>
//               {canManageUsers && (
//                 <TouchableOpacity
//                   onPress={() => setScreen('UserManagement')}
//                   style={[
//                     styles.mobileNavItem,
//                     screen === 'UserManagement' && styles.mobileNavItemActive,
//                   ]}>
//                   <Text
//                     style={[
//                       styles.mobileNavText,
//                       screen === 'UserManagement' &&
//                         styles.mobileNavTextActive,
//                     ]}>
//                     Users
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         ) : (
//           <Sidebar
//             active={
//               screen === 'SurveyorProjectDetails' ||
//               screen === 'SurveyorAreaDetails' ||
//               screen === 'SurveyorEquipmentDetails' ||
//               screen === 'SurveyorInspection'
//                 ? projectDetailsReturnScreen
//                 : screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending'
//                   ? 'QcPending'
//                 : screen === 'ProjectDetails' || screen === 'QcProjects' || screen === 'QcProjectDetails'
//                   ? 'Projects'
//                 : screen
//             }
//             userName={currentUser.name}
//             userRole={currentUser.role}
//             qcPendingCount={qcPendingCount}
//             onNavigate={key => {
//               if (key === 'QcPending') {
//                 if (canManageUsers || currentUser.role.toLowerCase() === 'qc') setScreen('QcPending');
//                 return;
//               }
//               if (key === 'ManagerQcReview') {
//                 if (canManageUsers) setScreen('ManagerQcReview');
//                 return;
//               }
//               if (key === 'Dashboard' || key === 'Projects' || key === 'UserManagement' || key === 'Reports') {
//                 if (key === 'UserManagement' && !canManageUsers) return;
//                 if (key === 'Projects' && currentUser.role.toLowerCase() === 'qc') {
//                   setScreen('QcProjects');
//                   return;
//                 }
//                 setSelectedProjectId('');
//                 setSelectedAreaId('');
//                  setSelectedEquipmentId('');
//                 setScreen(key as Screen);
//               }
//             }}
//             onLogout={logout}
//           />
//         )}
//         <View style={styles.mainContent}>
//           {!isMobile && <View style={styles.topBar}>{bell()}</View>}
//           {screen === 'Reports' ? <ReportsScreen /> : screen === 'QcPending' && (canManageUsers || currentUser.role.toLowerCase() === 'qc') ? (
//             <QcDashboardScreen pendingWorkspace userName={currentUser.name}
//               onProjectPress={(id, project) => {
//                 setQcProjectId(id); setQcProjectSummary(project);
//                 setQcProjectReturnScreen('QcPending'); setScreen('QcProjectDetails');
//               }} />
//           ) : screen === 'ManagerQcReview' && canManageUsers ? (
//             <ManagerQcReviewScreen userRole={currentUser.role} onAssignmentsChanged={() => {
//               getAssignmentOptions().then(res => setApprovedUsers(res.data)).catch(console.error);
//             }} />
//           ) : screen === 'Dashboard' && currentUser.role.toLowerCase() === 'qc' ? (
//             <QcDashboardScreen
//               userName={currentUser.name}
//               onProjectPress={(id, project) => {
//                 setQcProjectId(id);
//                 setQcProjectSummary(project);
//                 setQcProjectReturnScreen('Dashboard');
//                 setScreen('QcProjectDetails');
//               }}
//             />
//           ) : screen === 'QcProjects' ? (
//             <QcDashboardScreen
//               projectsOnly
//               userName={currentUser.name}
//               onProjectPress={(id, project) => {
//                 setQcProjectId(id);
//                 setQcProjectSummary(project);
//                 setQcProjectReturnScreen('QcProjects');
//                 setScreen('QcProjectDetails');
//               }}
//             />
//           ) : screen === 'Dashboard' &&
//           currentUser.role.toLowerCase() === 'surveyor' ? (
//             <SurveyorDashboardScreen
//               userName={currentUser.name}
//               refreshVersion={surveyorRefreshVersion}
//               onProjectPress={projectId => {
//                 setProjectDetailsReturnScreen('Dashboard');
//                 setSelectedProjectId(projectId);
//                 setSelectedAreaId('');
//                 setScreen('SurveyorProjectDetails');
//               }}
//               onFeedbackPress={feedback => {
//                 setSelectedProjectId(feedback.projectId);
//                 setSelectedAreaId(feedback.areaId);
//                 setSelectedEquipmentId(feedback.equipmentId);
//                 setScreen('SurveyorEquipmentDetails');
//               }}
//             />
//           ) : screen === 'Dashboard' ? (
//             <DashboardScreen
//               userName={currentUser.name}
//               userRole={currentUser.role}
//               showBrand={adminMobile}
//               menuButton={adminMobile ? <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} /> : undefined}
//               accessory={adminMobile ? bell(true) : undefined}
//               surveyors={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               qcUsers={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'qc')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               clients={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'client')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//             />
//           ) : screen === 'QcProjectDetails' && qcProjectId ? (
//             <QcProjectDetailsScreen
//               projectId={qcProjectId}
//               projectSummary={qcProjectSummary}
//               onBack={() => setScreen(qcProjectReturnScreen)}
//             />
//           ) : screen === 'Projects' ? (
//             <ProjectsScreen
//               userRole={currentUser.role}
//               isSurveyor={currentUser.role.toLowerCase() === 'surveyor'}
//               onProjectPress={canManageUsers ? projectId => {
//                 setSelectedProjectId(projectId);
//                 setScreen('ProjectDetails');
//               } : undefined}
//               onSurveyorProjectPress={projectId => {
//                 setProjectDetailsReturnScreen('Projects');
//                 setSelectedProjectId(projectId);
//                 setSelectedAreaId('');
//                 setScreen('SurveyorProjectDetails');
//               }}
//               surveyors={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               qcUsers={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'qc')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               clients={approvedUsers
//                 .filter((u: any) => u.role?.toLowerCase() === 'client')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//             />
//           ) : screen === 'ProjectDetails' && selectedProjectId ? (
//             <ProjectDetailsScreen
//               userRole={currentUser.role}
//               projectId={selectedProjectId}
//               onBack={() => setScreen('Projects')}
//               surveyors={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'surveyor').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               qcUsers={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'qc').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//               clients={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'client').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
//             />
//           ) : screen === 'SurveyorProjectDetails' && selectedProjectId ? (
//             <SurveyorProjectDetailsScreen
//               projectId={selectedProjectId}
//               refreshVersion={surveyorRefreshVersion}
//               onBack={() => setScreen(projectDetailsReturnScreen)}
//               onAreaPress={areaId => {
//                 setSelectedAreaId(areaId);
//                 setScreen('SurveyorAreaDetails');
//               }}
//                 onEquipmentPress={(areaId, equipmentId) => {
//                 setSelectedAreaId(areaId);
//                 setSelectedEquipmentId(equipmentId);
//                 setScreen('SurveyorEquipmentDetails');
//               }}
//             />
//           ) : screen === 'SurveyorAreaDetails' &&
//             selectedProjectId &&
//             selectedAreaId ? (
//             <SurveyorAreaDetailsScreen
//               projectId={selectedProjectId}
//               areaId={selectedAreaId}
//               onBack={() => setScreen('SurveyorProjectDetails')}
//               onEquipmentPress={equipmentId => {
//                 setSelectedEquipmentId(equipmentId);
//                 setScreen('SurveyorEquipmentDetails');
//               }}
//               onEquipmentAdded={() =>
//                 setSurveyorRefreshVersion(version => version + 1)
//               }
//             />
//           ) : screen === 'SurveyorEquipmentDetails' &&
//             selectedProjectId &&
//             selectedAreaId &&
//             selectedEquipmentId ? (
//             <SurveyorEquipmentDetailsScreen
//               projectId={selectedProjectId}
//               areaId={selectedAreaId}
//               equipmentId={selectedEquipmentId}
//               refreshVersion={surveyorRefreshVersion}
//               onBack={() => setScreen('SurveyorAreaDetails')}
//               onInspect={() => setScreen('SurveyorInspection')}
//             />
//           ) : screen === 'AdminEquipmentList' ? (
//             <AdminEquipmentListScreen
//               onEquipmentPress={projectId => {
//                 setSelectedProjectId(projectId);
//                 setScreen('ProjectDetails');
//               }}
//             />
//           ) : screen === 'UserManagement' ? (
// <UserManagementScreen onBack={() => setScreen('Dashboard')} />
//           ) : (
//             <DashboardScreen userName={currentUser.name} />
//           )}
//         </View>
//         {adminMobile ? (
//           <MobileDrawer
//             visible={menuOpen}
//             onClose={() => setMenuOpen(false)}
//             active={activeTab}
//             onChange={onTabChange}
//             onLogout={logout}
//             c={tc}
//             userName={currentUser.name}
//             userRole={currentUser.role}
//             showQc={canManageUsers}
//             qcPendingCount={qcPendingCount}
//           />
//         ) : null}
//       </View>
//     );
//   }

//   return (
//     <SignupScreen
//       loading={loading}
//       onRegister={async data => {
//         setLoading(true);
//         try {
//           await sendOtp(data.name, data.email, data.role);
//           setPendingEmail(data.email);
//           setPendingPassword(data.password);
//           setScreen('Otp');
//         } catch (err: any) {
//           const errData = err?.response?.data;
//           alert(errData?.error || errData?.message || 'Could not send OTP');
//         } finally {
//           setLoading(false);
//         }
//       }}
//       onGoToLogin={() => setScreen('Login')}
//     />
//   );
// }

// function makeStyles(c: Colors) {
//   return StyleSheet.create({
//   appShell: {
//     flex: 1,
//     flexDirection: 'row',
//     minHeight: '100vh' as any,
//     backgroundColor: c.bg,
//   },
//   appShellMobile: {flexDirection: 'column'},
//   mainContent: {flex: 1, minWidth: 0},
//   topBar: {height: 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, zIndex: 20},
//   adminTopBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     ...({position: 'sticky', top: 0, zIndex: 30} as object),
//   },
//   adminTopTitleWrap: {flex: 1, minWidth: 0},
//   adminTopTitle: {fontSize: 17, fontWeight: '800'},
//   adminTopSub: {fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1, textTransform: 'uppercase'},
//   mobileHeader: {
//     backgroundColor: c.bar,
//     borderBottomWidth: 1,
//     borderBottomColor: c.border,
//   },
//   mobileBrandRow: {
//     minHeight: 58,
//     paddingHorizontal: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   mobileLogo: {
//     width: 34,
//     height: 34,
//     borderRadius: 8,
//     backgroundColor: '#FBBF24',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   mobileLogoText: {color: '#000', fontSize: 12, fontWeight: '900', fontStyle: 'italic'},
//   mobileIdentity: {flex: 1, marginLeft: 9},
//   mobileBrand: {color: c.text, fontSize: 15, fontWeight: '800'},
//   mobileRole: {color: c.secondary, fontSize: 10.5, marginTop: 1},
//   mobileLogout: {paddingVertical: 9, paddingLeft: 14},
//   mobileLogoutText: {color: c.amber, fontSize: 12.5, fontWeight: '800'},
//   mobileNav: {
//     minHeight: 42,
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     gap: 4,
//   },
//   mobileNavItem: {
//     minHeight: 38,
//     paddingHorizontal: 14,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent',
//   },
//   mobileNavItemActive: {borderBottomColor: c.amber},
//   mobileNavText: {fontSize: 12.5, fontWeight: '700', color: c.secondary},
//   mobileNavTextActive: {color: c.amber},
// });
// }


import LandingPage from '../components/LandingPage.web';
import AccountRecoveryScreen from '../screens/AccountRecoveryScreen';
import {parseAccountLink} from '../api/accountLink';

import RegistrationConfirmationScreen from '../screens/RegistrationConfirmationScreen';
import ClientWorkspace from '../screens/ClientWorkspace';
import type {ClientSection} from '../api/clientDashboard';
import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
import ReportsScreen from '../screens/ReportsScreen';
import useQcPendingCount from '../hooks/useQcPendingCount';
import React, {useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';
import SignupScreen from '../screens/SignupScreen';

const ARIES_LOGO = require('../assets/aries-logo.png');

import OtpScreen from '../screens/OtpScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import SurveyorDashboardScreen from '../screens/SurveyorDashboardScreen';
import SurveyorProjectDetailsScreen from '../screens/SurveyorProjectDetailsScreen';
import SurveyorAreaDetailsScreen from '../screens/SurveyorAreaDetailsScreen';
import SurveyorEquipmentDetailsScreen from '../screens/SurveyorEquipmentDetailsScreen';
import EquipmentInspectionScreen from '../screens/EquipmentInspectionScreen';
import InspectionActivityScreen from '../screens/InspectionActivityScreen';
import ScanEquipmentScreen from '../screens/ScanEquipmentScreen.web';
import DefectRegisterScreen from '../screens/DefectRegisterScreen';
import EquipmentCategoryChecklistScreen from '../screens/EquipmentCategoryChecklistScreen';
import ChecklistAdminScreen from '../screens/ChecklistAdminScreen';
import InspectionPlanningScreen from '../screens/InspectionPlanningScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import QcDashboardScreen from '../screens/QcDashboardScreen';
import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import Sidebar from '../components/Sidebar';
import AdminWorkspaceHeader from '../components/AdminWorkspaceHeader';
import AppearanceSettings from '../components/AppearanceSettings';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import NotificationBell from '../components/NotificationBell';
import type {AppNotification} from '../notifications/notifications';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';
import MobileDrawer, {MenuButton, AppTab} from '../components/MobileDrawer';
import AdminEquipmentListScreen from '../screens/AdminEquipmentListScreen';
import EquipmentReferenceDocumentsPanel from '../components/EquipmentReferenceDocumentsPanel';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT} from '../theme/palette';
 
type Screen =
  | 'Landing'
  | 'Signup'
  | 'Otp'
  | 'RegistrationConfirmation'
  | 'Login'
  | 'Dashboard'
  | 'Projects'
  | 'UserManagement'
  | 'SurveyorProjectDetails'
  | 'SurveyorAreaDetails'
  | 'QcProjectDetails'
  | 'QcProjects'
  | 'ProjectDetails'
  | 'EditProject'
  | 'SurveyorEquipmentDetails'
  | 'EquipmentInspection'
  | 'SurveyorInspection'
  | 'InspectionActivities'
  | 'InspectionActivityDetail'
  | 'EquipmentIdentification'
  | 'DefectRegister'
  | 'ChecklistAdmin'
  | 'InspectionPlanning'
  | 'AdminEquipmentList'
  | 'EquipmentDocuments'
  | 'ManagerQcReview'
  | 'Reports'
  | 'QcPending' | 'ForgotPassword' | 'ResetPassword' | 'VerifyEmail';
 
export default function AppNavigator() {
  const {width} = useWindowDimensions();
  const isMobile = width < 768;
    const [clientSection, setClientSection] = useState<ClientSection>('Dashboard');
  const [clientRequestedProjectId, setClientRequestedProjectId] = useState('');
  const [accountLink, setAccountLink] = useState(() => typeof window === 'undefined' || !window.location ? undefined : parseAccountLink(window.location.hash));
  const [screen, setActiveScreen] = useState<Screen>(() => accountLink?.mode === 'reset' ? 'ResetPassword' : accountLink?.mode === 'verify' ? 'VerifyEmail' : 'Landing');
  useEffect(() => {if (accountLink && typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname + window.location.search);}, [accountLink]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location || typeof window.addEventListener !== 'function') return;
    const openAccountLink = () => {const next = parseAccountLink(window.location.hash); if (next) {setAccountLink(next); setActiveScreen(next.mode === 'reset' ? 'ResetPassword' : 'VerifyEmail');}};
    window.addEventListener('hashchange', openAccountLink);
    return () => window.removeEventListener('hashchange', openAccountLink);
  }, []);
  const [adminProjectReturn, setAdminProjectReturn] = useState<'Dashboard' | 'Projects'>('Projects');
  const canNavigate = () => typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' ||
    window.dispatchEvent(new Event('ex-survey:before-navigation', {cancelable: true}));
  const setScreen = (requested: Screen, projectReturn: 'Dashboard' | 'Projects' = 'Projects') => {
    if (!canNavigate()) return false;
    const next: Screen = requested === 'SurveyorInspection' ? 'EquipmentInspection' : requested;
    if (next === 'ProjectDetails' && screen !== 'EditProject') setAdminProjectReturn(projectReturn);
    setActiveScreen(next);
    return true;
  };
  const [editReturnScreen, setEditReturnScreen] = useState<'Dashboard' | 'Projects' | 'ProjectDetails'>('ProjectDetails');
  const [registrationResult,setRegistrationResult]=useState<{email:string;role:string}|null>(null);
  const [userFocus,setUserFocus]=useState<{userId?:string;roleRequestId?:string}>({});
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [loading, setLoading] = useState(false);
const [currentUser, setCurrentUser] = useState<{name: string; role: string; id?: string; email?: string; companyName?: string} | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [qcProjectId, setQcProjectId] = useState('');
  const [qcProjectSummary, setQcProjectSummary] = useState<any>(null);
  const [qcProjectReturnScreen, setQcProjectReturnScreen] = useState<
    'Dashboard' | 'QcProjects' | 'QcPending'
>('Dashboard');
  const [inspectionReturn,setInspectionReturn]=useState('SurveyorEquipmentDetails');
  const [inspectionContext,setInspectionContext]=useState<any>();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [checklistReturnToInspection, setChecklistReturnToInspection] = useState(false);
  const [checklistReturnScreen, setChecklistReturnScreen] = useState<Screen>('EquipmentInspection');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [projectDetailsReturnScreen, setProjectDetailsReturnScreen] = useState<'Dashboard' | 'Projects' | 'AdminEquipmentList'>('Dashboard');
  const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);
  const themeMode = useThemeMode();
  const styles = useMemo(() => makeStyles(themeMode === 'dark' ? DARK : LIGHT), [themeMode]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const qcPendingCount = useQcPendingCount(currentUser, screen);
  const [authState, setAuthState] = useState<'initializing' | 'authenticated' | 'unauthenticated' | 'error'>('initializing');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (accountLink) {setAuthState('unauthenticated'); return;}
    const hadSession = !!readBrowserSession();
    setAuthState('initializing');
    restoreBrowserSession().then(async user => {
      if (cancelled) return;
      if (!user) {
        setAuthState('unauthenticated');
        if (hadSession) setActiveScreen('Login');
        return;
      }
      setCurrentUser({id: user.id, name: user.displayName, email: user.email, role: user.role});
      setActiveScreen('Dashboard');
      setAuthState('authenticated');
      if (user.role === 'Admin' || user.role === 'Manager') {
        try {const options = await getAssignmentOptions(); if (!cancelled) setApprovedUsers(options.data);}
        catch { /* Dashboard remains available; project forms retain their normal error handling. */ }
      }
    }).catch(() => {if (!cancelled) setAuthState('error');});
    return () => {cancelled = true;};
  }, [restoreAttempt]);
  if (!accountLink && (authState === 'initializing' || authState === 'error')) {
    return <View style={{flex: 1, backgroundColor: '#031b29', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18}}>
      <Text accessibilityRole="header" style={{color: '#00d9ee', fontSize: 28, fontWeight: '700'}}>Ex-Survey</Text>
      <Text accessibilityLiveRegion="polite" style={{color: '#eaf7fc', fontSize: 16, textAlign: 'center'}}>{authState === 'error' ? 'Unable to verify your session. Check your connection and retry.' : 'Restoring your secure workspace…'}</Text>
      {authState === 'error' && <TouchableOpacity accessibilityRole="button" onPress={() => setRestoreAttempt(v => v + 1)} style={{padding: 16, borderRadius: 10, backgroundColor: '#00d9ee'}}><Text style={{color: '#031b29', fontWeight: '700'}}>Retry</Text></TouchableOpacity>}
      {authState === 'error' && browserFieldworkEnabled() && <TouchableOpacity accessibilityRole="button" onPress={() => {setAuthState('unauthenticated'); setActiveScreen('Login');}} style={{padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#00d9ee'}}><Text style={{color: '#00d9ee', fontWeight: '700'}}>Sign in to offline fieldwork</Text></TouchableOpacity>}
    </View>;
  }
  const registrationEnabled = typeof window === 'undefined' ||
    (window as Window & {EX_SURVEY_CONFIG?: {registrationEnabled?: boolean}}).EX_SURVEY_CONFIG?.registrationEnabled !== false;
  const openRegistration = registrationEnabled ? () => setScreen('Signup') : undefined;
  if (screen === 'ForgotPassword' || screen === 'ResetPassword' || screen === 'VerifyEmail') return <AccountRecoveryScreen mode={screen === 'ForgotPassword' ? 'forgot' : screen === 'ResetPassword' ? 'reset' : 'verify'} token={accountLink?.token} onHome={() => setScreen('Landing')} onLogin={() => {setSettingsOpen(false); setAuthToken(null); setCurrentUser(null); setAuthState('unauthenticated'); setScreen('Login');}} />;
  if (screen === 'Landing') {
    return <LandingPage onLogin={() => setScreen('Login')} onRegister={openRegistration} />;
  }
  if(screen==='RegistrationConfirmation'&&registrationResult)return <RegistrationConfirmationScreen email={registrationResult.email} role={registrationResult.role} onLogin={()=>setScreen('Login')}/>;
  if (screen === 'Otp') {
    return (
<OtpScreen
        email={pendingEmail}
        loading={loading}
        onVerify={async otp => {
          setLoading(true);
          try {
            await verifyOtp(pendingEmail, otp);
            const result=await completeRegistration(pendingEmail,pendingPassword);
            setRegistrationResult({email:result.data.user.email,role:result.data.user.role});setPendingPassword('');setScreen('RegistrationConfirmation');
          } catch (err: any) {
            const data = err?.response?.data;
            alert(data?.error || data?.message || 'Invalid or expired OTP');
          } finally {
            setLoading(false);
          }
        }}
        onResend={async()=>{try{const {resendOtp}=await import('../api/auth');await resendOtp(pendingEmail);}catch(e:any){alert(e?.response?.data?.error||'Could not resend OTP');}}}
        onBack={() => setScreen('Signup')}
      />
    );
  }
 
  if (screen === 'Login') {
    return (
<LoginScreen
        loading={loading}
        onLogin={async (email, password) => {
          setLoading(true);
          try {
            const res = await loginUser(email, password);
            const {accessToken, user} = res.data;
            if(user.role === 'Surveyor' && browserFieldworkEnabled()) {
              const tokenExpiry = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp * 1000;
              // The offline window is independent of the 1-hour API token: sync pauses at token expiry, local work continues.
              try {
                const vault = await establishFieldwork({id:user.id,email:user.email,name:user.displayName,role:user.role,token:accessToken,tokenExpires:tokenExpiry,expires:Date.now()+OFFLINE_WINDOW_MS},password);
                if(vault === 'rekey-required') alert('Your password has changed. Device fieldwork saved under your previous password is kept safely. Open Fieldwork / Sync and enter your previous password once to unlock it.');
              }
              catch(error:any) {alert('Online sign-in succeeded. Offline workspace: '+error.message);}
            } else lockFieldwork();


            setAuthToken(accessToken);
            setAuthState('authenticated');
       setCurrentUser({name: user.displayName, role: user.role, id: user.id, email: user.email, companyName: user.companyName});
            setClientSection('Dashboard'); setClientRequestedProjectId('');
 
            if (user.role === 'Admin' || user.role === 'Manager') {
              try {
                const optionsRes = await getAssignmentOptions();
                setApprovedUsers(optionsRes.data);
              } catch (err) {
                console.error('Could not load assignment options', err);
              }
            } else {
              setApprovedUsers([]);
            }
 
            setScreen('Dashboard');
          } catch (err: any) {
            const data = err?.response?.data;
            if(!err?.response && browserFieldworkEnabled()) {
              try {
                const saved = await unlockFieldwork(email,password);
                setAuthToken(saved.token);
                setAuthState('authenticated');
                setSessionProfile({id:saved.id,email:saved.email,displayName:saved.name,role:saved.role,approvalStatus:'Approved'});
                setCurrentUser({id:saved.id,email:saved.email,name:saved.name,role:saved.role});
                setScreen('Dashboard');
                alert('Offline workspace unlocked. Use Fieldwork / Sync to open your downloaded projects.');
              } catch(offlineError:any) {alert(offlineError.message);}
            } else { alert(data?.error || data?.message || 'Login failed'); }

          } finally {
            setLoading(false);
          }
        }}
        onGoToSignup={openRegistration}
        onForgotPassword={() => setScreen('ForgotPassword')}
        onBackToHome={() => setScreen('Landing')}
      />
    );
  }
 
  if (currentUser?.role.toLowerCase() === 'client' && screen !== 'Signup') {
    const navigateClient = (key: string) => {if (['Dashboard', 'Projects', 'Defects', 'Reports', 'Notifications', 'Progress', 'QcStatus', 'Profile'].includes(key)) {setClientRequestedProjectId(''); setClientSection(key as ClientSection);}};
    const clientLogout = () => {setSettingsOpen(false); setAuthToken(null); setCurrentUser(null); setAuthState('unauthenticated'); setClientRequestedProjectId(''); setClientSection('Dashboard'); setScreen('Landing');};
    const notificationBell = (compact?: boolean, row?: boolean) => <NotificationBell role="Client" compact={compact} row={row} userKey={`Client:${currentUser.id || currentUser.name}`} refreshKey={clientSection} onSelect={n => {if (n.target?.kind === 'clientProject') {setClientRequestedProjectId(n.target.projectId);}}} />;
    const notification = notificationBell();
    return <View nativeID={themeMode === "dark" ? "ex-workspace-dark" : "ex-workspace"} style={[styles.appShell, isMobile && styles.appShellMobile, isMobile && {height: '100vh' as any}]}>
      {!isMobile && <Sidebar settingsOpen={settingsOpen} active={clientSection} userRole="Client" onNavigate={navigateClient} onLogout={clientLogout} onSettings={() => setSettingsOpen(true)} />}
<View nativeID="ex-main" style={styles.mainContent}>
<ClientWorkspace userName={currentUser.name} userKey={`Client:${currentUser.id || currentUser.name}`} section={clientSection} onNavigate={next => navigateClient(next)} showNavigation={isMobile} showNotificationBell={false} accessory={notification} onLogout={clientLogout} onProfileUpdated={p => setCurrentUser(u => u && (!u.id || u.id === p.id) ? {...u, name: p.displayName, email: p.email} : u)} profile={currentUser} requestedProjectId={clientRequestedProjectId} />
</View>
      {settingsOpen && <AppearanceSettings onClose={() => setSettingsOpen(false)} onProfileUpdated={p => setCurrentUser(u => u && (!u.id || u.id === p.id) ? {...u, name: p.displayName, email: p.email} : u)} onSessionEnd={clientLogout} />}
</View>;
  }
 
  if (
    screen === 'Dashboard' ||
    screen === 'Projects' ||
    screen === 'Reports' ||
    screen === 'UserManagement' ||
    screen === 'SurveyorProjectDetails' ||
    screen === 'SurveyorAreaDetails' ||
    screen === 'QcProjectDetails' ||
    screen === 'QcProjects' ||
    screen === 'SurveyorEquipmentDetails' ||
    screen === 'EquipmentInspection' ||
    screen === 'SurveyorInspection' ||
    screen === 'QcPending' ||
    screen === 'ManagerQcReview' ||
    screen === 'InspectionActivities' ||
    screen === 'InspectionActivityDetail' ||
    screen === 'EquipmentIdentification' ||
    screen === 'DefectRegister' ||
    screen === 'ChecklistAdmin' ||
    screen === 'InspectionPlanning' ||
    screen === 'AdminEquipmentList' ||
    screen === 'EquipmentDocuments' ||
    screen === 'ProjectDetails' ||
    screen === 'EditProject'
  ) {
    if (!currentUser) {
      setScreen('Landing');
      return null;
    }
    const logout = async () => {
      try {const pending=await pendingOperations();if(pending.length&&!window.confirm(`${pending.length} changes are not synchronized. Sign out and lock the device copy? Do not clear browser data.`))return;}catch{}
      lockFieldwork();
      setSettingsOpen(false);
      if (!canNavigate()) return;
      setAuthToken(null);
      setCurrentUser(null); setAuthState('unauthenticated');
      setApprovedUsers([]);
      setSelectedProjectId('');
      setSelectedAreaId('');
      setSelectedEquipmentId('');
      setQcProjectId('');
      setQcProjectSummary(null);
      setActiveScreen('Landing');
    };
    const canManageUsers =
      currentUser.role === 'Admin' || currentUser.role === 'Manager';
    const qcWorkspace = currentUser.role.toLowerCase() === 'qc';
    const surveyorWorkspace = currentUser.role.toLowerCase() === 'surveyor';
    const surveyorHome = surveyorWorkspace && screen === 'Dashboard';
    const surveyorProjects = surveyorWorkspace && screen === 'Projects';
    const haerWorkspace = screen === 'AdminEquipmentList' && (canManageUsers || surveyorWorkspace);
    const scanWorkspace = screen === 'EquipmentIdentification' && canManageUsers;
    const planningWorkspace = screen === 'InspectionPlanning' && canManageUsers;
    const defectsWorkspace = screen === 'DefectRegister' && (canManageUsers || qcWorkspace);
    const viewingProject = screen === 'ProjectDetails' && (canManageUsers || qcWorkspace);
    const editingProject = screen === 'EditProject' && canManageUsers;
    const reviewedWorkspace = (screen === 'ManagerQcReview' || screen === 'QcPending') && canManageUsers;
    const usersWorkspace = screen === 'UserManagement' && canManageUsers;
    const reportsWorkspace = screen === 'Reports' && canManageUsers;
    const checklistWorkspace = screen === 'ChecklistAdmin' && (canManageUsers || qcWorkspace);
    const openSurveyorDashboardProject = (projectId: string) => {
      if (!setScreen('SurveyorProjectDetails')) return;
      setProjectDetailsReturnScreen(surveyorProjects ? 'Projects' : 'Dashboard');
      setSelectedProjectId(projectId);
      setSelectedAreaId('');
    };
    // Admin / Manager phone layout: brand header on the dashboard + bottom tab bar.
    const adminMobile = isMobile && canManageUsers;
    const tc = themeMode === 'dark' ? DARK : LIGHT;
    const activeTab: AppTab =
      screen === 'QcPending' || (screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending')
        ? 'QCPending'
        : screen === 'ChecklistAdmin' ? 'Checklists'
        : screen === 'Reports' ? 'Reports'
        : screen === 'ManagerQcReview'
        ? 'QCReview'
        : screen === 'Dashboard'
        ? 'Home'
        : screen === 'Projects' || screen === 'ProjectDetails' || screen === 'EditProject'
          ? 'Surveys'
          : screen === 'AdminEquipmentList' || String(screen)==='EquipmentDocuments'
            ? 'Equipment'
            : 'User'; // UserManagement
    const onTabChange = (tab: AppTab) => {
      setSelectedProjectId('');
      setSelectedAreaId('');
      setSelectedEquipmentId('');
      setScreen(
        tab === 'Checklists' ? 'ChecklistAdmin'
          : tab === 'Reports' ? 'Reports'
          : tab === 'QCPending'
          ? 'QcPending'
          : tab === 'QCReview'
          ? 'ManagerQcReview'
          : tab === 'Home'
          ? 'Dashboard'
          : tab === 'Surveys'
            ? 'Projects'
            : tab === 'Equipment'
              ? 'AdminEquipmentList'
              : 'UserManagement',
      );
    };
    const SECTION_TITLES: Record<AppTab, string> = {
      Home: 'Home',
      Surveys: 'Surveys',
      Equipment: 'HAER',
      Reports: 'Reports',
      Checklists: 'Checklists',
      QCPending: 'QC Pending',
      QCReview: 'QC Reviewed List',
      User: 'User Management',
    };
    const openNotification = (notification: AppNotification) => {
      const target = notification.target;
      if (!target || !canNavigate()) return;
      if (target.kind === 'qcProject') {
        setQcProjectId(target.projectId);
        setQcProjectSummary(target.summary || null);
        setQcProjectReturnScreen('Dashboard');
        setActiveScreen('QcProjectDetails');
      } else if (target.kind === 'project') {
        if (!canManageUsers) return;
        setSelectedProjectId(target.projectId);
        setActiveScreen('ProjectDetails');
      } else if (target.kind === 'users') {
        if (canManageUsers) {setUserFocus({userId:target.userId,roleRequestId:target.roleRequestId});setActiveScreen('UserManagement');}
      } else if (target.kind === 'surveyorProject') {
        setProjectDetailsReturnScreen('Dashboard');
        setSelectedProjectId(target.projectId);
        setSelectedAreaId('');
        setActiveScreen('SurveyorProjectDetails');
      } else if (target.kind === 'surveyorEquipment') {
        setProjectDetailsReturnScreen('Dashboard');
        setSelectedProjectId(target.projectId);
        setSelectedAreaId(target.areaId);
        setSelectedEquipmentId(target.equipmentId);
        setActiveScreen('SurveyorEquipmentDetails');
      } else if (target.kind === 'inspectionActivity') {
        setSelectedActivityId(target.activityId);
        setScreen('InspectionActivityDetail');
      }
    };
    const bell = (compact?: boolean, row?: boolean) => (
<NotificationBell
        row={row}
        role={currentUser.role}
        userKey={`${currentUser.role}:${currentUser.name}`}
        refreshKey={screen}
        onSelect={openNotification}
        compact={compact}
      />
    );
 
    return (
<View nativeID={themeMode === "dark" ? "ex-workspace-dark" : "ex-workspace"}
        style={[
          styles.appShell,
          isMobile && styles.appShellMobile,
     adminMobile && {backgroundColor: tc.bg},
        ]}>
        {adminMobile && screen !== 'Dashboard' ? (
<View style={[styles.adminTopBar, {backgroundColor: tc.bg, borderBottomColor: tc.border}]}>
<MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} />
<View style={styles.adminTopTitleWrap}>
<Text numberOfLines={1} style={[styles.adminTopTitle, {color: tc.text}]}>{screen === 'InspectionPlanning' ? 'Inspection Planning' : SECTION_TITLES[activeTab]}</Text>
<Text numberOfLines={1} style={[styles.adminTopSub, {color: tc.muted}]}>Ex-Survey</Text>
</View>
            {canManageUsers ? <TouchableOpacity accessibilityRole="button" onPress={() => setScreen('InspectionPlanning')} style={{paddingHorizontal:9,paddingVertical:7,backgroundColor:screen==='InspectionPlanning'?'#f0c15a':'#fff',borderRadius:7}}><Text style={{fontWeight:'700',color:'#30344a'}}>Planning</Text></TouchableOpacity> : null}
            {bell(true)}
</View>
        ) : null}
        {adminMobile ? null : isMobile ? (
<View style={styles.mobileHeader}>
<View style={styles.mobileBrandRow}>
<View style={styles.mobileLogo}>
<Image source={ARIES_LOGO} style={styles.mobileLogoImage} resizeMode="contain" accessibilityLabel="Aries logo" />
</View>
<View style={styles.mobileIdentity}>
<Text style={styles.mobileBrand}>Ex-Survey</Text>
<Text style={styles.mobileRole}>{currentUser.role}</Text>
</View>
              {bell(true)}
<TouchableOpacity onPress={logout} style={styles.mobileLogout}>
<Text style={styles.mobileLogoutText}>Log out</Text>
</TouchableOpacity>
</View>
<View style={[styles.mobileNav, surveyorWorkspace && {flexWrap: 'wrap'}]}>
<TouchableOpacity
                onPress={() => setScreen('Dashboard')}
                style={[
                  styles.mobileNavItem,
                  screen === 'Dashboard' && styles.mobileNavItemActive,
                ]}>
<Text
                  style={[
                    styles.mobileNavText,
                    screen === 'Dashboard' && styles.mobileNavTextActive,
                  ]}>
                  Dashboard
</Text>
</TouchableOpacity>
<TouchableOpacity
                onPress={() =>
                  setScreen(
                    currentUser.role.toLowerCase() === 'qc'
                      ? 'QcProjects'
                      : 'Projects',
                  )
                }
                style={[
                  styles.mobileNavItem,
                  ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails', 'QcProjectDetails',
                  'SurveyorEquipmentDetails','EquipmentInspection','SurveyorInspection', 'QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavItemActive,
                ]}>
<Text
                  style={[
                    styles.mobileNavText,
                    ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails', 'QcProjectDetails',
                     'SurveyorEquipmentDetails', 'EquipmentInspection','SurveyorInspection','QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavTextActive,
                  ]}>
                  Projects
</Text>
</TouchableOpacity>
              {canManageUsers && (
<TouchableOpacity
                  onPress={() => setScreen('UserManagement')}
                  style={[
                    styles.mobileNavItem,
                    screen === 'UserManagement' && styles.mobileNavItemActive,
                  ]}>
<Text
                    style={[
                      styles.mobileNavText,
                      screen === 'UserManagement' &&
                        styles.mobileNavTextActive,
                    ]}>
                    Users
</Text>
</TouchableOpacity>
              )}
              {['qc','surveyor'].includes(currentUser.role.toLowerCase()) && (
<TouchableOpacity onPress={() => setScreen('InspectionPlanning')} style={[styles.mobileNavItem, screen === 'InspectionPlanning' && styles.mobileNavItemActive]}>
<Text style={[styles.mobileNavText, screen === 'InspectionPlanning' && styles.mobileNavTextActive]}>Planning</Text>
</TouchableOpacity>
              )}
              {currentUser.role.toLowerCase() === 'surveyor' && <TouchableOpacity onPress={() => setScreen('AdminEquipmentList')} style={[styles.mobileNavItem, screen === 'AdminEquipmentList' && styles.mobileNavItemActive]}>
                <Text style={[styles.mobileNavText, screen === 'AdminEquipmentList' && styles.mobileNavTextActive]}>HAER</Text>
              </TouchableOpacity>}
              {['admin','manager','qc','surveyor'].includes(currentUser.role.toLowerCase()) && <TouchableOpacity onPress={() => setScreen('ChecklistAdmin')} style={[styles.mobileNavItem, screen === 'ChecklistAdmin' && styles.mobileNavItemActive]}>
                <Text style={styles.mobileNavText}>Checklist</Text>
              </TouchableOpacity>}
              <TouchableOpacity onPress={() => setScreen('EquipmentIdentification')} style={[styles.mobileNavItem, String(screen)==='EquipmentIdentification'&&styles.mobileNavItemActive]}><Text style={[styles.mobileNavText,String(screen)==='EquipmentIdentification'&&styles.mobileNavTextActive]}>Scan</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{selected: settingsOpen}} onPress={() => setSettingsOpen(true)}
                style={[styles.mobileNavItem, settingsOpen && styles.mobileNavItemActive]}>
                <Text style={[styles.mobileNavText, settingsOpen && styles.mobileNavTextActive]}>⚙ Settings</Text>
              </TouchableOpacity>
</View>
</View>
        ) : (
<Sidebar
            active={
              screen === 'SurveyorProjectDetails' ||
              screen === 'SurveyorAreaDetails' ||
              screen === 'SurveyorEquipmentDetails' ||
              screen === 'EquipmentInspection' ||
              screen === 'SurveyorInspection'
                ? projectDetailsReturnScreen
                : screen === 'EditProject'
                  ? (editReturnScreen === 'Dashboard' ? 'Dashboard' : 'Projects')
                : screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending'
                  ? 'QcPending'
                : screen === 'ProjectDetails' || screen === 'QcProjects' || screen === 'QcProjectDetails'
                  ? 'Projects'
                : screen
            }
            userRole={currentUser.role}
            settingsOpen={settingsOpen}
            onSettings={() => setSettingsOpen(true)}
            qcPendingCount={qcPendingCount}
            workspaceColor={canManageUsers || surveyorWorkspace ? (themeMode === 'dark' ? OPERATIONS_DARK.bar : LIGHT.bar) : undefined}
            operationsStyle={qcWorkspace || surveyorWorkspace || haerWorkspace || scanWorkspace || planningWorkspace || defectsWorkspace || reportsWorkspace || checklistWorkspace || viewingProject || editingProject || reviewedWorkspace || usersWorkspace || screen === 'QcPending' || (canManageUsers && (screen === 'Dashboard' || screen === 'Projects'))}
            notification={viewingProject || !(canManageUsers || qcWorkspace || surveyorHome || surveyorProjects) ? bell(true, true) : undefined}
            onNavigate={key => {
              if (key === 'QcPending') {
                if (canManageUsers || currentUser.role.toLowerCase() === 'qc') setScreen('QcPending');
                return;
              }
              if (key === 'ManagerQcReview') {
                if (canManageUsers) setScreen('ManagerQcReview');
                return;
              }
              if (key === 'AdminEquipmentList' && (canManageUsers || currentUser.role.toLowerCase() === 'surveyor')) {setScreen('AdminEquipmentList'); return;}
              if (key === 'DefectRegister') {setScreen('DefectRegister'); return;}
              if (key === 'EquipmentIdentification') {setScreen('EquipmentIdentification'); return;}
              if (key === 'InspectionPlanning') {if (['admin','manager','qc','surveyor'].includes(currentUser.role.toLowerCase())) setScreen('InspectionPlanning'); return;}
              if (key === 'ChecklistAdmin') {if (['admin','manager','qc','surveyor'].includes(currentUser.role.toLowerCase())) setScreen('ChecklistAdmin'); return;}
              if (key === 'Dashboard' || key === 'Projects' || key === 'UserManagement' || key === 'Reports') {
                if (key === 'UserManagement' && !canManageUsers) return;
                if (key === 'Projects' && currentUser.role.toLowerCase() === 'qc') {
                  setScreen('QcProjects');
                  return;
                }
                if (!setScreen(key as Screen)) return;
                setSelectedProjectId('');
                setSelectedAreaId('');
                setSelectedEquipmentId('');
              }
            }}
            onLogout={logout}
          />
        )}
<View nativeID="ex-main" style={styles.mainContent}>
          {(canManageUsers || qcWorkspace || surveyorHome || surveyorProjects) && !viewingProject && !isMobile && <AdminWorkspaceHeader
            title={haerWorkspace ? 'HAER' : screen === 'Dashboard' ? 'Dashboard' : screen === 'InspectionPlanning' ? 'Planning' : screen === 'EquipmentIdentification' ? 'Scan equipment' : screen === 'DefectRegister' ? 'Defects' : screen === 'ChecklistAdmin' ? 'Checklists' : screen === 'UserManagement' ? 'User Management' : SECTION_TITLES[activeTab]}
            colors={(screen === 'Dashboard' || screen === 'Projects' || screen === 'QcProjects' || haerWorkspace || scanWorkspace || planningWorkspace || defectsWorkspace || reportsWorkspace || checklistWorkspace || reviewedWorkspace || usersWorkspace) && themeMode === 'dark' ? OPERATIONS_DARK : tc}
            showWelcome={!scanWorkspace && !planningWorkspace && !defectsWorkspace && !reportsWorkspace && !checklistWorkspace && !reviewedWorkspace && !usersWorkspace}
            profile={screen === 'Dashboard' || screen === 'Projects' || screen === 'QcProjects' || scanWorkspace || planningWorkspace || defectsWorkspace || reportsWorkspace || checklistWorkspace || reviewedWorkspace || usersWorkspace ? {name: currentUser.name, role: currentUser.role, onLogout: logout} : undefined}
            notification={bell(true)}
            onProject={surveyorHome || surveyorProjects ? openSurveyorDashboardProject : id => {if (!setScreen('ProjectDetails')) return; setSelectedProjectId(id); setSelectedAreaId(''); setSelectedEquipmentId('');}}
          />}
            {String(screen)==='EquipmentIdentification'?<ScanEquipmentScreen accountId={currentUser.email||currentUser.id||''} role={currentUser.role} online onBack={()=>setScreen('Dashboard')} onOpenInspection={(equipmentId,context)=>{setInspectionReturn('EquipmentIdentification');setInspectionContext(context);setSelectedEquipmentId(equipmentId);setScreen('InspectionActivities');}} onOpenOffline={()=>setScreen('Dashboard')} /> : String(screen) === 'InspectionPlanning' ? <InspectionPlanningScreen role={currentUser.role} onOpenInspection={equipmentId=>{setInspectionReturn('InspectionPlanning');setInspectionContext(undefined);setSelectedEquipmentId(equipmentId);setScreen('InspectionActivities');}} /> : String(screen) === 'ChecklistAdmin' ? (['admin','surveyor','qc'].includes(currentUser.role.toLowerCase()) ? <EquipmentCategoryChecklistScreen initialProject={checklistReturnToInspection?selectedProjectId:''} initialArea={checklistReturnToInspection?selectedAreaId:''} initialEquipment={checklistReturnToInspection?selectedEquipmentId:''} readOnly={currentUser.role.toLowerCase() === 'qc'} canManageCatalog={currentUser.role.toLowerCase() === 'admin'} onBack={checklistReturnToInspection?()=>{setChecklistReturnToInspection(false);setScreen(checklistReturnScreen);}:undefined} /> : <ChecklistAdminScreen role={currentUser.role} />) : String(screen) === 'DefectRegister' ? <DefectRegisterScreen role={currentUser.role} /> : screen === 'Reports' ? <ReportsScreen role={currentUser.role} /> : screen === 'QcPending' && (canManageUsers || currentUser.role.toLowerCase() === 'qc') ? (
<QcDashboardScreen pendingWorkspace userName={currentUser.name}
              onActivityPress={id => {setSelectedActivityId(id); setScreen('InspectionActivityDetail');}}
              onProjectPress={(id, project) => {
                setQcProjectId(id); setQcProjectSummary(project);
                setQcProjectReturnScreen('QcPending'); setScreen('QcProjectDetails');
              }} />
          ) : screen === 'ManagerQcReview' && canManageUsers ? (
<ManagerQcReviewScreen userRole={currentUser.role} onAssignmentsChanged={() => {
              getAssignmentOptions().then(res => setApprovedUsers(res.data)).catch(console.error);
            }} />
          ) : screen === 'Dashboard' && currentUser.role.toLowerCase() === 'qc' ? (
<QcDashboardScreen
              userName={currentUser.name}
              onActivityPress={id => {setSelectedActivityId(id); setScreen('InspectionActivityDetail');}}
              onProjectPress={(id, project) => {
                setQcProjectId(id);
                setQcProjectSummary(project);
                setQcProjectReturnScreen('Dashboard');
                setScreen('QcProjectDetails');
              }}
            />
          ) : screen === 'QcProjects' ? (
<ProjectsScreen userRole={currentUser.role} onProjectPress={id => {
                setSelectedProjectId(id); setScreen('ProjectDetails');
              }} />
          ) : screen === 'Dashboard' &&
          currentUser.role.toLowerCase() === 'surveyor' ? (
<SurveyorDashboardScreen
              userName={currentUser.name}
              refreshVersion={surveyorRefreshVersion}
              onProjectPress={openSurveyorDashboardProject}
              onFeedbackPress={feedback => {
                setSelectedProjectId(feedback.projectId);
                setSelectedAreaId(feedback.areaId);
                setSelectedEquipmentId(feedback.equipmentId);
                setScreen('SurveyorEquipmentDetails');
              }}
            />
          ) : screen === 'Dashboard' ? (
<DashboardScreen
              userName={currentUser.name}
              userRole={currentUser.role}
              workspace={canManageUsers}
              onViewProjects={() => setScreen('Projects')}
              onOpenProject={canManageUsers ? projectId => {
                if (!setScreen('ProjectDetails', 'Dashboard')) return;
                setSelectedProjectId(projectId); setSelectedAreaId(''); setSelectedEquipmentId('');
              } : undefined}
              onReports={canManageUsers ? () => setScreen('Reports') : undefined}
              onEditProject={projectId => {
                setEditReturnScreen('Dashboard'); setSelectedProjectId(projectId); setScreen('EditProject');
              }}
              showBrand={adminMobile}
              menuButton={adminMobile ? <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} /> : undefined}
              accessory={adminMobile ? bell(true) : undefined}
              surveyors={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
            />
          ) : screen === 'QcProjectDetails' && qcProjectId ? (
<QcProjectDetailsScreen
              projectId={qcProjectId}
              projectSummary={qcProjectSummary}
              onBack={() => setScreen(qcProjectReturnScreen)}
            />
          ) : screen === 'Projects' ? (
<ProjectsScreen
              userRole={currentUser.role}
              isSurveyor={currentUser.role.toLowerCase() === 'surveyor'}
              onEditProject={projectId => {setEditReturnScreen('Projects'); setSelectedProjectId(projectId); setScreen('EditProject');}}
              onProjectPress={canManageUsers ? projectId => {
                setSelectedProjectId(projectId);
                setScreen('ProjectDetails');
              } : undefined}
              onSurveyorProjectPress={projectId => {
                setProjectDetailsReturnScreen('Projects');
                setSelectedProjectId(projectId);
                setSelectedAreaId('');
                setScreen('SurveyorProjectDetails');
              }}
              surveyors={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
            />
          ) : (screen === 'ProjectDetails' || screen === 'EditProject') && selectedProjectId ? (
<ProjectDetailsScreen
              key={`${screen}:${selectedProjectId}`}
              userRole={currentUser.role}
              projectId={selectedProjectId}
              editOnly={screen === 'EditProject'}
              backLabel={adminProjectReturn === 'Dashboard' ? 'Back to dashboard' : undefined}
              onEdit={() => {setEditReturnScreen('ProjectDetails'); setScreen('EditProject');}}
              onBack={() => screen === 'EditProject' ? setActiveScreen(editReturnScreen) : setScreen(qcWorkspace ? 'QcProjects' : adminProjectReturn)}
              onQcReview={qcWorkspace ? () => {setQcProjectId(selectedProjectId); setQcProjectSummary(null); setQcProjectReturnScreen('QcProjects'); setScreen('QcProjectDetails');} : undefined}
              surveyors={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'surveyor').map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'qc').map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'client').map((u: any) => ({id: u.id, displayName: u.displayName, email: u.email, managerId: u.managerId, managerName: u.managerName}))}
            />
          ) : screen === 'SurveyorProjectDetails' && selectedProjectId ? (
<SurveyorProjectDetailsScreen
              projectId={selectedProjectId}
              refreshVersion={surveyorRefreshVersion}
              onBack={() => setScreen(projectDetailsReturnScreen)}
              onAreaPress={areaId => {
                setSelectedAreaId(areaId);
                setScreen('SurveyorAreaDetails');
              }}
                onEquipmentPress={(areaId, equipmentId) => {
                setSelectedAreaId(areaId);
                setSelectedEquipmentId(equipmentId);
                setScreen('SurveyorEquipmentDetails');
              }}
            />
          ) : screen === 'SurveyorAreaDetails' &&
            selectedProjectId &&
            selectedAreaId ? (
<SurveyorAreaDetailsScreen
              projectId={selectedProjectId}
              areaId={selectedAreaId}
              onBack={() => setScreen('SurveyorProjectDetails')}
              onEquipmentPress={equipmentId => {
                setSelectedEquipmentId(equipmentId);
                setScreen('SurveyorEquipmentDetails');
              }}
              onEquipmentAdded={() =>
                setSurveyorRefreshVersion(version => version + 1)
              }
            />
          ) : screen === 'SurveyorEquipmentDetails' &&
            selectedProjectId &&
            selectedAreaId &&
            selectedEquipmentId ? (
<SurveyorEquipmentDetailsScreen
              projectId={selectedProjectId}
              areaId={selectedAreaId}
              equipmentId={selectedEquipmentId}
              userRole={currentUser?.role}
              refreshVersion={surveyorRefreshVersion}
              onBack={() => setScreen('SurveyorAreaDetails')}
              onInspect={() => setScreen('EquipmentInspection')}
              onStartActivity={() => {setInspectionReturn('SurveyorEquipmentDetails');setInspectionContext(undefined);setScreen('InspectionActivities');}}
            />
          ) : String(screen) === 'InspectionActivities' && selectedEquipmentId ? (
<InspectionActivityScreen equipmentId={selectedEquipmentId} role={currentUser.role} equipmentContext={inspectionContext} backLabel={inspectionReturn==='EquipmentIdentification'?'Back to Equipment Identification':undefined} onBack={() => {setInspectionContext(undefined);setScreen(inspectionReturn as any);setInspectionReturn('SurveyorEquipmentDetails');}} />
          ) : String(screen) === 'InspectionActivityDetail' && selectedActivityId ? (
<InspectionActivityScreen activityId={selectedActivityId} role={currentUser.role} onBack={() => setScreen('QcPending')} />
          ) : (screen === 'EquipmentInspection' || screen === 'SurveyorInspection') && selectedEquipmentId ? (
<EquipmentInspectionScreen
              projectId={selectedProjectId}
              equipmentId={selectedEquipmentId}
              areaId={selectedAreaId}
              onModifyChecklist={() => {setChecklistReturnToInspection(true);setChecklistReturnScreen('EquipmentInspection');setScreen('ChecklistAdmin');}}
              onLegacy={() => {setInspectionReturn('SurveyorEquipmentDetails');setInspectionContext(undefined);setScreen('InspectionActivities');}}
              onBack={() => setScreen('SurveyorEquipmentDetails')}
              onSaved={() => setSurveyorRefreshVersion(version => version + 1)}
            />
          ) : String(screen) === 'AdminEquipmentList' ? (
<AdminEquipmentListScreen
              creationOnly={!canManageUsers}
              onEquipmentPress={projectId => {
                setSelectedProjectId(projectId);
                setProjectDetailsReturnScreen('AdminEquipmentList');
                setScreen(canManageUsers ? 'ProjectDetails' : 'SurveyorProjectDetails');
              }}
              onDocumentsPress={row=>{setSelectedProjectId(row.projectId);setSelectedAreaId(row.areaId);setSelectedEquipmentId(row.id);setScreen('EquipmentDocuments');}}
            />
          ) : String(screen) === 'EquipmentDocuments' && selectedProjectId && selectedAreaId && selectedEquipmentId ? (
<View style={{flex:1,padding:20,backgroundColor:'#fff'}}><TouchableOpacity accessibilityRole="button" onPress={()=>setScreen('AdminEquipmentList')} style={{alignSelf:'flex-start',padding:10}}><Text style={{color:'#334477',fontWeight:'700'}}>‹ Back to HAER</Text></TouchableOpacity><EquipmentReferenceDocumentsPanel projectId={selectedProjectId} areaId={selectedAreaId} equipmentId={selectedEquipmentId} role={currentUser?.role}/></View>
          ) : screen === 'UserManagement' ? (
<UserManagementScreen userRole={currentUser.role} focusUserId={userFocus.userId} focusRequestId={userFocus.roleRequestId} onBack={() => setScreen('Dashboard')} />
          ) : (
<DashboardScreen userName={currentUser.name} />
          )}
</View>
        {adminMobile ? (
<MobileDrawer
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            active={activeTab}
            onChange={onTabChange}
            onLogout={logout}
            c={tc}
            settingsOpen={settingsOpen}
            onSettings={() => setSettingsOpen(true)}
            showQc={canManageUsers}
            qcPendingCount={qcPendingCount}
          />
        ) : null}
        {settingsOpen && <AppearanceSettings onClose={() => setSettingsOpen(false)} onProfileUpdated={p => setCurrentUser(u => u && (!u.id || u.id === p.id) ? {...u, name: p.displayName, email: p.email} : u)} onSessionEnd={logout} />}
</View>
    );
  }
 
  return (
<SignupScreen
      loading={loading}
      onRegister={async data => {
        setLoading(true);
        try {
          await sendOtp(data.name, data.email, data.role);
          setPendingEmail(data.email);
          setPendingPassword(data.password);
          setScreen('Otp');
        } catch (err: any) {
          const errData = err?.response?.data;
          alert(errData?.error || errData?.message || 'Could not send OTP');
        } finally {
          setLoading(false);
        }
      }}
      onGoToLogin={() => setScreen('Login')}
      onBackToHome={() => setScreen('Landing')}
    />
  );
}
 
function makeStyles(c: Colors) {
  return StyleSheet.create({
  appShell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: c.bg,
  },
  appShellMobile: {flexDirection: 'column'},
  mainContent: {flex: 1, minWidth: 0},
  topBar: {height: 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, zIndex: 20},
  adminTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    ...({position: 'sticky', top: 0, zIndex: 30} as object),
  },
  adminTopTitleWrap: {flex: 1, minWidth: 0},
  adminTopTitle: {fontSize: 17, fontWeight: '800'},
  adminTopSub: {fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1, textTransform: 'uppercase'},
  mobileHeader: {
    backgroundColor: c.bar,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  mobileBrandRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileLogo: {
    width: 60,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileLogoImage: {width: '100%', height: '100%'},
  mobileIdentity: {flex: 1, marginLeft: 9},
  mobileBrand: {color: c.text, fontSize: 15, fontWeight: '800'},
  mobileRole: {color: c.secondary, fontSize: 10.5, marginTop: 1},
  mobileLogout: {paddingVertical: 9, paddingLeft: 14},
  mobileLogoutText: {color: c.amber, fontSize: 12.5, fontWeight: '800'},
  mobileNav: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  mobileNavItem: {
    minHeight: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mobileNavItemActive: {borderBottomColor: c.amber},
  mobileNavText: {fontSize: 12.5, fontWeight: '700', color: c.secondary},
  mobileNavTextActive: {color: c.amber},
});
}
