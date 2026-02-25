const TOKEN_COOKIE = 'promptvault_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function setCookie(name: string, value: string, days: number = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function isAuthenticated(): boolean {
  const token = getCookie(TOKEN_COOKIE);
  return !!token && token.trim() !== '';
}

export function getToken(): string | null {
  return getCookie(TOKEN_COOKIE);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }

  const data = await response.json();
  setCookie(TOKEN_COOKIE, data.access_token);
}

export function logout(): void {
  deleteCookie(TOKEN_COOKIE);
  window.location.href = '/login';
}
