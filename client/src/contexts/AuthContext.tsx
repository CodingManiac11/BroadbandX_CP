import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials } from '../types/index';
import { authService } from '../services/authService';
import { tokenManager } from '../services/api';
import webSocketService from '../services/webSocketService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: 'customer' | 'admin') => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated - using tokenManager for consistency
  const isAuthenticated = !!user && !!tokenManager.getToken();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Check for stored auth token and validate
    const checkAuth = async () => {
      try {
        const token = tokenManager.getToken();
        if (token) {
          console.log('Found token, validating with backend');
          try {
            // Use authService to get current user
            const userData = await authService.getCurrentUser();
            console.log('Token validation successful, user:', userData);
            setUser(userData);
            
            // Authenticate with WebSocket for existing session
            webSocketService.authenticate(userData._id);
          } catch (err) {
            console.error('Token validation failed:', err);
            // Token is invalid or expired
            tokenManager.clearTokens();
            throw new Error('Token validation failed');
          }
        } else {
          console.log('No authentication token found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string, role?: 'customer' | 'admin') => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log('Login attempt:', email, 'Role:', role);
      
      // Clear any existing tokens and user state first
      tokenManager.clearTokens();
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('token'); // Legacy token key
      
      // Use the authService for login instead of direct fetch
      const credentials: LoginCredentials = { email, password, role };
      const authResponse = await authService.login(credentials);
      
      console.log('Login successful, received:', { 
        user: authResponse.user,
        hasToken: !!authResponse.tokens.access_token
      });
      
      // Store tokens using tokenManager
      tokenManager.setToken(authResponse.tokens.access_token);
      tokenManager.setRefreshToken(authResponse.tokens.refresh_token);
      
      // Store additional user info for backward compatibility
      localStorage.setItem('userId', authResponse.user._id);
      localStorage.setItem('userRole', authResponse.user.role);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      // Update user in state
      setUser(authResponse.user);
      
      // Authenticate with WebSocket
      webSocketService.authenticate(authResponse.user._id);
      
      // Force the authenticated state to update immediately
      setTimeout(() => {
        console.log('Auth state after login:', { 
          user: authResponse.user,
          token: tokenManager.getToken()
        });
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      // Clear tokens on error
      tokenManager.clearTokens();
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('token');
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setLoading(true);
      console.log('Registering user:', userData.email);
      
      // Use authService for registration
      const authResponse = await authService.register(userData);
      
      console.log('Registration successful:', {
        user: authResponse.user,
        hasToken: !!authResponse.tokens.access_token
      });
      
      // Set user with proper role from response
      setUser(authResponse.user);
      tokenManager.setToken(authResponse.tokens.access_token);
      tokenManager.setRefreshToken(authResponse.tokens.refresh_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process');
      setLoading(true);
      
      // Make actual logout API call
      const token = tokenManager.getToken();
      if (token) {
        try {
          await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          console.log('Server logout successful');
        } catch (logoutError) {
          console.warn('Server logout failed, continuing with local cleanup:', logoutError);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clean up local state even if API call fails
      console.log('Cleaning up auth state');
      setUser(null);
      setError(null);
      tokenManager.clearTokens();
      setLoading(false);
      
      // Disconnect WebSocket
      webSocketService.disconnect();
      
      // Additional cleanup - clear all localStorage items that might cause issues
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('token'); // Legacy token key
      
      console.log('Logout complete');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register,
      logout, 
      loading, 
      error,
      isAuthenticated,
      isAdmin,
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};