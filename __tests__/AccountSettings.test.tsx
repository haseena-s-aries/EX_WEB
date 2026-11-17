import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {TextInput} from 'react-native';
import AccountSettingsPanel from '../src/components/AccountSettingsPanel';
import AccountRecoveryScreen from '../src/screens/AccountRecoveryScreen';
import AccountAvatar from '../src/components/AccountAvatar';
import {setSessionProfile} from '../src/api/profileState';
import {parseAccountLink} from '../src/api/accountLink';
import * as api from '../src/api/account';
import {OPERATIONS_DARK} from '../src/theme/operationsPalette';

jest.mock('../src/components/ClientLogoUpload', () => 'ClientLogoUpload');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/api/account', () => ({getMyProfile:jest.fn(),updateMyProfile:jest.fn(),uploadProfilePhoto:jest.fn(),removeProfilePhoto:jest.fn(),requestEmailChange:jest.fn(),changeMyPassword:jest.fn(),forgotPassword:jest.fn(),requestPasswordCode:jest.fn(),resetPasswordWithCode:jest.fn(),resetPassword:jest.fn(),verifyEmail:jest.fn()}));
const profile = {id:'own',email:'qc@example.test',displayName:'Reviewer',role:'Qc',approvalStatus:'Approved',isActive:true,phoneNumber:'123',designation:'QC',canChangePassword:true,profilePhotoUrl:'/api/account/profile/photo?v=one'};
const text=(node:Renderer.ReactTestInstance):string=>node.children.map(c=>typeof c==='string'?c:text(c)).join('');
let ui:Renderer.ReactTestRenderer;
beforeEach(()=>{jest.clearAllMocks();(api.getMyProfile as jest.Mock).mockResolvedValue({data:profile});(api.updateMyProfile as jest.Mock).mockImplementation(data=>Promise.resolve({data:{...profile,...data}}));});
afterEach(async()=>{await act(async()=>{ui?.unmount();setSessionProfile(null);});jest.useRealTimers();});
const press=async(label:string)=>{await act(async()=>{ui.root.findAll(n=>n.props.accessibilityRole==='button'&&typeof n.props.onPress==='function').find(n=>text(n)===label)!.props.onPress();});};
const fill=async(label:string,value:string)=>{await act(async()=>{ui.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel===label)!.props.onChangeText(value);});};
test('profile fields cancel locally and save only permitted fields',async()=>{
  const changed=jest.fn();await act(async()=>{ui=Renderer.create(<AccountSettingsPanel section="My Profile" colors={OPERATIONS_DARK} onProfileUpdated={changed}/>);});
  await fill('Full Name','Unsaved');await press('Cancel');
  expect(ui.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel==='Full Name')!.props.value).toBe('Reviewer');
  expect(api.updateMyProfile).not.toHaveBeenCalled();
  await fill('Full Name','New Name');await fill('Phone Number','+971 50 111 2222');await press('Save Changes');
  expect(api.updateMyProfile).toHaveBeenCalledWith({displayName:'New Name',phoneNumber:'+971 50 111 2222',designation:'QC'});
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({id:'own',displayName:'New Name',role:'Qc'}));
  expect(text(ui.root)).toContain('User Role (read-only)');
  expect(text(ui.root)).toContain('Account Status (read-only)');
});
test('email changes require reauthentication and preserve the active login while pending',async()=>{
  (api.requestEmailChange as jest.Mock).mockResolvedValue({data:{...profile,pendingEmail:'new@example.test'}});
  await act(async()=>{ui=Renderer.create(<AccountSettingsPanel section="My Profile" colors={OPERATIONS_DARK}/>);});
  await fill('Email Address','new@example.test');await press('Save Changes');expect(api.requestEmailChange).not.toHaveBeenCalled();
  await fill('Current Password for Email Change','current-password');await press('Save Changes');
  expect(api.requestEmailChange).toHaveBeenCalledWith('new@example.test','current-password');
  expect(text(ui.root)).toContain('Current login: qc@example.test');
});
test('photo replacement is staged until Save and supports persistent removal',async()=>{
  (api.uploadProfilePhoto as jest.Mock).mockResolvedValue({data:{...profile,profilePhotoUrl:'/api/account/profile/photo?v=two'}});
  (api.removeProfilePhoto as jest.Mock).mockResolvedValue({data:{...profile,profilePhotoUrl:null}});
  await act(async()=>{ui=Renderer.create(<AccountSettingsPanel section="My Profile" colors={OPERATIONS_DARK}/>);});
  const file={name:'photo.png',type:'image/png',webFile:{size:20}};
  await act(async()=>{ui.root.findByType('ClientLogoUpload' as any).props.onChange(file);});expect(api.uploadProfilePhoto).not.toHaveBeenCalled();
  await press('Save Changes');expect(api.uploadProfilePhoto).toHaveBeenCalledWith(file);
  await press('Remove Profile Photo');expect(api.removeProfilePhoto).not.toHaveBeenCalled();
  await press('Save Changes');expect(api.removeProfilePhoto).toHaveBeenCalledTimes(1);
});
test('password confirmation prevents submission and success leads to sign-in',async()=>{
  const signIn=jest.fn();(api.changeMyPassword as jest.Mock).mockResolvedValue({data:{}});
  await act(async()=>{ui=Renderer.create(<AccountSettingsPanel section="Security" colors={OPERATIONS_DARK} onSessionEnd={signIn}/>);});
  await fill('Current Password','old');await fill('New Password','new');await fill('Confirm New Password','different');await press('Change Password');expect(api.changeMyPassword).not.toHaveBeenCalled();
  await fill('Confirm New Password','new');await press('Change Password');expect(api.changeMyPassword).toHaveBeenCalledWith('old','new','new');
  await press('Sign In Again');expect(signIn).toHaveBeenCalledTimes(1);
});
test('forgot password requests a code and resets on the same screen',async()=>{
  jest.useFakeTimers(); const signIn=jest.fn();
  (api.requestPasswordCode as jest.Mock).mockResolvedValue({data:{}});
  (api.resetPasswordWithCode as jest.Mock).mockResolvedValue({data:{}});
  await act(async()=>{ui=Renderer.create(<AccountRecoveryScreen mode="forgot" onLogin={signIn}/>);});
  await fill('Email Address','invalid');await press('Send Verification Code');expect(api.requestPasswordCode).not.toHaveBeenCalled();
  await fill('Email Address','person@example.test');await press('Send Verification Code');expect(api.requestPasswordCode).toHaveBeenCalledWith('person@example.test');
  expect(text(ui.root)).toContain('If an account exists with this email, a verification code has been sent.');
  await fill('New Password','New@123'); await fill('Confirm New Password','different'); await press('Reset Password');expect(api.resetPasswordWithCode).not.toHaveBeenCalled();
  await fill('Confirm New Password','New@123'); await fill('Verification Code','invalid'); await press('Reset Password'); expect(api.resetPasswordWithCode).not.toHaveBeenCalled();
  await fill('Verification Code','ABCD-1234-ABCD-5678'); await press('Reset Password');
  expect(api.resetPasswordWithCode).toHaveBeenCalledWith('person@example.test','ABCD-1234-ABCD-5678','New@123','New@123');
  expect(text(ui.root)).toContain('Password reset successfully.');
  await act(async()=>jest.advanceTimersByTime(1500));expect(signIn).toHaveBeenCalledTimes(1);
});

