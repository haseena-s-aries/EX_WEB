// import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
// import ReportsScreen from '../screens/ReportsScreen';
// import useQcPendingCount from '../hooks/useQcPendingCount';
// import QcPendingBadge from '../components/QcPendingBadge';
// import React, {useMemo, useState} from 'react';
// import {
//   Alert,
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import {NavigationContainer} from '@react-navigation/native';
// import {createNativeStackNavigator} from '@react-navigation/native-stack';
// import SignupScreen from '../screens/SignupScreen';
// import OtpScreen from '../screens/OtpScreen';
// import LoginScreen from '../screens/LoginScreen';
// import DashboardScreen from '../screens/DashboardScreen';
// import SurveyorDashboardScreen from '../screens/SurveyorDashboardScreen';
// import SurveyorProjectDetailsScreen from '../screens/SurveyorProjectDetailsScreen';
// import SurveyorAreaDetailsScreen from '../screens/SurveyorAreaDetailsScreen';
// import SurveyorEquipmentDetailsScreen from '../screens/SurveyorEquipmentDetailsScreen';
// import SurveyorInspectionScreen from '../screens/SurveyorInspectionScreen';
// import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
// import {getAssignmentOptions} from '../api/projects';
// import {setAuthToken} from '../api/client';
// import QcDashboardScreen from '../screens/QcDashboardScreen';
// import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
// import MobileDrawer, {MenuButton, AppTab} from '../components/MobileDrawer';
// import {useThemeMode} from '../theme/useThemeMode';
// import {Colors, DARK, LIGHT} from '../theme/palette';
// const Stack = createNativeStackNavigator();

// export default function AppNavigator() {
//   const [loading, setLoading] = useState(false);
//   const [pendingPassword, setPendingPassword] = useState('');
//   const [currentUser, setCurrentUser] = useState<{
//     displayName: string;
//     role: string;
//   } | null>(null);
//   const [assignmentOptions, setAssignmentOptions] = useState<any[]>([]);
//   const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);

//   const [qcRefreshVersion, setQcRefreshVersion] = useState(0);
//   const [activeScreen, setActiveScreen] = useState('Login');
//   const qcPendingCount = useQcPendingCount(currentUser, activeScreen);
//   const themeMode = useThemeMode();
//   const tc = themeMode === 'dark' ? DARK : LIGHT;
//   const styles = useMemo(() => makeStyles(tc), [tc]);
//   const [menuOpen, setMenuOpen] = useState(false);

//   return (
//     <NavigationContainer onStateChange={state => {
//       const route = state?.routes[state.index ?? 0];
//       if (route) setActiveScreen(route.name);
//     }}>
//       <Stack.Navigator initialRouteName="Login" screenOptions={{headerShown: false}}>
//         <Stack.Screen name="Signup">
//           {({navigation}) => (
//             <SignupScreen
//               loading={loading}
//               onRegister={async data => {
//                 setLoading(true);
//                 try {
//                   await sendOtp(data.name, data.email, data.role);
//                   setPendingPassword(data.password);
//                   navigation.navigate('Otp', {email: data.email});
//                 } catch (err: any) {
//                   console.error(err?.response?.data || err.message);
//                   Alert.alert(
//                     'Error',
//                     err?.response?.data?.message || 'Could not send OTP',
//                   );
//                 } finally {
//                   setLoading(false);
//                 }
//               }}
//               onGoToLogin={() => navigation.navigate('Login')}
//             />
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="Otp">
//           {({navigation, route}: any) => (
//             <OtpScreen
//               email={route.params?.email ?? ''}
//               loading={loading}
//               onVerify={async otp => {
//                 setLoading(true);
//                 try {
//                   const email = route.params?.email ?? '';
//                   await verifyOtp(email, otp);
//                   await completeRegistration(email, pendingPassword);
//                   navigation.navigate('Login');
//                 } catch (err: any) {
//                   console.error(err?.response?.data || err.message);
//                   Alert.alert(
//                     'Error',
//                     err?.response?.data?.message || 'Invalid or expired OTP',
//                   );
//                 } finally {
//                   setLoading(false);
//                 }
//               }}
//               onResend={async () => {
//                 try {
//                   const email = route.params?.email ?? '';
//                   // resendOtp is already defined in api/auth.ts
//                   const {resendOtp} = await import('../api/auth');
//                   await resendOtp(email);
//                 } catch (err: any) {
//                   console.error(err?.response?.data || err.message);
//                 }
//               }}
//               onBack={() => navigation.goBack()}
//             />
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="Login">
//           {({navigation}) => (
//             <LoginScreen
//               loading={loading}
//               onLogin={async (email, password) => {
//                 setLoading(true);
//                 try {
//                   const res = await loginUser(email, password);
//                   const {accessToken, user} = res.data;
//                   setAuthToken(accessToken);
//                   setCurrentUser(user);

