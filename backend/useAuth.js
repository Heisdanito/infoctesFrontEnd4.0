// ============================================================
//  backend/useAuth.js
//  Global auth context — provides logout() to any screen.
//  Login is handled directly in Login.tsx (no hook needed there).
//
//  Wrap your app root in <AuthProvider>.
//  Call useAuth() in any screen to get { user, role, loading, logout }.
// ============================================================

import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const KEYS = {
  user: 'infoctess_user',
  role: 'infoctess_role',
  studentId: 'infoctess_student_id',
  identifier: 'infoctess_identifier',
};

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start: restore session from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const [rawUser, rawRole] = await Promise.all([
          SecureStore.getItemAsync(KEYS.user),
          SecureStore.getItemAsync(KEYS.role),
        ]);
        if (rawUser) {
          const userData = JSON.parse(rawUser);
          setUser(userData);
          setRole(rawRole || userData.role || 'student');
        }
      } catch (err) {
        console.error('[useAuth] restore session error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(KEYS.user),
        SecureStore.deleteItemAsync(KEYS.role),
        SecureStore.deleteItemAsync(KEYS.studentId),
        SecureStore.deleteItemAsync(KEYS.identifier),
      ]);
    } catch (err) {
      console.error('[useAuth] logout error:', err);
    } finally {
      setUser(null);
      setRole(null);
      router.replace('/Login');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}