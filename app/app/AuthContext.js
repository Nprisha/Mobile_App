// src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChange, 
  signIn, 
  signUp, 
  signInWithGoogle, 
  logOut, 
  resetPassword,
  getCurrentUserData 
} from '../lib/firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authentication functions
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signIn(email, password);
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signUp(email, password, displayName);
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await logOut();
      setUser(null);
      setUserData(null);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const result = await resetPassword(email);
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true, message: result.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Load user data when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userInfo = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        
        setUser(userInfo);
        
        // Get additional user data from Firestore
        const userData = await getCurrentUserData(firebaseUser.uid);
        setUserData(userData);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    forgotPassword,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
