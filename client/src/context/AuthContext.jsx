import { createContext, useContext, useState, useEffect } from 'react';
import { adminAuthAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const savedAdmin = localStorage.getItem('adminUser');
    if (token && savedAdmin) {
      try {
        setAdmin(JSON.parse(savedAdmin));
      } catch {}
      // Rol / merkez / telefon bilgisini sunucudan tazele
      adminAuthAPI.me().then(r => saveAdmin(r.data.data)).catch(() => {});
    }
    setLoading(false);
  }, []);

  const saveAdmin = (adminData) => {
    localStorage.setItem('adminUser', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const login = async (username, password) => {
    const response = await adminAuthAPI.login({ username, password });
    const { token, admin: adminData } = response.data.data;
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  };

  const logout = async () => {
    try {
      await adminAuthAPI.logout();
    } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, saveAdmin, loading, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
