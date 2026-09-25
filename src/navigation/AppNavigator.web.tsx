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
import {View} from 'react-native';
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
    return (
      <View style={{flex: 1, flexDirection: 'row', minHeight: '100vh' as any}}>
        <Sidebar
          active={screen}
          userName={currentUser.name}
          userRole={currentUser.role}
          onNavigate={key => {
            if (key === 'Dashboard' || key === 'UserManagement') {
              setScreen(key as Screen);
            }
            // Projects / Reports are placeholders for now
          }}
          onLogout={() => {
            setAuthToken(null);
            setCurrentUser(null);
            setApprovedUsers([]);
            setScreen('Login');
          }}
        />
        <View style={{flex: 1}}>
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