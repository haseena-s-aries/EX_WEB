import {readBrowserSession, writeBrowserSession, unexpiredAccessToken} from '../src/api/browserSession';
import {restoreBrowserSession} from '../src/api/restoreBrowserSession';
import apiClient, {setAuthToken} from '../src/api/client';
import {setSessionProfile} from '../src/api/profileState';
jest.mock('../src/api/client', () => ({__esModule: true, default: {get: jest.fn()}, setAuthToken: jest.fn()}));
jest.mock('../src/api/profileState', () => ({setSessionProfile: jest.fn()}));
const token = (exp: number) => `header.${btoa(JSON.stringify({exp}))}.signature`;
const storage = new Map<string, string>();
beforeEach(() => {
  jest.clearAllMocks(); storage.clear();
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {sessionStorage: {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  }}});
});
test('tab session is cleared on logout and malformed/expired tokens are rejected', () => {
  writeBrowserSession('example'); expect(readBrowserSession()).toBe('example');
  writeBrowserSession(null); expect(readBrowserSession()).toBeNull();
  expect(unexpiredAccessToken('broken')).toBe(false);
  expect(unexpiredAccessToken(token(1))).toBe(false);
});
test('an expired session never loads protected profile data', async () => {
  writeBrowserSession(token(1)); expect(await restoreBrowserSession()).toBeNull();
  expect(apiClient.get).not.toHaveBeenCalled(); expect(setAuthToken).toHaveBeenCalledWith(null);
});
test('restoration waits for server validation and uses current server role', async () => {
  writeBrowserSession(token(Date.now() / 1000 + 3600));
  let finish!: (value: any) => void;
  (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const pending = restoreBrowserSession();
  expect(setSessionProfile).not.toHaveBeenCalled();
  const user = {id: 'u1', role: 'QC', displayName: 'Reviewer'};
  finish({data: user}); expect(await pending).toEqual(user);
  expect(setSessionProfile).toHaveBeenCalledWith(user);
});
test.each([401, 403])('revoked or unauthorized session (%s) requires sign-in', async status => {
  writeBrowserSession(token(Date.now() / 1000 + 3600));
  (apiClient.get as jest.Mock).mockRejectedValueOnce({response: {status}});
  expect(await restoreBrowserSession()).toBeNull(); expect(setAuthToken).toHaveBeenLastCalledWith(null);
});
test('network failure keeps the session for retry without authorizing a dashboard', async () => {
  const saved = token(Date.now() / 1000 + 3600); writeBrowserSession(saved);
  (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await expect(restoreBrowserSession()).rejects.toThrow('offline');
  expect(readBrowserSession()).toBe(saved); expect(setSessionProfile).not.toHaveBeenCalled();
});

