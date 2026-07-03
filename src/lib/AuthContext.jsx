import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const getUsersList = () => {
    try {
      const stored = localStorage.getItem('marquesitas_users');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    const defaultUsers = [{ username: 'marco', password: 'polo', role: 'admin' }];
    localStorage.setItem('marquesitas_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    setAppPublicSettings({ id: appParams.appId, public_settings: 'public_without_login' });
    
    getUsersList(); // Inicializar si no existe

    try {
      const activeSession = sessionStorage.getItem('marquesitas_logged_in_user');
      if (activeSession) {
        setUser(JSON.parse(activeSession));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
      setUser(null);
      setIsAuthenticated(false);
    }

    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const checkUserAuth = async () => {
    await checkAppState();
  };

  const loginLocal = async (username, password) => {
    const users = getUsersList();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (found) {
      const sessionUser = { username: found.username, role: found.role };
      setUser(sessionUser);
      setIsAuthenticated(true);
      sessionStorage.setItem('marquesitas_logged_in_user', JSON.stringify(sessionUser));
      return sessionUser;
    } else {
      throw new Error('Usuario o contraseña incorrectos');
    }
  };

  const logoutLocal = () => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('marquesitas_logged_in_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout: logoutLocal,
      navigateToLogin: () => {},
      checkUserAuth,
      checkAppState,
      loginLocal,
      logoutLocal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