//                   if (user.role === 'Admin' || user.role === 'Manager') {
//                     try {
//                       const options = await getAssignmentOptions();
//                       setAssignmentOptions(options.data);
//                     } catch (optionsError: any) {
//                       console.error(
//                         optionsError?.response?.data || optionsError.message,
//                       );
//                       setAssignmentOptions([]);
//                     }
//                   } else {
//                     setAssignmentOptions([]);
//                   }

//                   navigation.reset({
//                     index: 0,
//                     routes: [{name: 'Dashboard'}],
//                   });
//                 } catch (err: any) {
//                   console.error(err?.response?.data || err.message);
//                   Alert.alert(
//                     'Error',
//                     err?.response?.data?.message || 'Login failed',
//                   );
//                 } finally {
//                   setLoading(false);
//                 }
//               }}
//               onGoToSignup={() => navigation.navigate('Signup')}
//             />
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="Dashboard">
//           {({navigation}) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               {(() => {
//                 const role = currentUser?.role || 'User';
//                 const isManagerial = role === 'Manager' || role === 'Admin';
//                 const isQc = role.toLowerCase() === 'qc';
//                 const tabs: AppTab[] = ['Home', 'Reports'];
//                 if (isManagerial || isQc) tabs.push('QCPending');
//                 if (isManagerial) tabs.push('QCReview');
//                 const logout = () => {
//                   setMenuOpen(false);
//                   setAuthToken(null);
//                   setCurrentUser(null);
//                   setAssignmentOptions([]);
//                   navigation.reset({index: 0, routes: [{name: 'Login'}]});
//                 };
//                 const menuButton = (
//                   <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={isManagerial || isQc ? qcPendingCount : 0} />
//                 );
//                 return (
//                   <>
//                     {isManagerial ? null : (
//                       <View style={styles.topBar}>
//                         {menuButton}
//                         <View style={styles.exBadge}><Text style={styles.exBadgeText}>Ex</Text></View>
//                         <View style={{flex: 1, minWidth: 0}}>
//                           <Text numberOfLines={1} style={styles.topTitle}>Ex-Survey</Text>
//                           <Text numberOfLines={1} style={styles.topSub}>{role}</Text>
//                         </View>
//                       </View>
//                     )}
//                     <MobileDrawer
//                       visible={menuOpen}
//                       onClose={() => setMenuOpen(false)}
//                       active="Home"
//                       onChange={tab => {
//                         if (tab === 'Reports') navigation.navigate('Reports');
//                         else if (tab === 'QCPending') navigation.navigate('QcPending');
//                         else if (tab === 'QCReview') navigation.navigate('ManagerQcReview');
//                       }}
//                       onLogout={logout}
//                       c={tc}
//                       userName={currentUser?.displayName || 'User'}
//                       userRole={role}
//                       showQc={isManagerial || isQc}
//                       qcPendingCount={qcPendingCount}
//                       tabs={tabs}
//                     />
//                   </>
//                 );
//               })()}
//               {currentUser?.role?.toLowerCase() === 'qc' ? (
//                 <QcDashboardScreen
//                   userName={currentUser.displayName || 'QC'}
//                   refreshVersion={qcRefreshVersion}
//                   onProjectPress={(projectId, projectSummary) =>
//                     navigation.navigate('QcProjectDetails', {projectId, projectSummary})
//                   }
//                 />
//               ) : currentUser?.role?.toLowerCase() === 'surveyor' ? (
//                <SurveyorDashboardScreen
//                   userName={currentUser.displayName || 'Surveyor'}
//                   refreshVersion={surveyorRefreshVersion}
//                   onProjectPress={projectId =>
//                     navigation.navigate('SurveyorProjectDetails', {projectId})
//                   }
//                   onFeedbackPress={feedback =>
//                     navigation.navigate('SurveyorEquipmentDetails', {
//                       projectId: feedback.projectId,
//                       areaId: feedback.areaId,
//                       equipmentId: feedback.equipmentId,
//                     })
//                   }
//                 />
//               ) : (
//                 <DashboardScreen
//                   showBrand
//                   menuButton={<MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={qcPendingCount} />}
//                   userRole={currentUser?.role}
//                   userName={currentUser?.displayName || 'User'}
//                   surveyors={assignmentOptions.filter(
//                     user => user.role === 'Surveyor',
//                   )}
//                   qcUsers={assignmentOptions.filter(
//                     user => user.role === 'Qc' || user.role === 'QC',
//                   )}
//                   clients={assignmentOptions.filter(
//                     user => user.role === 'Client',
//                   )}
//                 />
//               )}
//             </SafeAreaView>
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="Reports">
//           {({navigation}) => <SafeAreaView style={styles.dashboardShell}><ReportsScreen onBack={() => navigation.goBack()} /></SafeAreaView>}
//         </Stack.Screen>
//         {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin') && (
//           <Stack.Screen name="ManagerQcReview">
//             {({navigation}) => <SafeAreaView style={styles.dashboardShell}>
//               <ManagerQcReviewScreen userRole={currentUser.role} onBack={() => navigation.goBack()}
//                 onAssignmentsChanged={() => {getAssignmentOptions().then(res => setAssignmentOptions(res.data)).catch(console.error);}} />
//             </SafeAreaView>}
//           </Stack.Screen>
//         )}
//         {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin' || currentUser?.role?.toLowerCase() === 'qc') && (
//           <Stack.Screen name="QcPending">
//             {({navigation}) => <SafeAreaView style={styles.dashboardShell}>
//               <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
//               <QcDashboardScreen pendingWorkspace userName={currentUser.displayName} refreshVersion={qcRefreshVersion}
//                 onProjectPress={(projectId, projectSummary) => navigation.navigate('QcProjectDetails', {projectId, projectSummary})} />
//             </SafeAreaView>}
//           </Stack.Screen>
//         )}
//         <Stack.Screen name="QcProjectDetails">
//           {({navigation, route}: any) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               <QcProjectDetailsScreen
//                 projectId={route.params.projectId}
//                 projectSummary={route.params.projectSummary}
//                 onBack={() => {
//                   setQcRefreshVersion(version => version + 1);
//                   navigation.goBack();
//                 }}
//               />
//             </SafeAreaView>
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="SurveyorProjectDetails">
//           {({navigation, route}: any) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               <SurveyorProjectDetailsScreen
//                 projectId={route.params.projectId}
//                 refreshVersion={surveyorRefreshVersion}
//                 onBack={() => navigation.goBack()}
//                 onAreaPress={areaId =>
//                   navigation.navigate('SurveyorAreaDetails', {
//                     projectId: route.params.projectId,
//                     areaId,
//                   })
//                 }
//                 onEquipmentPress={(areaId, equipmentId) =>
//                   navigation.navigate('SurveyorEquipmentDetails', {
//                     projectId: route.params.projectId,
//                     areaId,
//                     equipmentId,
//                   })
//                 }
//               />
//             </SafeAreaView>
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="SurveyorAreaDetails">
//           {({navigation, route}: any) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               <SurveyorAreaDetailsScreen
//                 projectId={route.params.projectId}
//                 areaId={route.params.areaId}
//                 onBack={() => navigation.goBack()}
//                 onEquipmentPress={equipmentId =>
//                   navigation.navigate('SurveyorEquipmentDetails', {
//                     projectId: route.params.projectId,
//                     areaId: route.params.areaId,
//                     equipmentId,
//                   })
//                 }
//                 onEquipmentAdded={() =>
//                   setSurveyorRefreshVersion(version => version + 1)
//                 }
//               />
//             </SafeAreaView>
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="SurveyorEquipmentDetails">
//           {({navigation, route}: any) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               <SurveyorEquipmentDetailsScreen
//                 projectId={route.params.projectId}
//                 areaId={route.params.areaId}
//                 equipmentId={route.params.equipmentId}
//                 refreshVersion={surveyorRefreshVersion}
//                 onBack={() => navigation.goBack()}
//                 onInspect={() =>
//                   navigation.navigate('SurveyorInspection', {
//                     projectId: route.params.projectId,
//                     areaId: route.params.areaId,
//                     equipmentId: route.params.equipmentId,
//                   })
//                 }
//               />
//             </SafeAreaView>
//           )}
//         </Stack.Screen>

