import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onIdTokenChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  auth,
  googleProvider,
  isVerifiedMasterAdmin,
  syncMasterAdminProfile,
} from '../firebase';

interface AuthContextValue {
  user: User | null;
  isAuthReady: boolean;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  // Keep ID token strictly in memory (never in localStorage)
  const inMemoryTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          inMemoryTokenRef.current = await nextUser.getIdToken();
        } catch {
          inMemoryTokenRef.current = null;
        }
      } else {
        inMemoryTokenRef.current = null;
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    inMemoryTokenRef.current = await cred.user.getIdToken();
    if (isVerifiedMasterAdmin(cred.user)) {
      await syncMasterAdminProfile(cred.user);
    }
    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    inMemoryTokenRef.current = null;
    await signOut(auth);
  }, []);

  const getAccessToken = useCallback(async () => {
    const activeUser = auth.currentUser;
    if (!activeUser) {
      inMemoryTokenRef.current = null;
      return null;
    }
    const freshToken = await activeUser.getIdToken();
    inMemoryTokenRef.current = freshToken;
    return freshToken;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthReady,
      signInWithGoogle,
      logout,
      getAccessToken,
    }),
    [user, isAuthReady, signInWithGoogle, logout, getAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
