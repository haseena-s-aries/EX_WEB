import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import apiClient from '../api/client';
import {getQcDashboard} from '../api/projects';

// The existing authenticated dashboard scopes counts to the QC, Manager or Admin.
export default function useQcPendingCount(user: {role: string} | null, screen: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {setCount(0);}, [user]);
  useEffect(() => {
    if (!user || !['qc', 'manager', 'admin'].includes(user.role.toLowerCase())) return;
    let active = true;
    let inFlight = false;
    let refreshAgain = false;
    const update = (data: any) => {
      const pending = Number(data?.awaitingQcReview);
      if (active) setCount(Number.isFinite(pending) && pending > 0 ? pending : 0);
    };
    const refresh = async () => {
      if (!active) return;
      if (inFlight) {refreshAgain = true; return;}
      inFlight = true;
      try {update((await getQcDashboard()).data);}
      catch { /* Keep the last successful count during temporary network failures. */ }
      finally {
        inFlight = false;
        if (refreshAgain && active) {refreshAgain = false; void refresh();}
      }
    };
    const interceptor = apiClient.interceptors.response.use(response => {
      const url = response.config.url || '';
      const method = response.config.method?.toLowerCase() || 'get';
      if (method === 'get' && /\/qc\/dashboard(?:\?|$)/.test(url)) update(response.data);
      else if (['post', 'put', 'patch', 'delete'].includes(method) && /\/(qc|surveyor|projects)(\/|$)/.test(url)) void refresh();
      return response;
    });
    void refresh();
    // Pick up other users' submissions while the navigation remains open.
    const timer = setInterval(() => {void refresh();}, 30000);
    const subscription = AppState.addEventListener('change', state => {if (state === 'active') void refresh();});
    const browser = globalThis as any;
    const focus = () => {void refresh();};
    browser.addEventListener?.('focus', focus);
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      browser.removeEventListener?.('focus', focus);
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [user, screen]);
  return count;
}