//         <Stack.Screen name="SurveyorInspection">
//           {({navigation, route}: any) => (
//             <SafeAreaView style={styles.dashboardShell}>
//               <SurveyorInspectionScreen
//                 equipmentId={route.params.equipmentId}
//                 inspectorName={currentUser?.displayName || 'Surveyor'}
//                 onBack={() => navigation.goBack()}
//                 onSaved={() =>
//                   setSurveyorRefreshVersion(version => version + 1)
//                 }
//               />
//             </SafeAreaView>
//           )}
//         </Stack.Screen>
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// function makeStyles(c: Colors) {
//   return StyleSheet.create({
//     dashboardShell: {flex: 1, backgroundColor: c.bg},
//     topBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       backgroundColor: c.bg,
//       borderBottomWidth: 1,
//       borderBottomColor: c.border,
//     },
//     exBadge: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center'},
//     exBadgeText: {color: '#000', fontSize: 17, fontWeight: '900', fontStyle: 'italic'},
//     topTitle: {color: c.text, fontSize: 17, fontWeight: '800'},
//     topSub: {color: c.muted, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1, textTransform: 'uppercase'},
//     backButton: {
//       alignSelf: 'flex-start',
//       minHeight: 36,
//       justifyContent: 'center',
//       marginHorizontal: 16,
//       marginTop: 10,
//       paddingHorizontal: 14,
//       borderWidth: 1,
//       borderColor: c.border,
//       borderRadius: 10,
//       backgroundColor: c.card,
//     },
//     backText: {fontSize: 13, fontWeight: '800', color: c.amber},
//   });
// }


