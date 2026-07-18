// localStorage, not memory-only: the backend issues a long-lived (~10h)
// access token specifically to match a hospital shift ("log in once, stay
// in all day"), which only makes sense if the session survives a page
// refresh or a closed/reopened tab.
const STORAGE_KEY = "hms-access-token";

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}
