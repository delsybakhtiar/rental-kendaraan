'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AccountType = 'standard' | 'premium';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  accountType: AccountType;
}

interface AuthContextType {
  user: User | null;
  accountType: AccountType;
  isPremium: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const accountType: AccountType = user?.accountType || 'standard';
  const isPremium = accountType === 'premium';

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUser({
            ...parsedUser,
            accountType: parsedUser.accountType || 'standard',
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
          role: data.data.user.role,
          accountType: data.data.user.accountType || 'standard',
        };

        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return { success: true, message: 'Login berhasil!' };
      } else {
        return { success: false, message: data.message || 'Login gagal' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const userData = {
            ...data.data,
            accountType: data.data.accountType || 'standard',
          };
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, accountType, isPremium, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Simple hook for getting account type without full context
export function useAccountType(): { accountType: AccountType; isPremium: boolean } {
  // Get initial value synchronously to avoid setState in effect
  const getInitialAccountType = (): AccountType => {
    if (typeof window === 'undefined') return 'standard';
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.accountType || 'standard';
      }
    } catch (error) {
      console.error('Error reading account type:', error);
    }
    return 'standard';
  };

  const [accountType, setAccountType] = useState<AccountType>(getInitialAccountType);

  useEffect(() => {
    // Update when localStorage changes (e.g., login/logout in another tab)
    const handleStorageChange = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setAccountType(parsedUser.accountType || 'standard');
        } else {
          setAccountType('standard');
        }
      } catch (error) {
        console.error('Error reading account type:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { accountType, isPremium: accountType === 'premium' };
}