import ClientWorkspace from '../screens/ClientWorkspace';
import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
import ReportsScreen from '../screens/ReportsScreen';
import useQcPendingCount from '../hooks/useQcPendingCount';
import QcPendingBadge from '../components/QcPendingBadge';
import React, {useMemo, useState} from 'react';
import {
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SignupScreen from '../screens/SignupScreen';
import OtpScreen from '../screens/OtpScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SurveyorDashboardScreen from '../screens/SurveyorDashboardScreen';
import SurveyorProjectDetailsScreen from '../screens/SurveyorProjectDetailsScreen';
import SurveyorAreaDetailsScreen from '../screens/SurveyorAreaDetailsScreen';
import SurveyorEquipmentDetailsScreen from '../screens/SurveyorEquipmentDetailsScreen';
import SurveyorInspectionScreen from '../screens/SurveyorInspectionScreen';
import InspectionActivityScreen from '../screens/InspectionActivityScreen';
import OfflineInspectionScreen from '../screens/OfflineInspectionScreen';
import ScanEquipmentScreen from '../screens/ScanEquipmentScreen';
import AdminEquipmentListScreen from '../screens/AdminEquipmentListScreen';
import EquipmentReferenceDocumentsPanel from '../components/EquipmentReferenceDocumentsPanel';
import {offlineStoreAvailable} from '../offline/offlineInspectionStore';
import {offlineInspectionService} from '../offline/offlineInspectionService';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';
import QcDashboardScreen from '../screens/QcDashboardScreen';
import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
import MobileDrawer, {MenuButton, AppTab} from '../components/MobileDrawer';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT} from '../theme/palette';
const Stack = createNativeStackNavigator();
 
