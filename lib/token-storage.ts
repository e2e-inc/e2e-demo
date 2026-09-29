const KEY = 'testerpay.session-token';

export async function readToken(): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export async function writeToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}
