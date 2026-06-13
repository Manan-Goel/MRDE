import { TOKEN_KEY } from '../api/client';

/**
 * Demo authentication: validates hardcoded admin/admin credentials and
 * stores a locally-generated JWT-shaped token in localStorage.
 */
export function login(username: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(
          JSON.stringify({ sub: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })
        );
        const token = `${header}.${payload}.demo-signature`;
        localStorage.setItem(TOKEN_KEY, token);
        resolve(token);
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 700);
  });
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const logout = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = () => Boolean(getToken());
