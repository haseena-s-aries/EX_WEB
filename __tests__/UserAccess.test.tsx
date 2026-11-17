import NotificationBell from '../src/components/NotificationBell';
import {buildNotifications} from '../src/notifications/notifications';
import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {TextInput,TouchableOpacity} from 'react-native';
import RoleChangePanel from '../src/components/RoleChangePanel';
import RoleRequestReview from '../src/components/RoleRequestReview';
import AccessDecisionDialog from '../src/components/AccessDecisionDialog';
import RegistrationConfirmationScreen from '../src/screens/RegistrationConfirmationScreen';
import UserManagementScreen from '../src/screens/UserManagementScreen';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
import {OPERATIONS_DARK} from '../src/theme/operationsPalette';
import * as access from '../src/api/userAccess';
import * as auth from '../src/api/auth';
import {getMyProfile} from '../src/api/account';
jest.mock('../src/notifications/notifications',()=>({buildNotifications:jest.fn(),loadReadIds:()=>new Set(),loadDismissedIds:()=>new Set(),saveReadIds:jest.fn(),saveDismissedIds:jest.fn()}));
jest.mock('../src/api/userAccess',()=>({readAccessNotice:jest.fn(),dismissAccessNotice:jest.fn(),getRoleRequests:jest.fn(),requestRoleChange:jest.fn(),getAllRoleRequests:jest.fn(),reviewRoleChange:jest.fn(),refreshUserAccess:jest.fn(),subscribeUserAccess:()=>()=>{},useUserAccessCounts:()=>({pendingRegistrations:1,pendingRoleChanges:2})}));
jest.mock('../src/api/account',()=>({getMyProfile:jest.fn()}));
jest.mock('../src/api/auth',()=>({getPendingApprovals:jest.fn(),getUsers:jest.fn(),approveUser:jest.fn(),rejectUser:jest.fn(),updateUserRole:jest.fn(),deleteUser:jest.fn()}));
let ui:Renderer.ReactTestRenderer;
const text=(n:Renderer.ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
const press=async(label:string)=>act(async()=>{ui.root.findAll(n=>typeof n.props.onPress==='function').find(n=>text(n)===label)!.props.onPress();});
beforeEach(()=>{jest.clearAllMocks();(getMyProfile as jest.Mock).mockResolvedValue({data:{role:'Surveyor'}});(access.getRoleRequests as jest.Mock).mockResolvedValue({data:[]});(access.requestRoleChange as jest.Mock).mockResolvedValue({data:{}});(access.getAllRoleRequests as jest.Mock).mockResolvedValue({data:[{id:'r',userId:'u',name:'Reviewer',email:'reviewer@example.test',currentRole:'Surveyor',requestedRole:'Qc',reason:'Qualified',status:'Pending',requestedAt:'2026-11-13T00:00:00Z'}]});(access.reviewRoleChange as jest.Mock).mockResolvedValue({data:{}});(auth.getPendingApprovals as jest.Mock).mockResolvedValue({data:[{id:'u',displayName:'Pending Person',email:'p@example.test',role:'Surveyor',registeredAt:'2026-11-13T00:00:00Z'}]});(auth.getUsers as jest.Mock).mockResolvedValue({data:[]});(auth.rejectUser as jest.Mock).mockResolvedValue({data:{}});});
afterEach(async()=>{await act(async()=>ui?.unmount());});
test('registration confirmation displays actual email, requested role and pending status',async()=>{
 const login=jest.fn();await act(async()=>{ui=Renderer.create(<RegistrationConfirmationScreen email="person@example.test" role="Qc" onLogin={login}/>);});
 expect(text(ui.root)).toContain('Registration Successful');expect(text(ui.root)).toContain('person@example.test');expect(text(ui.root)).toContain('Requested Role: Qc');expect(text(ui.root)).toContain('Pending Approval');await press('Back to Login');expect(login).toHaveBeenCalled();
});
test('settings submits a role request with a required reason and keeps the current role unchanged',async()=>{
 await act(async()=>{ui=Renderer.create(<RoleChangePanel colors={OPERATIONS_DARK}/>);});await press('Submit Request');expect(access.requestRoleChange).not.toHaveBeenCalled();
 await act(async()=>{ui.root.findByType(SearchableOptionPicker).props.onChange('Qc');ui.root.findByType(TextInput).props.onChangeText('Qualified to review');});await press('Submit Request');
 expect(access.requestRoleChange).toHaveBeenCalledWith('Qc','Qualified to review');expect(text(ui.root)).toContain('Current Role (read-only): Surveyor');expect(text(ui.root)).toContain('waiting for Admin approval');
});
test('a pending role request blocks duplicate submissions and shows request history',async()=>{
 (access.getRoleRequests as jest.Mock).mockResolvedValue({data:[{id:'r',currentRole:'Surveyor',requestedRole:'Qc',reason:'Qualified',status:'Pending',requestedAt:'2026-11-13T00:00:00Z'}]});
 await act(async()=>{ui=Renderer.create(<RoleChangePanel colors={OPERATIONS_DARK}/>);});expect(ui.root.findAllByType(TextInput)).toHaveLength(0);expect(text(ui.root)).toContain('already waiting for Admin approval');expect(text(ui.root)).toContain('Qualified');
});
test('Managers see pending registrations but no role request administration tab',async()=>{
 await act(async()=>{ui=Renderer.create(<UserManagementScreen userRole="Manager" onBack={jest.fn()}/>);});
 expect(text(ui.root)).toContain('Pending Registrations');expect(text(ui.root)).toContain('Pending Person');expect(text(ui.root)).toContain('Pending Approval');expect(text(ui.root)).not.toContain('Role Change Requests');
 const reject=ui.root.findAllByType(TouchableOpacity).find(n=>text(n)==='Reject')!;await act(async()=>reject.props.onPress());
 await act(async()=>ui.root.findByType(AccessDecisionDialog).props.onConfirm('Not eligible'));
 expect(auth.rejectUser).toHaveBeenCalledWith('u','Not eligible');expect(access.refreshUserAccess).toHaveBeenCalled();
});
test('Admin role request view sends the explicit rejection decision and reason',async()=>{
 await act(async()=>{ui=Renderer.create(<RoleRequestReview focusId="r"/>);});await press('Reject Role Change');
 await act(async()=>ui.root.findByType(AccessDecisionDialog).props.onConfirm('Keep current assignment'));
 expect(access.reviewRoleChange).toHaveBeenCalledWith('r','Rejected','Keep current assignment');expect(access.refreshUserAccess).toHaveBeenCalled();
});

test('notification bell persists registration reads and dismissal through own-user endpoints',async()=>{
 (buildNotifications as jest.Mock).mockResolvedValue([{id:'access:n',serverId:'n',type:'users',title:'New User Registration',message:'Awaiting approval',target:{kind:'users',userId:'u'}}]);
 (access.readAccessNotice as jest.Mock).mockResolvedValue({});(access.dismissAccessNotice as jest.Mock).mockResolvedValue({});
 const select=jest.fn();await act(async()=>{ui=Renderer.create(<NotificationBell role="Admin" userKey="Admin:own" onSelect={select}/>);});
 expect(ui.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Notifications, 1 unread')).toBe(true);
 await act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Notifications, 1 unread')!.props.onPress();});
 await act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>text(n).includes('New User Registration'))!.props.onPress();});
 expect(access.readAccessNotice).toHaveBeenCalledWith('n');expect(select).toHaveBeenCalledWith(expect.objectContaining({target:{kind:'users',userId:'u'}}));
 await act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Notifications')!.props.onPress();});
 await act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Remove notification')!.props.onPress();});
 expect(access.dismissAccessNotice).toHaveBeenCalledWith('n');
});
test('notification bell restores backend read state after refreshing the page',async()=>{
 (buildNotifications as jest.Mock).mockResolvedValue([{id:'access:n',serverId:'n',readAt:'2026-11-13T00:00:00Z',type:'users',title:'Read Registration',message:'Awaiting approval'}]);
 await act(async()=>{ui=Renderer.create(<NotificationBell role="Admin" userKey="Admin:fresh-device"/>);});
 expect(ui.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Notifications')).toBe(true);
 expect(ui.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Notifications, 1 unread')).toBe(false);
});
