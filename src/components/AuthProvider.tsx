'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  emailVerified: boolean;
  organizationId?: string | null;
  orgRole?: string | null;
  orgPlan?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      let res = await fetch('/api/auth/me');

      // If access token expired, try refreshing it silently
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          // Retry with the new access token cookie
          res = await fetch('/api/auth/me');
        }
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const login = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    router.push('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