export default function AppNavigator() {
  const [loading, setLoading] = useState(false);
  const [pendingPassword, setPendingPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    displayName: string;
    role: string;
       id?: string;
    email?: string;
    companyName?: string;
  } | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<any[]>([]);
  const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);
 
  const [qcRefreshVersion, setQcRefreshVersion] = useState(0);
  const [activeScreen, setActiveScreen] = useState('Login');
  const qcPendingCount = useQcPendingCount(currentUser, activeScreen);
  const themeMode = useThemeMode();
  const tc = themeMode === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const [menuOpen, setMenuOpen] = useState(false);
    const logout = (navigation: any) => {
    setAuthToken(null); setCurrentUser(null); setAssignmentOptions([]);
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };
 
  return (
<NavigationContainer onStateChange={state => {
      const route = state?.routes[state.index ?? 0];
      if (route) setActiveScreen(route.name);
    }}>
<Stack.Navigator initialRouteName="Login" screenOptions={{headerShown: false}}>
<Stack.Screen name="Signup">
          {({navigation}) => (
<SignupScreen
              loading={loading}
              onRegister={async data => {
                setLoading(true);
                try {
                  await sendOtp(data.name, data.email, data.role);
                  setPendingPassword(data.password);
                  navigation.navigate('Otp', {email: data.email});
                } catch (err: any) {
                  console.error(err?.response?.data || err.message);
                  Alert.alert(
                    'Error',
                    err?.response?.data?.message || 'Could not send OTP',
                  );
                } finally {
                  setLoading(false);
                }
              }}
              onGoToLogin={() => navigation.navigate('Login')}
            />
          )}
</Stack.Screen>
 
        <Stack.Screen name="Otp">
          {({navigation, route}: any) => (
<OtpScreen
              email={route.params?.email ?? ''}
              loading={loading}
              onVerify={async otp => {
                setLoading(true);
                try {
                  const email = route.params?.email ?? '';
                  await verifyOtp(email, otp);
                  await completeRegistration(email, pendingPassword);
                  navigation.navigate('Login');
                } catch (err: any) {
                  console.error(err?.response?.data || err.message);
                  Alert.alert(
                    'Error',
                    err?.response?.data?.message || 'Invalid or expired OTP',
                  );
                } finally {
                  setLoading(false);
                }
              }}
              onResend={async () => {
                try {
                  const email = route.params?.email ?? '';
                  // resendOtp is already defined in api/auth.ts
                  const {resendOtp} = await import('../api/auth');
                  await resendOtp(email);
                } catch (err: any) {
                  console.error(err?.response?.data || err.message);
                }
              }}
              onBack={() => navigation.goBack()}
            />
          )}
</Stack.Screen>
 
         <Stack.Screen name="Login">
          {({navigation}) => (
<LoginScreen
              loading={loading}
              onLogin={async (email, password) => {
                setLoading(true);
                try {
                  const res = await loginUser(email, password);
                  const {accessToken, user} = res.data;
                  setAuthToken(accessToken);
                  setCurrentUser(user);
                  if (offlineStoreAvailable && user.email) { try { await offlineInspectionService.saveCredential(user.email, user, accessToken,password); } catch { /* offline cache is optional during online sign-in */ } }
 
                  if (user.role === 'Admin' || user.role === 'Manager') {
                    try {
                      const options = await getAssignmentOptions();
                      setAssignmentOptions(options.data);
                    } catch (optionsError: any) {
                      console.error(
                        optionsError?.response?.data || optionsError.message,
                      );
                      setAssignmentOptions([]);
                    }
                  } else {
                    setAssignmentOptions([]);
                  }
 
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'Dashboard'}],
                  });
                } catch (err: any) {
                  console.error(err?.response?.data || err.message);
                  Alert.alert(
                    'Error',
                    err?.response?.data?.message || 'Login failed',
                  );
                } finally {
                  setLoading(false);
                }
              }}
              onGoToSignup={() => navigation.navigate('Signup')}
              onOfflineLogin={offlineStoreAvailable ? async (email,password) => {
                if (!email) { Alert.alert('Email needed','Enter the email from your last online sign-in to open its encrypted offline cache.'); return; }
                try { const session=await offlineInspectionService.loadCredential(email,password); if(!session){Alert.alert('Offline sign-in unavailable','Check your account password, reconnect to refresh your expired session, or ask an administrator to restore access.');return;} setAuthToken(session.token);setCurrentUser(session.user);navigation.reset({index:0,routes:[{name:'Dashboard'}]}); }
                catch { Alert.alert('Offline access unavailable','The encrypted offline session could not be opened. Sign in online.'); }
              } : undefined}
            />
          )}
