import { useState, useEffect } from 'react';
import api from '@/lib/axios';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lawyer' | 'paralegal' | 'client';
  organization: {
    id: string;
    name: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me/');
      setAuth({
        user: response.data,
        token: localStorage.getItem('access_token'),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      setAuth({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login/', { email, password });
    const { access, refresh, user } = response.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    setAuth({
      user,
      token: access,
      isAuthenticated: true,
      isLoading: false,
    });
    
    return user;
  };

  const register = async (email: string, password: string, name: string, organization_name: string) => {
    const response = await api.post('/auth/register/', { email, password, name, organization_name });
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const response = await api.post('/auth/refresh/', { refresh });
      const { access } = response.data;
      
      localStorage.setItem('access_token', access);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return true;
    } catch (error) {
      logout();
      return false;
    }
  };

  return {
    ...auth,
    login,
    register,
    logout,
    refreshToken,
    fetchUser,
  };
}