test('same-screen recovery retains edits after a server error and allows changing email',async()=>{
  (api.requestPasswordCode as jest.Mock).mockResolvedValue({data:{}});
  (api.resetPasswordWithCode as jest.Mock).mockRejectedValue({response:{data:{error:'Code expired. Request a new one.'}}});
  await act(async()=>{ui=Renderer.create(<AccountRecoveryScreen mode="forgot" onLogin={jest.fn()}/>);});
  await fill('Email Address','person@example.test'); await press('Send Verification Code');
  await fill('New Password','New@123'); await fill('Confirm New Password','New@123');await fill('Verification Code','ABCD-1234-ABCD-5678'); await press('Reset Password');
  expect(text(ui.root)).toContain('Code expired. Request a new one.');
  expect(ui.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel==='New Password')!.props.value).toBe('New@123');
  await press('Use a different email');expect(ui.root.findAllByType(TextInput).some(n=>n.props.accessibilityLabel==='Email Address')).toBe(true);
  expect(ui.root.findAllByType(TextInput).some(n=>n.props.accessibilityLabel==='New Password')).toBe(false);
});

test('reset validates matching passwords, supports visibility and redirects after success',async()=>{
  jest.useFakeTimers();const signIn=jest.fn();(api.resetPassword as jest.Mock).mockResolvedValue({data:{}});
  await act(async()=>{ui=Renderer.create(<AccountRecoveryScreen mode="reset" token="test-token" onLogin={signIn}/>);});
  await fill('New Password','new');await fill('Confirm New Password','bad');await press('Reset Password');expect(api.resetPassword).not.toHaveBeenCalled();
  await press('Show passwords');expect(ui.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel==='New Password')!.props.secureTextEntry).toBe(false);
  await fill('Confirm New Password','new');await press('Reset Password');expect(api.resetPassword).toHaveBeenCalledWith('test-token','new','new');
  await act(async()=>jest.advanceTimersByTime(1500));expect(signIn).toHaveBeenCalledTimes(1);
});
test('profile avatar reflects a saved photo and removes it when signed out',async()=>{
  await act(async()=>{setSessionProfile({...profile});ui=Renderer.create(<AccountAvatar name="Fallback"/>);});
  expect(ui.root.findByType('AuthenticatedImage' as any).props.path).toBe(profile.profilePhotoUrl);
  await act(async()=>setSessionProfile({...profile,displayName:'Updated Name',profilePhotoUrl:null}));expect(text(ui.root)).toBe('UN');
});
test('account links use a fragment and ignore arbitrary redirect parameters',()=>{
  expect(parseAccountLink('#reset-password?token=secret&redirect=https://evil.invalid')).toEqual({mode:'reset',token:'secret'});
  expect(parseAccountLink('#verify-email?token=verified')).toEqual({mode:'verify',token:'verified'});
  expect(parseAccountLink('#home')).toBeUndefined();
});