</Stack.Screen>
 
        <Stack.Screen name="Dashboard">
          {({navigation}) => (
<SafeAreaView style={styles.dashboardShell}>
              {currentUser?.role?.toLowerCase() !== 'client' && <View style={styles.mobileHeader}>
<View>
<Text style={styles.brand}>Ex Survey</Text>
<Text style={styles.role}>{currentUser?.role || 'User'}</Text>
</View>
<TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => logout(navigation)}
                  style={styles.logoutButton}>
<Text style={styles.logoutText}>Log out</Text>
</TouchableOpacity>
</View>}
              {currentUser && currentUser.role.toLowerCase() !== 'client' && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Reports')} style={styles.logoutButton}><Text style={styles.logoutText}>Reports</Text></TouchableOpacity>}
              {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin') && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('EquipmentRegister')} style={styles.logoutButton}><Text style={styles.logoutText}>Equipment documents</Text></TouchableOpacity>}
              {currentUser && currentUser.role.toLowerCase() !== 'client' && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('EquipmentIdentification')} style={styles.logoutButton}><Text style={styles.logoutText}>Scan equipment</Text></TouchableOpacity>}
              {offlineStoreAvailable && currentUser?.role?.toLowerCase()==='surveyor' && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('OfflineInspections')} style={styles.logoutButton}><Text style={styles.logoutText}>Offline inspections</Text></TouchableOpacity>}
              {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin') && (
<TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('ManagerQcReview')} style={styles.logoutButton}>
<Text style={styles.logoutText}>QC Review</Text>
</TouchableOpacity>
              )}
              {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin' || currentUser?.role?.toLowerCase() === 'qc') && (
<TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('QcPending')} style={styles.logoutButton}>
<View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={styles.logoutText}>QC Pending</Text><QcPendingBadge count={qcPendingCount} /></View>
</TouchableOpacity>
              )}
              {currentUser?.role?.toLowerCase() === 'client' ? (<ClientWorkspace userName={currentUser.displayName} userKey={`Client:${currentUser.id || currentUser.displayName}`} showNavigation profile={currentUser} onLogout={() => logout(navigation)} />) : currentUser?.role?.toLowerCase() === 'qc' ? (
<QcDashboardScreen
                  userName={currentUser.displayName || 'QC'}
                  refreshVersion={qcRefreshVersion}
                  onActivityPress={activityId => navigation.navigate('InspectionActivityDetail', {activityId})}
                  onProjectPress={(projectId, projectSummary) =>
                    navigation.navigate('QcProjectDetails', {projectId, projectSummary})
                  }
                />
              ) : currentUser?.role?.toLowerCase() === 'surveyor' ? (
<SurveyorDashboardScreen
                  userName={currentUser.displayName || 'Surveyor'}
                  refreshVersion={surveyorRefreshVersion}
                  onProjectPress={projectId =>
                    navigation.navigate('SurveyorProjectDetails', {projectId})
                  }
                  onFeedbackPress={feedback =>
                    navigation.navigate('SurveyorEquipmentDetails', {
                      projectId: feedback.projectId,
                      areaId: feedback.areaId,
                      equipmentId: feedback.equipmentId,
                    })
                  }
                />
              ) : (
<DashboardScreen
                  userRole={currentUser?.role}
                  userName={currentUser?.displayName || 'User'}
                  surveyors={assignmentOptions.filter(
                    user => user.role === 'Surveyor',
                  )}
                  qcUsers={assignmentOptions.filter(
                    user => user.role === 'Qc' || user.role === 'QC',
                  )}
                  clients={assignmentOptions.filter(
                    user => user.role === 'Client',
                  )}
                />
              )}
</SafeAreaView>
          )}
