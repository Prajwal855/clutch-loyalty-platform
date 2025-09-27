import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  verified: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (otpCode: string) => Promise<any>;
  connectWallet: (hederaAccountId: string) => Promise<any>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3001/';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('authToken'));

  useEffect(() => {
    axios.defaults.baseURL = API_BASE_URL;
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      // loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function loadUser() {
    try {
      const res = await axios.get('/auth/profile');
      setUser(res.data.user);
    } catch {
      setUser(null);
      logout();
    } finally {
      setLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true);
    const res = await axios.post('/login', { email, password });
    if (res.data) {
      sessionStorage.setItem('authToken', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
    setLoading(false);
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      const res = await axios.post('/signup', {
        user: {
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
        },
      });
      console.log('Signup response:', res.data);
      if (res.data) {
        sessionStorage.setItem('authToken', res.data.token);
        sessionStorage.setItem('email', res.data.user.email);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otpCode: string) => {
    const savedEmail = sessionStorage.getItem('email');
    if (!savedEmail) throw new Error('No token. Please login first.');
    setLoading(true);
    const res = await axios.post('/signup/verify_otp', { email: savedEmail, otp_code: otpCode });
    setLoading(false);
    return res.data;
  };

  const connectWallet = async (hederaAccountId: string) => {
    const savedToken = sessionStorage.getItem('authToken');
    if (!savedToken) throw new Error('No token. Please login first.');
    setLoading(true);
    try {
      const res = await axios.post('/wallet_connect', { hedera_account_id: hederaAccountId });
      console.log('Wallet connect response:', res.data);
      return res.data;
    } catch (err: any) {
      console.error('Wallet connect error:', err.response?.data);
      throw new Error(err.response?.data?.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // sessionStorage.removeItem('authToken');
    // delete axios.defaults.headers.common['Authorization'];
    // setUser(null);
    // setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, verifyOtp, connectWallet }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}