import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens } from '../types/index';
import { authService } from '../services/authService';
import { tokenManager } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
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

  // Check if user is authenticated
  const isAuthenticated = !!user && !!tokenManager.getToken();
  const isAdmin = user?.role === 'admin';

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing auth...');
      const token = tokenManager.getToken();
      console.log('AuthContext: Token from storage:', token ? 'exists' : 'none');
      
      if (token) {
        try {
          console.log('AuthContext: Fetching current user...');
          const userData = await authService.getCurrentUser();
          console.log('AuthContext: User data received:', userData);
          setUser(userData);
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Clear invalid tokens
          tokenManager.clearTokens();
        }
      }
      
      console.log('AuthContext: Auth initialization complete');
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('Starting login process...');
      const response = await authService.login({ email, password });
      console.log('Login response received:', response);
      
      // Store tokens
      tokenManager.setToken(response.tokens.access_token);
      tokenManager.setRefreshToken(response.tokens.refresh_token);
      console.log('Tokens stored successfully');
      
      // Set user data
      setUser(response.user);
      console.log('User data set:', response.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: any): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      
      // Store tokens
      tokenManager.setToken(response.tokens.access_token);
      tokenManager.setRefreshToken(response.tokens.refresh_token);
      
      // Set user data
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data regardless of API response
      tokenManager.clearTokens();
      setUser(null);
      setLoading(false);
    }
  };

  // Update user function
  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};