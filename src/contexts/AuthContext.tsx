"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
}

export function AuthProvider({
  children,
  allowedRoles = [],
  redirectTo = '/login_hr',
  unauthorizedRedirectTo = '/',
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if token exists
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        // No token, redirect to configured login page
        router.replace(redirectTo);
        return;
      }

      const result = await authApi.getCurrentUser();

      if (result.success && result.data) {
        if (
          allowedRoles.length > 0 &&
          result.data.role &&
          !allowedRoles.includes(result.data.role)
        ) {
          // Role not permitted for this portal
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          setUser(null);
          setError('Unauthorized role for this portal');
          router.replace(unauthorizedRedirectTo);
          return;
        }

        setUser(result.data);
      } else {
        setError(result.message || 'Failed to fetch user data');
        // If failed to get user, redirect to configured login page
        router.replace(redirectTo);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('An error occurred while fetching user data');
      router.replace(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = () => {
    setUser(null);
    authApi.logout();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, refreshUser, logout }}>
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

