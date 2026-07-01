import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { User } from '../types';

const MANAGEMENT_ROLES = ['Admin', 'Site Manager', 'Assistant Site Manager', 'Supervisor', 'Manager', 'Payroll'];

export const ROLE_ACCESS: Record<string, Record<string, boolean>> = {
  'Admin':                  { payroll: true,  schedule: true,  scheduleEdit: true,  employee: true,  ops: true,  settings: true  },
  'Manager':                { payroll: true,  schedule: true,  scheduleEdit: true,  employee: true,  ops: true,  settings: true  },
  'Site Manager':           { payroll: false, schedule: true,  scheduleEdit: true,  employee: true,  ops: true,  settings: true  },
  'Assistant Site Manager': { payroll: false, schedule: true,  scheduleEdit: false, employee: true,  ops: true,  settings: true  },
  'Supervisor':             { payroll: false, schedule: true,  scheduleEdit: false, employee: true,  ops: true,  settings: true  },
  'Payroll':                { payroll: true,  schedule: false, scheduleEdit: false, employee: false, ops: false, settings: false },
};

interface AuthContextType {
  user: User | null;
  isManagerUnlocked: boolean;
  managerRole: string | null;
  loading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  unlockManager: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  lockManager: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [managerRole, setManagerRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const saved = await SecureStore.getItemAsync('lcw_user');
      if (saved) {
        const userData = JSON.parse(saved);
        setUser(userData);
        // Restore management access so managers don't lose their tabs on reopen
        if (MANAGEMENT_ROLES.includes(userData.role)) {
          setIsManagerUnlocked(true);
          setManagerRole(userData.role);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function login(pin: string): Promise<{ success: boolean; error?: string }> {
    if (pin.length !== 4) return { success: false, error: 'PIN must be 4 digits' };

    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, is_approved, is_salary')
      .eq('pin', pin)
      .limit(1)
      .single();

    if (error || !data) return { success: false, error: 'Invalid PIN' };
    if (!data.is_approved) return { success: false, error: 'Account not approved. Contact a manager.' };

    const u: User = { id: data.id, name: data.name, role: data.role, is_approved: data.is_approved, is_salary: data.is_salary ?? false };
    setUser(u);
    await SecureStore.setItemAsync('lcw_user', JSON.stringify(u));

    // Auto-unlock manager access for management roles
    if (MANAGEMENT_ROLES.includes(data.role)) {
      setIsManagerUnlocked(true);
      setManagerRole(data.role);
    }

    // Register for push notifications and save token
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await supabase.from('users').update({ push_token: token }).eq('id', u.id);
      }
    } catch (err) {
      console.log('Failed to register push token', err);
    }

    return { success: true };
  }

  async function logout() {
    setUser(null);
    setIsManagerUnlocked(false);
    setManagerRole(null);
    await SecureStore.deleteItemAsync('lcw_user');
  }

  async function unlockManager(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('name', username)
      .eq('password', password)
      .not('password', 'is', null)
      .limit(1)
      .single();

    if (error || !data) return { success: false, error: 'Invalid credentials' };
    if (!MANAGEMENT_ROLES.includes(data.role)) return { success: false, error: 'Not a management account' };

    setIsManagerUnlocked(true);
    setManagerRole(data.role);
    return { success: true };
  }

  function lockManager() {
    setIsManagerUnlocked(false);
    setManagerRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, isManagerUnlocked, managerRole, loading, login, logout, unlockManager, lockManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
