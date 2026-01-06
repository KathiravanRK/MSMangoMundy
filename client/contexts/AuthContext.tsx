import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { User, Feature, PermissionKey, RolePermission } from '../types';
import * as api from '../services/api';

interface Permissions {
  hasPermission: (key: PermissionKey) => boolean;
  canView: (feature: Feature, functionality?: string) => boolean;
  canCreate: (feature: Feature, functionality?: string) => boolean;
  canUpdate: (feature: Feature, functionality?: string) => boolean;
  canDelete: (feature: Feature, functionality?: string) => boolean;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: { contactNumber: string; password?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  permissions: Permissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Check if token exists and is not expired
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Try to fetch current user data to verify token validity
            await api.fetchUsers(); // This will fail if token is invalid
            setUser(parsedUser);
          } catch (error) {
            // Token is invalid, clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setUser(null);
          }
        } else {
          // No token found, clear user data
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Failed to check authentication:", error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const login = async (credentials: { contactNumber: string; password?: string }) => {
    try {
      const loggedInUser = await api.loginUser(credentials);
      if (loggedInUser) {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    if (user) {
      api.recordLogout({ id: user.id, name: user.name });
    }
    localStorage.removeItem('user');
    setUser(null);
  };

  const permissions = useMemo<Permissions>(() => {
    const hasPermission = (key: PermissionKey): boolean => {
      if (!user || !user.role) return false;
      // Admin role implicitly has all permissions.
      if (user.role.name === 'Admin') return true;
      return user.role.permissions[key] === true;
    };

    const can = (feature: Feature, action: 'view' | 'create' | 'update' | 'delete', functionality?: string): boolean => {
      if (!user || !user.role) return false;
      if (user.role.name === 'Admin') return true;

      if (functionality) {
        return hasPermission(`${feature}.${functionality}.${action}` as PermissionKey);
      }

      // If no functionality is specified, check if there's *any* permission of this type for the feature
      const permissions = user.role.permissions;
      for (const key in permissions) {
        if (permissions[key as PermissionKey] && key.startsWith(`${feature}.`) && key.endsWith(`.${action}`)) {
          return true;
        }
      }
      return false;
    };

    return {
      hasPermission,
      canView: (feature: Feature, functionality?: string) => can(feature, 'view', functionality),
      canCreate: (feature: Feature, functionality?: string) => can(feature, 'create', functionality),
      canUpdate: (feature: Feature, functionality?: string) => can(feature, 'update', functionality),
      canDelete: (feature: Feature, functionality?: string) => can(feature, 'delete', functionality),
    };
  }, [user]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePermissions = (): Permissions => {
  const { permissions } = useAuth();
  return permissions;
}
