// src/context/AuthContext.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getItem as getSecureItem,
  setItem as setSecureItem,
  deleteItem as deleteSecureItem,
} from '../utils/storage';
import jwtDecode from 'jwt-decode';
import axiosClient, { setCachedToken } from '../api/axiosClient';

const isTokenExpired = (jwt) => {
  try {

    const { exp } = jwtDecode(jwt);
    return exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
import { createContext, useEffect, useState } from 'react';
import logger from '../utils/logger';
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [authLoaded, setAuthLoaded] = useState(false); // ✅ eklendi
  const [userId, setUserId] = useState('');


  useEffect(() => {
    const loadAuth = async () => {
      try {

        let token = await getSecureItem('accessToken');
        const refreshToken = await getSecureItem('refreshToken');
        const storedUsername = await AsyncStorage.getItem('username');
        const storedRole = await AsyncStorage.getItem('role');
        const storedEmail = await AsyncStorage.getItem('email');
        const storedUserId = await AsyncStorage.getItem('userId');


        if (token) {
          if (isTokenExpired(token) && refreshToken) {
            try {
              const { data } = await axiosClient.post('/auth/refresh', { refreshToken });
              token = data.accessToken;
              await setSecureItem('accessToken', token);
              setCachedToken(token);
            } catch (refreshError) {
              await deleteSecureItem('accessToken');
              await deleteSecureItem('refreshToken');
              token = null;
            }
          }

          if (token && !isTokenExpired(token)) {
            setIsLoggedIn(true);
            setUsername(storedUsername);
            setRole(storedRole);
            setEmail(storedEmail);
            setToken(token);
            setUserId(storedUserId);
          }
        }
      } catch (err) {
        logger.error('Auth yüklenemedi:', err);
      } finally {
        setAuthLoaded(true); // ✅ en sonunda
      }
    };

    loadAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        username,
        role,
        email,
        token,
        userId, 
        setIsLoggedIn,
        setUsername,
        setRole,
        setEmail,
        setToken,

        setUserId,  
        authLoaded // ✅ eklendi
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
