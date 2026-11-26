import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { clearSessionToken, getSessionToken, setSessionToken } from '@/lib/storage';
import { authService } from '@/services/auth.service';
import type { LoginPayload, RegisterPayload, SafeUser } from '@/types/api';

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleUnauthorized = useCallback(async () => {
    await clearSessionToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  const refreshUser = useCallback(async () => {
    try {
      const token = await getSessionToken();
      if (!token) {
        setUser(null);
        return;
      }
      const res = await authService.me();
      setUser(res.user);
    } catch {
      await clearSessionToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshUser();
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    if (!res.token) {
      throw new Error('Server tidak mengembalikan token sesi mobile');
    }
    await setSessionToken(res.token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    if (!res.token) {
      throw new Error('Server tidak mengembalikan token sesi mobile');
    }
    await setSessionToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout; clear local session regardless
    } finally {
      await clearSessionToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        refreshUser,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}
