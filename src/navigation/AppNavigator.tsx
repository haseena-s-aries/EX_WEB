import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
import ReportsScreen from '../screens/ReportsScreen';
import useQcPendingCount from '../hooks/useQcPendingCount';
import QcPendingBadge from '../components/QcPendingBadge';
import React, {useState} from 'react';
import {
  Alert,
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
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';
import QcDashboardScreen from '../screens/QcDashboardScreen';
import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [loading, setLoading] = useState(false);
  const [pendingPassword, setPendingPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    displayName: string;
    role: string;
  } | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<any[]>([]);
  const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);

  const [qcRefreshVersion, setQcRefreshVersion] = useState(0);
  const [activeScreen, setActiveScreen] = useState('Login');
  const qcPendingCount = useQcPendingCount(currentUser, activeScreen);

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
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Dashboard">
          {({navigation}) => (
            <SafeAreaView style={styles.dashboardShell}>
              <View style={styles.mobileHeader}>
                <View>
                  <Text style={styles.brand}>Ex Survey</Text>
                  <Text style={styles.role}>{currentUser?.role || 'User'}</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setAuthToken(null);
                    setCurrentUser(null);
                    setAssignmentOptions([]);
                    navigation.reset({index: 0, routes: [{name: 'Login'}]});
                  }}
                  style={styles.logoutButton}>
                  <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
              </View>
              {currentUser && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Reports')} style={styles.logoutButton}><Text style={styles.logoutText}>Reports</Text></TouchableOpacity>}
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
              {currentUser?.role?.toLowerCase() === 'qc' ? (
                <QcDashboardScreen
                  userName={currentUser.displayName || 'QC'}
                  refreshVersion={qcRefreshVersion}
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

        <Stack.Screen name="Reports">
          {({navigation}) => <SafeAreaView style={styles.dashboardShell}><ReportsScreen onBack={() => navigation.goBack()} /></SafeAreaView>}
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
                onProjectPress={(projectId, projectSummary) => navigation.navigate('QcProjectDetails', {projectId, projectSummary})} />
            </SafeAreaView>}
          </Stack.Screen>
        )}
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
                refreshVersion={surveyorRefreshVersion}
                onBack={() => navigation.goBack()}
                onInspect={() =>
                  navigation.navigate('SurveyorInspection', {
                    projectId: route.params.projectId,
                    areaId: route.params.areaId,
                    equipmentId: route.params.equipmentId,
                  })
                }
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  dashboardShell: {flex: 1, backgroundColor: '#f7f9ff'},
  mobileHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#242d52',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3e4974',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {fontSize: 17, fontWeight: '800', color: '#fff'},
  role: {fontSize: 11, color: '#c9cded', marginTop: 1},
  logoutButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#485780',
    borderRadius: 8,
  },
  logoutText: {fontSize: 13, fontWeight: '800', color: '#b8a5f8'},
});
