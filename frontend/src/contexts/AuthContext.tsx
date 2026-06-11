import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  userId: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  slug: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isPrivileged: boolean;
  login: (email: string, password: string) => Promise<{ slug: string | null; role: string } | null>;
  logout: () => void;
}

// The "pipe" — just a typed container, no value yet
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider owns the auth state and exposes it to every descendant
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // On mount: check if a valid session cookie exists
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser({ userId: data.userId, role: data.role, slug: data.slug ?? null });
      })
      .catch(() => {});
  }, []);

  const isPrivileged = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  async function login(email: string, password: string): Promise<{ slug: string | null; role: string } | null> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // login endpoint returns 'id', /me returns 'userId' — normalise here
    setUser({ userId: data.id, role: data.role, slug: data.slug ?? null });
    return { slug: data.slug, role: data.role };
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isPrivileged, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth() — how any component reads from the pipe
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
