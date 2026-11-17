import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AppNavigator from '../src/navigation/AppNavigator.web';
import {loginUser} from '../src/api/auth';
import {getQcDashboard} from '../src/api/projects';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => ({width: 1200, height: 800, scale: 1, fontScale: 1}),
}));

jest.mock('../src/api/auth', () => ({loginUser: jest.fn()}));
jest.mock('../src/api/projects', () => ({getAssignmentOptions: jest.fn().mockResolvedValue({data: []}), getQcDashboard: jest.fn().mockResolvedValue({data: {awaitingQcReview: 3}})}));
jest.mock('../src/api/client', () => ({__esModule: true, setAuthToken: jest.fn(), default: {interceptors: {response: {use: jest.fn(), eject: jest.fn()}}}}));
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'light'}));
jest.mock('../src/components/LandingPage.web', () => 'LandingPage');
jest.mock('../src/screens/LoginScreen', () => 'LoginScreen');
jest.mock('../src/screens/SignupScreen', () => 'SignupScreen');
jest.mock('../src/screens/OtpScreen', () => 'OtpScreen');
jest.mock('../src/screens/DashboardScreen', () => 'DashboardScreen');
jest.mock('../src/screens/ProjectsScreen', () => 'ProjectsScreen');
jest.mock('../src/screens/SurveyorDashboardScreen', () => 'SurveyorDashboardScreen');
jest.mock('../src/screens/SurveyorProjectDetailsScreen', () => 'SurveyorProjectDetailsScreen');
jest.mock('../src/screens/SurveyorAreaDetailsScreen', () => 'SurveyorAreaDetailsScreen');
jest.mock('../src/screens/SurveyorEquipmentDetailsScreen', () => 'SurveyorEquipmentDetailsScreen');
jest.mock('../src/screens/EquipmentInspectionScreen', () => 'EquipmentInspectionScreen');
jest.mock('../src/screens/InspectionActivityScreen', () => 'InspectionActivityScreen');
jest.mock('../src/screens/DefectRegisterScreen', () => 'DefectRegisterScreen');
jest.mock('../src/screens/UserManagementScreen', () => 'UserManagementScreen');
jest.mock('../src/screens/QcDashboardScreen', () => 'QcDashboardScreen');
jest.mock('../src/screens/QcProjectDetailsScreen', () => 'QcProjectDetailsScreen');
jest.mock('../src/screens/ProjectDetailsScreen', () => 'ProjectDetailsScreen');
jest.mock('../src/screens/AdminEquipmentListScreen', () => 'AdminEquipmentListScreen');
jest.mock('../src/screens/ManagerQcReviewScreen', () => 'ManagerQcReviewScreen');
jest.mock('../src/screens/ClientWorkspace', () => 'ClientWorkspace');
jest.mock('../src/screens/ReportsScreen', () => 'ReportsScreen');
jest.mock('../src/screens/EquipmentCategoryChecklistScreen', () => 'EquipmentCategoryChecklistScreen');
jest.mock('../src/screens/ScanEquipmentScreen.web', () => 'ScanEquipmentScreen');
jest.mock('../src/components/Sidebar', () => 'Sidebar');
jest.mock('../src/components/NotificationBell', () => 'NotificationBell');

