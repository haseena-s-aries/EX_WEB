import {useContext} from 'react';
import {NavigationContext} from '@react-navigation/native';

export default function useNativeNavigation() {
  return useContext(NavigationContext);
}
