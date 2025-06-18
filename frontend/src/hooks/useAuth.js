import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    isLoggedIn: context.isLoggedIn,
    username: context.username,
    role: context.role,
    email: context.email,
    token: context.token,
    userId: context.userId,
    setIsLoggedIn: context.setIsLoggedIn,
    setUsername: context.setUsername,
    setRole: context.setRole,
    setEmail: context.setEmail,
    setToken: context.setToken,
    setUserId: context.setUserId,
    authLoaded: context.authLoaded,
  };
};

export default useAuth;