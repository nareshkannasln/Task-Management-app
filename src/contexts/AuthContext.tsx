import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { socketManager } from '../lib/socket';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    handleAuthCallback();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      socketManager.connect(userData.id);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      apiClient.setToken(token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuthStatus();
    }
  };

  const signInWithGoogle = () => {
    window.location.href = 'http://localhost:3001/api/auth/google';
  };

  const handleSignOut = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      socketManager.disconnect();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client side even if server request fails
      apiClient.clearToken();
      setUser(null);
      socketManager.disconnect();
    }
  };

  useEffect(() => {
    if (user) {
      socketManager.connect(user.id);
    } else {
      socketManager.disconnect();
    }
  }, [user]);

  const value = {
    user,
    loading,
    signOut: handleSignOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};