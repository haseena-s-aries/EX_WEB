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
import ProjectsScreen from '../screens/ProjectsScreen';
import SurveyorDashboardScreen from '../screens/SurveyorDashboardScreen';
import SurveyorProjectDetailsScreen from '../screens/SurveyorProjectDetailsScreen';
import SurveyorAreaDetailsScreen from '../screens/SurveyorAreaDetailsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import Sidebar from '../components/Sidebar';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';

type Screen =
  | 'Signup'
  | 'Otp'
  | 'Login'
  | 'Dashboard'
  | 'Projects'
  | 'UserManagement'
  | 'SurveyorProjectDetails'
  | 'SurveyorAreaDetails';

export default function AppNavigator() {
  const {width} = useWindowDimensions();
  const isMobile = width < 768;
  const [screen, setScreen] = useState<Screen>('Login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{name: string; role: string} | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [projectDetailsReturnScreen, setProjectDetailsReturnScreen] = useState<'Dashboard' | 'Projects'>('Dashboard');

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
            alert(data?.error || data?.message || 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
        onGoToSignup={() => setScreen('Signup')}
      />
    );
  }

  if (
    screen === 'Dashboard' ||
    screen === 'Projects' ||
    screen === 'UserManagement' ||
    screen === 'SurveyorProjectDetails' ||
    screen === 'SurveyorAreaDetails'
  ) {
    if (!currentUser) {
      setScreen('Login');
      return null;
    }
    const logout = () => {
      setAuthToken(null);
      setCurrentUser(null);
      setApprovedUsers([]);
      setSelectedProjectId('');
      setSelectedAreaId('');
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
              <TouchableOpacity
                onPress={() => setScreen('Projects')}
                style={[
                  styles.mobileNavItem,
                  ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails'].includes(screen) && styles.mobileNavItemActive,
                ]}>
                <Text
                  style={[
                    styles.mobileNavText,
                    ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails'].includes(screen) && styles.mobileNavTextActive,
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
            </View>
          </View>
        ) : (
          <Sidebar
            active={
              screen === 'SurveyorProjectDetails' || screen === 'SurveyorAreaDetails'
                ? projectDetailsReturnScreen
                : screen
            }
            userName={currentUser.name}
            userRole={currentUser.role}
            onNavigate={key => {
              if (key === 'Dashboard' || key === 'Projects' || key === 'UserManagement') {
                setSelectedProjectId('');
                setSelectedAreaId('');
                setScreen(key as Screen);
              }
            }}
            onLogout={logout}
          />
        )}
        <View style={styles.mainContent}>
          {screen === 'Dashboard' &&
          currentUser.role.toLowerCase() === 'surveyor' ? (
            <SurveyorDashboardScreen
              userName={currentUser.name}
              onProjectPress={projectId => {
                setProjectDetailsReturnScreen('Dashboard');
                setSelectedProjectId(projectId);
                setSelectedAreaId('');
                setScreen('SurveyorProjectDetails');
              }}
            />
          ) : screen === 'Dashboard' ? (
            <DashboardScreen
              userName={currentUser.name}
              surveyors={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
            />
          ) : screen === 'Projects' ? (
            <ProjectsScreen
              isSurveyor={currentUser.role.toLowerCase() === 'surveyor'}
              onSurveyorProjectPress={projectId => {
                setProjectDetailsReturnScreen('Projects');
                setSelectedProjectId(projectId);
                setSelectedAreaId('');
                setScreen('SurveyorProjectDetails');
              }}
              surveyors={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
            />
          ) : screen === 'SurveyorProjectDetails' && selectedProjectId ? (
            <SurveyorProjectDetailsScreen
              projectId={selectedProjectId}
              onBack={() => setScreen(projectDetailsReturnScreen)}
              onAreaPress={areaId => {
                setSelectedAreaId(areaId);
                setScreen('SurveyorAreaDetails');
              }}
            />
          ) : screen === 'SurveyorAreaDetails' &&
            selectedProjectId &&
            selectedAreaId ? (
            <SurveyorAreaDetailsScreen
              projectId={selectedProjectId}
              areaId={selectedAreaId}
              onBack={() => setScreen('SurveyorProjectDetails')}
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
    backgroundColor: '#f7f9ff',
  },
  appShellMobile: {flexDirection: 'column'},
  mainContent: {flex: 1, minWidth: 0},
  mobileHeader: {
    backgroundColor: '#242d52',
    borderBottomWidth: 1,
    borderBottomColor: '#3e4974',
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
    backgroundColor: '#b8a5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLogoText: {color: '#242d52', fontSize: 12, fontWeight: '900'},
  mobileIdentity: {flex: 1, marginLeft: 9},
  mobileBrand: {color: '#fff', fontSize: 15, fontWeight: '800'},
  mobileRole: {color: '#c9cded', fontSize: 10.5, marginTop: 1},
  mobileLogout: {paddingVertical: 9, paddingLeft: 14},
  mobileLogoutText: {color: '#b8a5f8', fontSize: 12.5, fontWeight: '800'},
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
  mobileNavItemActive: {borderBottomColor: '#b8a5f8'},
  mobileNavText: {fontSize: 12.5, fontWeight: '700', color: '#c9cded'},
  mobileNavTextActive: {color: '#b8a5f8'},
});