test('QC Surveys and Checklists reuse shared modules while review navigation remains available', async () => {
  (loginUser as jest.Mock).mockResolvedValue({data: {accessToken: 'test', user: {id: 'qc-one', displayName: 'Reviewer', role: 'Qc'}}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AppNavigator />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('LandingPage' as any).props.onLogin();});
  await ReactTestRenderer.act(async () => {await renderer.root.findByType('LoginScreen' as any).props.onLogin('qc@test.invalid', 'fixture');});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate('Projects');});
  const list = renderer.root.findByType('ProjectsScreen' as any);
  expect(list.props.userRole).toBe('Qc');
  await ReactTestRenderer.act(async () => {list.props.onProjectPress('assigned-project');});
  const project = renderer.root.findByType('ProjectDetailsScreen' as any);
  expect(project.props.userRole).toBe('Qc');
  expect(project.props.projectId).toBe('assigned-project');
  await ReactTestRenderer.act(async () => {project.props.onQcReview();});
  expect(renderer.root.findByType('QcProjectDetailsScreen' as any).props.projectId).toBe('assigned-project');
  await ReactTestRenderer.act(async () => {renderer.root.findByType('QcProjectDetailsScreen' as any).props.onBack();});
  expect(renderer.root.findByType('ProjectsScreen' as any)).toBeDefined();
  await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate('ChecklistAdmin');});
  expect(renderer.root.findByType('EquipmentCategoryChecklistScreen' as any).props).toMatchObject({readOnly: true, canManageCatalog: false});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate('DefectRegister');});
  expect(renderer.root.findByType('DefectRegisterScreen' as any).props.role).toBe('Qc');
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test.each(['Manager', 'Admin', 'Qc'])('%s QC Pending opens the existing review screen and returns to pending', async role => {
  (loginUser as jest.Mock).mockResolvedValue({data: {accessToken: 'test', user: {displayName: 'Marcus', role}}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AppNavigator />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('LandingPage' as any).props.onLogin();});
  await ReactTestRenderer.act(async () => {await renderer.root.findByType('LoginScreen' as any).props.onLogin('user@test.invalid', 'test');});
  expect(renderer.root.findByType('Sidebar' as any).props.qcPendingCount).toBe(3);
  expect(getQcDashboard).toHaveBeenCalled();
  await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate('QcPending');});
  const dashboard = renderer.root.findByType('QcDashboardScreen' as any);
  expect(dashboard.props.pendingWorkspace).toBe(true);
  await ReactTestRenderer.act(async () => {dashboard.props.onProjectPress('project-1', {projectName: 'Vessel'});});
  const details = renderer.root.findByType('QcProjectDetailsScreen' as any);
  expect(details.props.projectId).toBe('project-1');
  expect(renderer.root.findByType('Sidebar' as any).props.active).toBe('QcPending');
  await ReactTestRenderer.act(async () => {details.props.onBack();});
  expect(renderer.root.findByType('QcDashboardScreen' as any).props.pendingWorkspace).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

test('Client uses its own workspace and navigation rather than technical management screens', async () => {
  (loginUser as jest.Mock).mockResolvedValue({data: {accessToken: 'test', user: {id: 'client-id', displayName: 'Client', role: 'Client'}}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AppNavigator />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('LandingPage' as any).props.onLogin();});
  await ReactTestRenderer.act(async () => {await renderer.root.findByType('LoginScreen' as any).props.onLogin('client@test.invalid', 'test');});
  expect(renderer.root.findByType('ClientWorkspace' as any).props.userKey).toBe('Client:client-id');
  for (const key of ['Projects', 'Defects', 'Reports', 'Notifications']) {
    await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate(key);});
    expect(renderer.root.findByType('ClientWorkspace' as any).props.section).toBe(key);
  }
  await ReactTestRenderer.act(async () => {renderer.root.findByType('Sidebar' as any).props.onNavigate('QcPending');});
  expect(renderer.root.findByType('ClientWorkspace' as any).props.section).toBe('Notifications');
  expect(renderer.root.findAllByType('DashboardScreen' as any)).toHaveLength(0);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('Admin opens a dedicated Edit Project route and returns to the dashboard', async () => {
  (loginUser as jest.Mock).mockResolvedValue({data: {accessToken: 'test', user: {displayName: 'Admin', role: 'Admin'}}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AppNavigator />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('LandingPage' as any).props.onLogin();});
  await ReactTestRenderer.act(async () => {await renderer.root.findByType('LoginScreen' as any).props.onLogin('admin@test.invalid', 'test');});
  await ReactTestRenderer.act(async () => {renderer.root.findByType('DashboardScreen' as any).props.onEditProject('project-1');});
  const editor = renderer.root.findByType('ProjectDetailsScreen' as any);
  expect(editor.props.editOnly).toBe(true);
  expect(editor.props.projectId).toBe('project-1');
  expect(renderer.root.findByType('Sidebar' as any).props).toMatchObject({operationsStyle: true, active: 'Dashboard'});
  expect(renderer.root.findAllByType('DashboardScreen' as any)).toHaveLength(0);
  await ReactTestRenderer.act(async () => {editor.props.onBack();});
  expect(renderer.root.findByType('DashboardScreen' as any)).toBeDefined();
  await ReactTestRenderer.act(async () => renderer.unmount());
});
