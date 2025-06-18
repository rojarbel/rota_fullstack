// src/context/AuthContext.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem as getSecureItem } from '../utils/storage';
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
        const token = await getSecureItem("accessToken");
        const storedUsername = await AsyncStorage.getItem('username');
        const storedRole = await AsyncStorage.getItem('role');
        const storedEmail = await AsyncStorage.getItem('email');
        const storedUserId = await AsyncStorage.getItem('userId');

        if (token) {
          setIsLoggedIn(true);
          setUsername(storedUsername);
          setRole(storedRole);
          setEmail(storedEmail);
          setToken(token);
          setUserId(storedUserId);
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
