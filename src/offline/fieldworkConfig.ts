/**
 * Browser fieldwork rollout switch, read from public/config.js (EX_SURVEY_CONFIG.browserFieldworkEnabled):
 *   true    -> enabled on any host (requires separate production authorization; not set anywhere today)
 *   'local' -> enabled only when the page itself is served from a loopback host (local development/testing)
 *   other   -> disabled
 */
export const isLoopbackHost = (host:string) => host==='localhost'||host==='127.0.0.1'||host==='[::1]'||host==='::1';
export function browserFieldworkEnabled(config:any=(globalThis as any).EX_SURVEY_CONFIG,host:string=typeof window==='undefined'?'':window.location.hostname) {
  const value=config?.browserFieldworkEnabled;
  return value===true||(value==='local'&&isLoopbackHost(host));
}
