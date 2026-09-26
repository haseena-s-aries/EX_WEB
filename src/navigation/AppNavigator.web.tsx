// import React, {useState} from 'react';
// import {View} from 'react-native';
// import SignupScreen from '../screens/SignupScreen';
// import OtpScreen from '../screens/OtpScreen';
// import LoginScreen from '../screens/LoginScreen';
// import DashboardScreen from '../screens/DashboardScreen';
// import UserManagementScreen from '../screens/UserManagementScreen';
// import Sidebar from '../components/Sidebar';
// // import {
// //   sendOtp,
// //   verifyOtp,
// //   completeRegistration,
// //   loginUser,
// //   getUsers,
// // } from '../api/auth';
// import {setAuthToken} from '../api/client';

// import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
// import {getAssignmentOptions} from '../api/projects';

// type Screen = 'Signup' | 'Otp' | 'Login' | 'Dashboard' | 'UserManagement';

// export default function AppNavigator() {
//   const [screen, setScreen] = useState<Screen>('Login');
//   const [pendingEmail, setPendingEmail] = useState('');
//   const [pendingPassword, setPendingPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [currentUser, setCurrentUser] = useState<{name: string; role: string} | null>(null);
//   const [approvedUsers, setApprovedUsers] = useState<any[]>([]);

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

//             try {
//               const usersRes = await getUsers('Approved');
//               setApprovedUsers(usersRes.data);
//             } catch (err) {
//               console.error('Could not load users for dropdowns', err);
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

//   if (screen === 'Dashboard' || screen === 'UserManagement') {
//     if (!currentUser) {
//       setScreen('Login');
//       return null;
//     }
//     return (
//       <View style={{flex: 1, flexDirection: 'row', minHeight: '100vh' as any}}>
//         <Sidebar
//           active={screen}
//           userName={currentUser.name}
//           userRole={currentUser.role}
//           onNavigate={key => {
//             if (key === 'Dashboard' || key === 'UserManagement') {
//               setScreen(key as Screen);
//             }
//             // Projects / Reports are placeholders for now
//           }}
//           onLogout={() => {
//             setAuthToken(null);
//             setCurrentUser(null);
//             setApprovedUsers([]);
//             setScreen('Login');
//           }}
//         />
//         <View style={{flex: 1}}>
//           {screen === 'Dashboard' ? (
//             <DashboardScreen
//               userName={currentUser.name}
//               surveyors={approvedUsers
//                 .filter((u: any) => u.role === 'Surveyor')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName}))}
//               qcUsers={approvedUsers
//                 .filter((u: any) => u.role === 'QC')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName}))}
//               clients={approvedUsers
//                 .filter((u: any) => u.role === 'Client')
//                 .map((u: any) => ({id: u.id, displayName: u.displayName}))}
//             />
//           ) : (
//             <UserManagementScreen onBack={() => setScreen('Dashboard')} />
//           )}
//         </View>
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


import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import SignupScreen from '../screens/SignupScreen';
import OtpScreen from '../screens/OtpScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import Sidebar from '../components/Sidebar';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';

type Screen = 'Signup' | 'Otp' | 'Login' | 'Dashboard' | 'UserManagement';

export default function AppNavigator() {
  const {width} = useWindowDimensions();
  const isMobile = width < 768;
  const [screen, setScreen] = useState<Screen>('Login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{name: string; role: string} | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);

  if (screen === 'Otp') {
    return (
      <OtpScreen
        email={pendingEmail}
        loading={loading}
        onVerify={async otp => {
          setLoading(true);
          try {
            await verifyOtp(pendingEmail, otp);
            await completeRegistration(pendingEmail, pendingPassword);
            setScreen('Login');
          } catch (err: any) {
            const data = err?.response?.data;
            alert(data?.error || data?.message || 'Invalid or expired OTP');
          } finally {
            setLoading(false);
          }
        }}
        onResend={() => console.log('Resend OTP to', pendingEmail)}
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
            setAuthToken(accessToken);
            setCurrentUser({name: user.displayName, role: user.role});

            try {
              const optionsRes = await getAssignmentOptions();
              setApprovedUsers(optionsRes.data);
            } catch (err) {
              console.error('Could not load assignment options', err);
            }

            setScreen('Dashboard');
          } catch (err: any) {
            const data = err?.response?.data;
            alert(data?.error || data?.message || 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
        onGoToSignup={() => setScreen('Signup')}
      />
    );
  }

  if (screen === 'Dashboard' || screen === 'UserManagement') {
    if (!currentUser) {
      setScreen('Login');
      return null;
    }
    const logout = () => {
      setAuthToken(null);
      setCurrentUser(null);
      setApprovedUsers([]);
      setScreen('Login');
    };
    const canManageUsers =
      currentUser.role === 'Admin' || currentUser.role === 'Manager';

    return (
      <View style={[styles.appShell, isMobile && styles.appShellMobile]}>
        {isMobile ? (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileBrandRow}>
              <View style={styles.mobileLogo}>
                <Text style={styles.mobileLogoText}>EX</Text>
              </View>
              <View style={styles.mobileIdentity}>
                <Text style={styles.mobileBrand}>Ex-Survey</Text>
                <Text style={styles.mobileRole}>{currentUser.role}</Text>
              </View>
              <TouchableOpacity onPress={logout} style={styles.mobileLogout}>
                <Text style={styles.mobileLogoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mobileNav}>
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
            </View>
          </View>
        ) : (
          <Sidebar
            active={screen}
            userName={currentUser.name}
            userRole={currentUser.role}
            onNavigate={key => {
              if (key === 'Dashboard' || key === 'UserManagement') {
                setScreen(key as Screen);
              }
            }}
            onLogout={logout}
          />
        )}
        <View style={styles.mainContent}>
          {screen === 'Dashboard' ? (
            <DashboardScreen
              userName={currentUser.name}
              surveyors={approvedUsers
                .filter((u: any) => u.role === 'Surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role === 'QC')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              clients={approvedUsers
                .filter((u: any) => u.role === 'Client')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
            />
          ) : (
            <UserManagementScreen onBack={() => setScreen('Dashboard')} />
          )}
        </View>
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
    />
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: '#f4f6fb',
  },
  appShellMobile: {flexDirection: 'column'},
  mainContent: {flex: 1, minWidth: 0},
  mobileHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e7f0',
  },
  mobileBrandRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#3f47d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLogoText: {color: '#fff', fontSize: 12, fontWeight: '800'},
  mobileIdentity: {flex: 1, marginLeft: 9},
  mobileBrand: {color: '#171a4b', fontSize: 15, fontWeight: '800'},
  mobileRole: {color: '#777d92', fontSize: 10.5, marginTop: 1},
  mobileLogout: {paddingVertical: 9, paddingLeft: 14},
  mobileLogoutText: {color: '#3f47d6', fontSize: 12.5, fontWeight: '700'},
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
  mobileNavItemActive: {borderBottomColor: '#3f47d6'},
  mobileNavText: {fontSize: 12.5, fontWeight: '700', color: '#777d92'},
  mobileNavTextActive: {color: '#3038bd'},
});
