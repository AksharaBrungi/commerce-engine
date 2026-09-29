import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  guestSessionId: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  quickDemoLogin: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ce_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize guestSessionId
  const [guestSessionId] = useState<string>(() => {
    let sid = localStorage.getItem('ce_guest_session');
    if (!sid) {
      sid = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ce_guest_session', sid);
    }
    return sid;
  });

  const fetchProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid
        localStorage.removeItem('ce_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline / server rebooting
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchProfile]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in.');
    }

    localStorage.setItem('ce_token', data.token);
    setToken(data.token);
    setUser(data.user);

    // Merge guest cart if items exist
    try {
      const localCart = localStorage.getItem('ce_guest_cart');
      if (localCart) {
        const items = JSON.parse(localCart);
        if (items.length > 0) {
          await fetch('/api/cart/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({ guestItems: items }),
          });
          localStorage.removeItem('ce_guest_cart');
        }
      }

      // Merge guest wishlist
      const localWish = localStorage.getItem('ce_guest_wishlist');
      if (localWish) {
        const ids = JSON.parse(localWish);
        if (ids.length > 0) {
          await fetch('/api/wishlist/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({ productIds: ids }),
          });
          localStorage.removeItem('ce_guest_wishlist');
        }
      }
    } catch (e) {
      console.warn('Sync on login warning:', e);
    }

    return data.user;
  };

  const register = async (formData: any): Promise<User> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    localStorage.setItem('ce_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const quickDemoLogin = async (email: string) => {
    await login(email, 'demo123');
  };

  const logout = () => {
    localStorage.removeItem('ce_token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        guestSessionId,
        isLoading,
        login,
        register,
        logout,
        quickDemoLogin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
