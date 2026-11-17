export function parseAccountLink(fragment: string): {mode: 'reset' | 'verify'; token: string} | undefined {
  const match = /^#(reset-password|verify-email)\?(.*)$/.exec(fragment);
  if (!match) return undefined;
  const token = new URLSearchParams(match[2]).get('token') || '';
  return {mode: match[1] === 'reset-password' ? 'reset' : 'verify', token: token.length <= 128 ? token : ''};
}
