function payload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

/** True when the token has expired or will within `marginSeconds`; unreadable tokens count as expired */
export function isTokenExpired(token: string, marginSeconds = 0): boolean {
  const exp = payload(token)?.exp;
  return typeof exp !== 'number' || exp * 1000 <= Date.now() + marginSeconds * 1000;
}

// The API puts the user id in the NameIdentifier claim, which may be written short or long
export function userIdFromToken(token: string): string {
  const p = payload(token) ?? {};
  const id = p.nameid ?? p.sub ?? p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  return typeof id === 'string' ? id : '';
}
