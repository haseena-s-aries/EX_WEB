// Tab-scoped access token only; never store passwords or extend token expiry.
const key = 'ex-survey-tab-session';
export function readBrowserSession(): string | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key); }
  catch { return null; }
}
export function writeBrowserSession(token: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (token) window.sessionStorage.setItem(key, token);
    else window.sessionStorage.removeItem(key);
  } catch { /* Sign-in still works when browser storage is unavailable. */ }
}
export function unexpiredAccessToken(token: string, now = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > now;
  } catch { return false; }
}
