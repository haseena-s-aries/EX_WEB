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
import {Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SignupScreen from '../screens/SignupScreen';
import OtpScreen from '../screens/OtpScreen';
import LoginScreen from '../screens/LoginScreen';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [loading, setLoading] = useState(false);
  // Holds the password temporarily between Signup -> OTP verify -> complete
  const [pendingPassword, setPendingPassword] = useState('');

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
                  console.log('Login success:', accessToken, user);
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}