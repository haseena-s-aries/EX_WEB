import ManagerQcReviewScreen from '../screens/ManagerQcReviewScreen';
import ReportsScreen from '../screens/ReportsScreen';
import useQcPendingCount from '../hooks/useQcPendingCount';
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
import NotificationBell from '../components/NotificationBell';
import type {AppNotification} from '../notifications/notifications';
import {sendOtp, verifyOtp, completeRegistration, loginUser} from '../api/auth';
import {getAssignmentOptions} from '../api/projects';
import {setAuthToken} from '../api/client';
import MobileDrawer, {MenuButton, AppTab} from '../components/MobileDrawer';
import AdminEquipmentListScreen from '../screens/AdminEquipmentListScreen';
import {useThemeMode} from '../theme/useThemeMode';
import {DARK, LIGHT} from '../theme/palette';

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
  | 'SurveyorInspection'
  | 'AdminEquipmentList'
  | 'ManagerQcReview'
  | 'Reports'
  | 'QcPending';

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
    'Dashboard' | 'QcProjects' | 'QcPending'
  >('Dashboard');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [projectDetailsReturnScreen, setProjectDetailsReturnScreen] = useState<'Dashboard' | 'Projects'>('Dashboard');
  const [surveyorRefreshVersion, setSurveyorRefreshVersion] = useState(0);
  const themeMode = useThemeMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const qcPendingCount = useQcPendingCount(currentUser, screen);
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
    screen === 'Reports' ||
    screen === 'UserManagement' ||
    screen === 'SurveyorProjectDetails' ||
    screen === 'SurveyorAreaDetails' ||
    screen === 'QcProjectDetails' ||
    screen === 'QcProjects' ||
    screen === 'SurveyorEquipmentDetails' ||
    screen === 'SurveyorInspection' ||
    screen === 'QcPending' ||
    screen === 'ManagerQcReview' ||
    screen === 'AdminEquipmentList' ||
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
    // Admin / Manager phone layout: brand header on the dashboard + bottom tab bar.
    const adminMobile = isMobile && canManageUsers;
    const tc = themeMode === 'dark' ? DARK : LIGHT;
    const activeTab: AppTab =
      screen === 'QcPending' || (screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending')
        ? 'QCPending'
        : screen === 'Reports' ? 'Reports'
        : screen === 'ManagerQcReview'
        ? 'QCReview'
        : screen === 'Dashboard'
        ? 'Home'
        : screen === 'Projects' || screen === 'ProjectDetails'
          ? 'Surveys'
          : screen === 'AdminEquipmentList'
            ? 'Equipment'
            : 'User'; // UserManagement
    const onTabChange = (tab: AppTab) => {
      setSelectedProjectId('');
      setSelectedAreaId('');
      setSelectedEquipmentId('');
      setScreen(
        tab === 'Reports' ? 'Reports'
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
      Equipment: 'Equipment',
      Reports: 'Reports',
      QCPending: 'QC Pending',
      QCReview: 'QC Review',
      User: 'User Management',
    };
    const openNotification = (notification: AppNotification) => {
      const target = notification.target;
      if (!target) return;
      if (target.kind === 'qcProject') {
        setQcProjectId(target.projectId);
        setQcProjectSummary(target.summary || null);
        setQcProjectReturnScreen('Dashboard');
        setScreen('QcProjectDetails');
      } else if (target.kind === 'project') {
        if (!canManageUsers) return;
        setSelectedProjectId(target.projectId);
        setScreen('ProjectDetails');
      } else if (target.kind === 'users') {
        if (canManageUsers) setScreen('UserManagement');
      } else if (target.kind === 'surveyorProject') {
        setProjectDetailsReturnScreen('Dashboard');
        setSelectedProjectId(target.projectId);
        setSelectedAreaId('');
        setScreen('SurveyorProjectDetails');
      } else if (target.kind === 'surveyorEquipment') {
        setProjectDetailsReturnScreen('Dashboard');
        setSelectedProjectId(target.projectId);
        setSelectedAreaId(target.areaId);
        setSelectedEquipmentId(target.equipmentId);
        setScreen('SurveyorEquipmentDetails');
      }
    };
    const bell = (compact?: boolean) => (
      <NotificationBell
        role={currentUser.role}
        userKey={`${currentUser.role}:${currentUser.name}`}
        refreshKey={screen}
        onSelect={openNotification}
        compact={compact}
      />
    );

    return (
      <View
        style={[
          styles.appShell,
          isMobile && styles.appShellMobile,
          adminMobile && {backgroundColor: tc.bg},
        ]}>
        {adminMobile && screen !== 'Dashboard' ? (
          <View style={[styles.adminTopBar, {backgroundColor: tc.bg, borderBottomColor: tc.border}]}>
            <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} />
            <View style={styles.adminTopTitleWrap}>
              <Text numberOfLines={1} style={[styles.adminTopTitle, {color: tc.text}]}>{SECTION_TITLES[activeTab]}</Text>
              <Text numberOfLines={1} style={[styles.adminTopSub, {color: tc.muted}]}>Ex-Survey</Text>
            </View>
            {bell(true)}
          </View>
        ) : null}
        {adminMobile ? null : isMobile ? (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileBrandRow}>
              <View style={styles.mobileLogo}>
                <Text style={styles.mobileLogoText}>EX</Text>
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
                : screen === 'QcProjectDetails' && qcProjectReturnScreen === 'QcPending'
                  ? 'QcPending'
                : screen === 'ProjectDetails' || screen === 'QcProjects' || screen === 'QcProjectDetails'
                  ? 'Projects'
                : screen
            }
            userName={currentUser.name}
            userRole={currentUser.role}
            qcPendingCount={qcPendingCount}
            onNavigate={key => {
              if (key === 'QcPending') {
                if (canManageUsers || currentUser.role.toLowerCase() === 'qc') setScreen('QcPending');
                return;
              }
              if (key === 'ManagerQcReview') {
                if (canManageUsers) setScreen('ManagerQcReview');
                return;
              }
              if (key === 'Dashboard' || key === 'Projects' || key === 'UserManagement' || key === 'Reports') {
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
          {!isMobile && <View style={styles.topBar}>{bell()}</View>}
          {screen === 'Reports' ? <ReportsScreen /> : screen === 'QcPending' && (canManageUsers || currentUser.role.toLowerCase() === 'qc') ? (
            <QcDashboardScreen pendingWorkspace userName={currentUser.name}
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
              userRole={currentUser.role}
              showBrand={adminMobile}
              menuButton={adminMobile ? <MenuButton c={tc} onPress={() => setMenuOpen(true)} badge={canManageUsers ? qcPendingCount : 0} /> : undefined}
              accessory={adminMobile ? bell(true) : undefined}
              surveyors={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'surveyor')
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
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
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'qc')
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers
                .filter((u: any) => u.role?.toLowerCase() === 'client')
                .map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
            />
          ) : screen === 'ProjectDetails' && selectedProjectId ? (
            <ProjectDetailsScreen
              userRole={currentUser.role}
              projectId={selectedProjectId}
              onBack={() => setScreen('Projects')}
              surveyors={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'surveyor').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              qcUsers={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'qc').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
              clients={approvedUsers.filter((u: any) => u.role?.toLowerCase() === 'client').map((u: any) => ({id: u.id, displayName: u.displayName, managerId: u.managerId, managerName: u.managerName}))}
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
          ) : screen === 'AdminEquipmentList' ? (
            <AdminEquipmentListScreen
              onEquipmentPress={projectId => {
                setSelectedProjectId(projectId);
                setScreen('ProjectDetails');
              }}
            />
          ) : screen === 'UserManagement' ? (
<UserManagementScreen onBack={() => setScreen('Dashboard')} />
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
            userName={currentUser.name}
            userRole={currentUser.role}
            showQc={canManageUsers}
            qcPendingCount={qcPendingCount}
          />
        ) : null}
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
  topBar: {height: 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#f7f9ff', borderBottomWidth: 1, borderBottomColor: '#e2e6f0', zIndex: 20},
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
