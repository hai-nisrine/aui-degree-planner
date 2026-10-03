// Base URL of the backend API (set REACT_APP_API_URL in frontend/.env)
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AUTH_STORAGE_KEY = 'aui-auth';

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

// Cached user from the last login, used only if the API is unreachable
export function getStoredUser() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored).user || null;
  } catch {
    return null;
  }
}

export function storeAuth(user, rememberMe) {
  const payload = JSON.stringify({ user, rememberMe, timestamp: Date.now() });
  clearStoredAuth();
  (rememberMe ? localStorage : sessionStorage).setItem(AUTH_STORAGE_KEY, payload);
}

// Clears the server session cookie and any cached user data
export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (err) {
    // Still clear local state if the server can't be reached
  }
  clearStoredAuth();
}
