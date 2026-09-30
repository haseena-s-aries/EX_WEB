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
import SurveyorEquipmentDetailsScreen from '../screens/SurveyorEquipmentDetailsScreen';
import SurveyorInspectionScreen from '../screens/SurveyorInspectionScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import QcDashboardScreen from '../screens/QcDashboardScreen';
import QcProjectDetailsScreen from '../screens/QcProjectDetailsScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
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
  | 'SurveyorAreaDetails'
  | 'QcProjectDetails'
  | 'QcProjects'
  | 'ProjectDetails'
  | 'SurveyorEquipmentDetails'
  | 'SurveyorInspection';

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
  const [qcProjectId, setQcProjectId] = useState('');
  const [qcProjectSummary, setQcProjectSummary] = useState<any>(null);
  const [qcProjectReturnScreen, setQcProjectReturnScreen] = useState<
    'Dashboard' | 'QcProjects'
  >('Dashboard');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [projectDetailsReturnScreen, setProjectDetailsReturnScreen] = useState<'Dashboard' | 'Projects'>('Dashboard');
  const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);
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
    screen === 'SurveyorAreaDetails' ||
    screen === 'QcProjectDetails' ||
    screen === 'QcProjects' ||
    screen === 'SurveyorEquipmentDetails' ||
    screen === 'SurveyorInspection' ||
    screen === 'ProjectDetails'
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
      setSelectedEquipmentId('');
      setQcProjectId('');
      setQcProjectSummary(null);
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
                  'SurveyorEquipmentDetails','SurveyorInspection', 'QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavItemActive,
                ]}>
                <Text
                  style={[
                    styles.mobileNavText,
                    ['Projects', 'SurveyorProjectDetails', 'SurveyorAreaDetails', 'QcProjectDetails',
                     'SurveyorEquipmentDetails', 'SurveyorInspection','QcProjects', 'ProjectDetails'].includes(screen) && styles.mobileNavTextActive,
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
              screen === 'SurveyorProjectDetails' ||
              screen === 'SurveyorAreaDetails' ||
              screen === 'SurveyorEquipmentDetails' ||
              screen === 'SurveyorInspection'
                ? projectDetailsReturnScreen
                : screen === 'ProjectDetails' || screen === 'QcProjects' || screen === 'QcProjectDetails'
                  ? 'Projects'
                : screen
            }
            userName={currentUser.name}
            userRole={currentUser.role}
            onNavigate={key => {
              if (key === 'Dashboard' || key === 'Projects' || key === 'UserManagement') {
                if (key === 'UserManagement' && !canManageUsers) return;
                if (key === 'Projects' && currentUser.role.toLowerCase() === 'qc') {
                  setScreen('QcProjects');
                  return;
                }
                setSelectedProjectId('');
                setSelectedAreaId('');
                 setSelectedEquipmentId('');
                setScreen(key as Screen);
              }
            }}
            onLogout={logout}
          />
        )}
        <View style={styles.mainContent}>
          {screen === 'Dashboard' && currentUser.role.toLowerCase() === 'qc' ? (
            <QcDashboardScreen
              userName={currentUser.name}
              onProjectPress={(id, project) => {
                setQcProjectId(id);
                setQcProjectSummary(project);
                setQcProjectReturnScreen('Dashboard');
                setScreen('QcProjectDetails');
              }}
            />
          ) : screen === 'QcProjects' ? (
            <QcDashboardScreen
              projectsOnly
              userName={currentUser.name}
              onProjectPress={(id, project) => {
                setQcProjectId(id);
                setQcProjectSummary(project);
                setQcProjectReturnScreen('QcProjects');
                setScreen('QcProjectDetails');
              }}
            />
          ) : screen === 'Dashboard' &&
          currentUser.role.toLowerCase() === 'surveyor' ? (
            <SurveyorDashboardScreen
              userName={currentUser.name}
              refreshVersion={surveyorRefreshVersion}
              onProjectPress={projectId => {
                setProjectDetailsReturnScreen('Dashboard');
                setSelectedProjectId(projectId);
                setSelectedAreaId('');
                setScreen('SurveyorProjectDetails');
              }}
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
          ) : screen === 'QcProjectDetails' && qcProjectId ? (
            <QcProjectDetailsScreen
              projectId={qcProjectId}
              projectSummary={qcProjectSummary}
              onBack={() => setScreen(qcProjectReturnScreen)}
            />
          ) : screen === 'Projects' ? (
            <ProjectsScreen
              isSurveyor={currentUser.role.toLowerCase() === 'surveyor'}
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
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName}))}
            />
          ) : screen === 'ProjectDetails' && selectedProjectId ? (
            <ProjectDetailsScreen
              projectId={selectedProjectId}
              onBack={() => setScreen('Projects')}
              surveyors={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'surveyor').map((u: any) => ({id: u.id, displayName: u.displayName}))}
              qcUsers={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'qc').map((u: any) => ({id: u.id, displayName: u.displayName}))}
              clients={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'client').map((u: any) => ({id: u.id, displayName: u.displayName}))}
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
              refreshVersion={surveyorRefreshVersion}
              onBack={() => setScreen('SurveyorAreaDetails')}
              onInspect={() => setScreen('SurveyorInspection')}
            />
          ) : screen === 'SurveyorInspection' && selectedEquipmentId ? (
            <SurveyorInspectionScreen
              equipmentId={selectedEquipmentId}
              inspectorName={currentUser.name || 'Surveyor'}
              onBack={() => setScreen('SurveyorEquipmentDetails')}
              onSaved={() =>
                setSurveyorRefreshVersion(version => version + 1)
              }
            />
          ) : screen === 'UserManagement' ? (
            <UserManagementScreen onBack={() => setScreen('Dashboard')} />
          ) : (
            <DashboardScreen userName={currentUser.name} />
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
