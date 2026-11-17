import apiClient, {setAuthToken} from './client';
import {readBrowserSession, unexpiredAccessToken} from './browserSession';
import {setSessionProfile, SessionProfile} from './profileState';

export async function restoreBrowserSession(): Promise<SessionProfile | null> {
  const token = readBrowserSession();
  if (!token) return null;
  if (!unexpiredAccessToken(token)) { setAuthToken(null); return null; }
  setAuthToken(token);
  try {
    // Server validation includes account approval, current role and revocation.
    const {data} = await apiClient.get<SessionProfile>('/auth/me', {timeout: 15000});
    setSessionProfile(data);
    return data;
  } catch (error: any) {
    if ([401, 403].includes(error?.response?.status)) { setAuthToken(null); return null; }
    // Connectivity failures are not proof of an invalid session. Keep the
    // loading/retry boundary visible and do not expose protected content.
    throw error;
  }
}
