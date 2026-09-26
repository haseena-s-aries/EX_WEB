// import React from 'react';
// import {NavigationContainer} from '@react-navigation/native';
// import {createNativeStackNavigator} from '@react-navigation/native-stack';
// import SignupScreen from '../screens/SignupScreen';
// import OtpScreen from '../screens/OtpScreen';
// import LoginScreen from '../screens/LoginScreen';

// const Stack = createNativeStackNavigator();

// export default function AppNavigator() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Signup" screenOptions={{headerShown: false}}>
//         <Stack.Screen name="Signup">
//           {({navigation}) => (
//             <SignupScreen
//               onRegister={data => {
//                 console.log('Register:', data);
//                 // TODO: call .NET register API here — backend sends the OTP email
//                 navigation.navigate('Otp', {email: data.email});
//               }}
//               onGoToLogin={() => navigation.navigate('Login')}
//             />
//           )}
//         </Stack.Screen>
//         <Stack.Screen name="Otp">
//           {({navigation, route}: any) => (
//             <OtpScreen
//               email={route.params?.email ?? ''}
//               onVerify={otp => {
//                 console.log('Verify OTP:', otp);
//                 // TODO: call .NET verify-otp API here
//                 navigation.navigate('Login');
//               }}
//               onResend={() => console.log('Resend OTP')}
//               onBack={() => navigation.goBack()}
//             />
//           )}
//         </Stack.Screen>
//         <Stack.Screen name="Login">
//           {({navigation}) => (
//             <LoginScreen
//               onLogin={(email, password) => {
//                 console.log('Login:', email, password);
//                 // TODO: call .NET login API here
//               }}
//               onGoToSignup={() => navigation.navigate('Signup')}
//             />
//           )}
//         </Stack.Screen>
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

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
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [loading, setLoading] = useState(false);
  const [pendingPassword, setPendingPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    displayName: string;
    role: string;
  } | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<any[]>([]);

  return (
    <NavigationContainer>
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
              {currentUser?.role?.toLowerCase() === 'surveyor' ? (
                <SurveyorDashboardScreen
                  userName={currentUser.displayName || 'Surveyor'}
                  onProjectPress={projectId =>
                    navigation.navigate('SurveyorProjectDetails', {projectId})
                  }
                />
              ) : (
                <DashboardScreen
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

        <Stack.Screen name="SurveyorProjectDetails">
          {({navigation, route}: any) => (
            <SafeAreaView style={styles.dashboardShell}>
              <SurveyorProjectDetailsScreen
                projectId={route.params.projectId}
                onBack={() => navigation.goBack()}
                onAreaPress={areaId =>
                  navigation.navigate('SurveyorAreaDetails', {
                    projectId: route.params.projectId,
                    areaId,
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
              />
            </SafeAreaView>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  dashboardShell: {flex: 1, backgroundColor: '#f4f6fb'},
  mobileHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e7f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {fontSize: 17, fontWeight: '800', color: '#171a4b'},
  role: {fontSize: 11, color: '#777d92', marginTop: 1},
  logoutButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d8dbea',
    borderRadius: 8,
  },
  logoutText: {fontSize: 13, fontWeight: '700', color: '#3f47d6'},
});