</Stack.Screen>
        {offlineStoreAvailable && currentUser?.role?.toLowerCase()==='surveyor' && <Stack.Screen name="OfflineInspections">{({navigation})=><SafeAreaView style={styles.dashboardShell}><OfflineInspectionScreen accountId={currentUser.email||currentUser.id||''} onBack={()=>navigation.goBack()} /></SafeAreaView>}</Stack.Screen>}
        <Stack.Screen name="EquipmentIdentification">
          {({navigation}:any)=><SafeAreaView style={styles.dashboardShell}><ScanEquipmentScreen accountId={currentUser?.email||currentUser?.id||''} role={currentUser?.role||''} online={!!currentUser} onBack={()=>navigation.goBack()} onOpenInspection={equipmentId=>navigation.navigate('InspectionActivities',{equipmentId})} onOpenOffline={()=>navigation.navigate('OfflineInspections')} /></SafeAreaView>}
        </Stack.Screen>
        <Stack.Screen name="EquipmentRegister">
          {({navigation}: any) => <SafeAreaView style={styles.dashboardShell}><AdminEquipmentListScreen onEquipmentPress={projectId => navigation.navigate('ProjectDetails', {projectId})} onDocumentsPress={row=>navigation.navigate('EquipmentDocuments', {projectId:row.projectId,areaId:row.areaId,equipmentId:row.id})}/></SafeAreaView>}
        </Stack.Screen>
        <Stack.Screen name="EquipmentDocuments">
          {({navigation,route}:any) => <SafeAreaView style={styles.dashboardShell}><ScrollView contentContainerStyle={{padding:16}}><TouchableOpacity accessibilityRole="button" onPress={()=>navigation.goBack()} style={{padding:10}}><Text style={{color:'#334477',fontWeight:'700'}}>‹ Back to equipment register</Text></TouchableOpacity><EquipmentReferenceDocumentsPanel projectId={route.params.projectId} areaId={route.params.areaId} equipmentId={route.params.equipmentId} role={currentUser?.role}/></ScrollView></SafeAreaView>}
        </Stack.Screen>
 
        <Stack.Screen name="Reports">
          {({navigation}) => <SafeAreaView style={styles.dashboardShell}>{currentUser?.role?.toLowerCase() === 'client' ? <ClientWorkspace userName={currentUser.displayName} userKey={`Client:${currentUser.id || currentUser.displayName}`} section="Reports" showNavigation profile={currentUser} onLogout={() => logout(navigation)} /> : <ReportsScreen onBack={() => navigation.goBack()} />}</SafeAreaView>}
</Stack.Screen>
        {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin') && (
<Stack.Screen name="ManagerQcReview">
            {({navigation}) => <SafeAreaView style={styles.dashboardShell}>
<ManagerQcReviewScreen userRole={currentUser.role} onBack={() => navigation.goBack()}
                onAssignmentsChanged={() => {getAssignmentOptions().then(res => setAssignmentOptions(res.data)).catch(console.error);}} />
</SafeAreaView>}
</Stack.Screen>
        )}
        {(currentUser?.role === 'Manager' || currentUser?.role === 'Admin' || currentUser?.role?.toLowerCase() === 'qc') && (
<Stack.Screen name="QcPending">
            {({navigation}) => <SafeAreaView style={styles.dashboardShell}>
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.logoutButton}><Text style={styles.logoutText}>Back</Text></TouchableOpacity>
<QcDashboardScreen pendingWorkspace userName={currentUser.displayName} refreshVersion={qcRefreshVersion}
                onActivityPress={activityId => navigation.navigate('InspectionActivityDetail', {activityId})}
                onProjectPress={(projectId, projectSummary) => navigation.navigate('QcProjectDetails', {projectId, projectSummary})} />
</SafeAreaView>}
</Stack.Screen>
        )}
        <Stack.Screen name="InspectionActivityDetail">
          {({navigation, route}: any) => <SafeAreaView style={styles.dashboardShell}><InspectionActivityScreen activityId={route.params.activityId} role={currentUser?.role} onBack={() => {setQcRefreshVersion(v => v + 1); navigation.goBack();}} /></SafeAreaView>}
        </Stack.Screen>
<Stack.Screen name="QcProjectDetails">
          {({navigation, route}: any) => (
<SafeAreaView style={styles.dashboardShell}>
<QcProjectDetailsScreen
                projectId={route.params.projectId}
                projectSummary={route.params.projectSummary}
                onBack={() => {
                  setQcRefreshVersion(version => version + 1);
                  navigation.goBack();
                }}
              />
</SafeAreaView>
          )}
