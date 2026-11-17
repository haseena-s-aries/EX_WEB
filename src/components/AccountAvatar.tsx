import React from 'react';
import {Text} from 'react-native';
import {useSessionProfile} from '../api/profileState';
import AuthenticatedImage from './AuthenticatedImage';
export default function AccountAvatar({name, color = '#00D9EE'}: {name: string; color?: string}) {
  const profile = useSessionProfile();
  return profile?.profilePhotoUrl ? <AuthenticatedImage path={profile.profilePhotoUrl} style={{width: 40, height: 40, borderRadius: 20}} />
    : <Text style={{color, fontSize: 17, fontWeight: '800'}}>{(profile?.displayName || name).trim().split(' ').map(p => p[0]).join('').slice(0, 2) || '•'}</Text>;
}
