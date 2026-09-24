'use client';

/**
 * Client-Side Authentication Session Hook & Provider
 *
 * Connects frontend UI to real backend session state from GET /api/auth/session
 * and handles secure session termination via POST /api/auth/logout.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SessionUser {
  id: string;
  githubId: string;
  githubLogin: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: string;
}

export interface SessionState {
  user: SessionUser | null;
  authenticated: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  logout: () => Promise<boolean>;
}

const SessionContext = createContext<SessionState | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/session', {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setAuthenticated(true);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        setUser(null);
        setAuthenticated(false);
        return true;
      } else {
        const err = new Error(`Logout failed with HTTP ${response.status}`);
        setError(err);
        return false;
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return (
    <SessionContext.Provider
      value={{
        user,
        authenticated,
        loading,
        error,
        refresh: fetchSession,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (context) {
    return context;
  }

  // Standalone fallback if used outside Provider
  return {
    user: null,
    authenticated: false,
    loading: false,
    error: null,
    refresh: async () => {},
    logout: async () => false,
  };
}