</Stack.Screen>
 
        <Stack.Screen name="SurveyorProjectDetails">
          {({navigation, route}: any) => (
<SafeAreaView style={styles.dashboardShell}>
<SurveyorProjectDetailsScreen
                projectId={route.params.projectId}
                refreshVersion={surveyorRefreshVersion}
                onBack={() => navigation.goBack()}
                onAreaPress={areaId =>
                  navigation.navigate('SurveyorAreaDetails', {
                    projectId: route.params.projectId,
                    areaId,
                  })
                }
                onEquipmentPress={(areaId, equipmentId) =>
                  navigation.navigate('SurveyorEquipmentDetails', {
                    projectId: route.params.projectId,
                    areaId,
                    equipmentId,
                  })
                }
              />
</SafeAreaView>
          )}
</Stack.Screen>
 
        <Stack.Screen name="SurveyorAreaDetails">
          {({navigation, route}: any) => (
<SafeAreaView style={styles.dashboardShell}>
<SurveyorAreaDetailsScreen
                projectId={route.params.projectId}
                areaId={route.params.areaId}
                onBack={() => navigation.goBack()}
                onEquipmentPress={equipmentId =>
                  navigation.navigate('SurveyorEquipmentDetails', {
                    projectId: route.params.projectId,
                    areaId: route.params.areaId,
                    equipmentId,
                  })
                }
                onEquipmentAdded={() =>
                  setSurveyorRefreshVersion(version => version + 1)
                }
              />
</SafeAreaView>
          )}
</Stack.Screen>
 
        <Stack.Screen name="SurveyorEquipmentDetails">
          {({navigation, route}: any) => (
<SafeAreaView style={styles.dashboardShell}>
<SurveyorEquipmentDetailsScreen
                projectId={route.params.projectId}
                areaId={route.params.areaId}
                equipmentId={route.params.equipmentId}
                userRole={currentUser?.role}
                refreshVersion={surveyorRefreshVersion}
                onBack={() => navigation.goBack()}
                onInspect={() =>
                  navigation.navigate('SurveyorInspection', {
                    projectId: route.params.projectId,
                    areaId: route.params.areaId,
                    equipmentId: route.params.equipmentId,
                  })
                }
                onStartActivity={() => navigation.navigate('InspectionActivities', {equipmentId: route.params.equipmentId})}
              />
</SafeAreaView>
          )}
</Stack.Screen>
 
        <Stack.Screen name="SurveyorInspection">
          {({navigation, route}: any) => (
<SafeAreaView style={styles.dashboardShell}>
<SurveyorInspectionScreen
                equipmentId={route.params.equipmentId}
                inspectorName={currentUser?.displayName || 'Surveyor'}
                onBack={() => navigation.goBack()}
                onSaved={() =>
                  setSurveyorRefreshVersion(version => version + 1)
                }
              />
</SafeAreaView>
          )}
</Stack.Screen>

        <Stack.Screen name="InspectionActivities">
          {({navigation, route}: any) => (
            <SafeAreaView style={styles.dashboardShell}>
              <InspectionActivityScreen equipmentId={route.params.equipmentId} role={currentUser?.role} onBack={() => navigation.goBack()} />
            </SafeAreaView>
          )}
        </Stack.Screen>
</Stack.Navigator>
</NavigationContainer>
  );
}
 
function makeStyles(c: Colors) {
  return StyleSheet.create({
    dashboardShell: {flex: 1, backgroundColor: c.bg},
    mobileHeader: {minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
    brand: {fontSize: 17, fontWeight: '800', color: c.text},
    role: {fontSize: 11, color: c.muted, marginTop: 1},
    exBadge: {width: 38, height: 38, borderRadius: 10, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center'},
    exBadgeText: {color: '#000', fontSize: 17, fontWeight: '900', fontStyle: 'italic'},
    topTitle: {color: c.text, fontSize: 17, fontWeight: '800'},
    topSub: {color: c.muted, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1, textTransform: 'uppercase'},
    logoutButton: {alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', marginHorizontal: 16, marginTop: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.card},
    logoutText: {fontSize: 13, fontWeight: '800', color: c.text},
  });
}
