import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  GridProps,
  CircularProgress,
  createTheme,
  ThemeProvider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';

interface DashboardData {
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    verified: boolean;
    status: string;
    created_at: string;
  };
  wallet: {
    id: number;
    hedera_account_id: string;
    balance: number;
    formatted_balance: number;
    token_id: string;
    account_type: string;
    status: string;
    connected_at: string;
  } | null;
  transactions: Transaction[];
  stats: {
    total_transactions: number;
    total_earned: number;
    total_spent: number;
    current_balance: number;
  };
}

interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference: string;
  status: string;
  created_at: string;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#B0B0B0',
    },
    background: {
      default: '#0A0A0A',
      paper: 'rgba(28, 28, 28, 0.85)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    body2: {
      fontWeight: 400,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          background: 'linear-gradient(45deg, #808080, #B0B0B0)',
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #A0A0A0, #C0C0C0)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
          },
          '&:disabled': {
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.3)',
          },
          '&.MuiButton-outlined': {
            background: 'transparent',
            borderColor: '#B0B0B0',
            color: '#B0B0B0',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: '#FFFFFF',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          background: 'transparent',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#B0B0B0',
          padding: '12px',
        },
        head: {
          color: '#FFFFFF',
          fontWeight: 600,
        },
      },
    },
  },
});

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

    const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/dashboard', {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');

      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            background: 'radial-gradient(circle at top, #1A1A1A, #0A0A0A)',
          }}
        >
          <CircularProgress sx={{ color: 'text.secondary' }} />
          <Typography sx={{ color: 'text.secondary', ml: 2 }}>
            Loading dashboard...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            background: 'radial-gradient(circle at top, #1A1A1A, #0A0A0A)',
          }}
        >
          <Typography sx={{ color: 'error.main', mb: 2 }}>{error}</Typography>
          <Button variant="contained" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  if (!dashboardData) return null;

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: { xs: 2, sm: 4 },
          background: 'radial-gradient(circle at top, #1A1A1A, #0A0A0A)',
          position: 'relative',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ color: 'text.primary' }}>
                Welcome, {dashboardData.user.first_name}! 👋
              </Typography>
              <Button variant="contained" onClick={logout}>
                Logout
              </Button>
            </Box>
          </motion.div>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                      Current Balance
                    </Typography>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', color: 'text.primary' }}>
                      {(dashboardData.stats.current_balance / 100).toFixed(2)} LP
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Loyalty Points
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                      Total Earned
                    </Typography>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                      +{(dashboardData.stats.total_earned / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      All Time
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                      Total Spent
                    </Typography>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                      -{(dashboardData.stats.total_spent / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      All Time
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
            <Box sx={{ flex: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                      Transactions
                    </Typography>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', color: 'text.primary' }}>
                      {dashboardData.stats.total_transactions}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Total Count
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                      Profile Info
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>Email:</strong> {dashboardData.user.email}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>Name:</strong> {dashboardData.user.first_name} {dashboardData.user.last_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>Status:</strong>
                        <span
                          style={{
                            color:  '#22c55e',
                            marginLeft: '0.5rem',
                          }}
                        >
                          {dashboardData.user.status}
                        </span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>Member Since:</strong> {new Date(dashboardData.user.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
            <Box sx={{ flex: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                      Hedera Wallet
                    </Typography>
                    {dashboardData.wallet ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <strong>Account ID:</strong> {dashboardData.wallet.hedera_account_id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <strong>Token ID:</strong> {dashboardData.wallet.token_id}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <strong>Balance:</strong> {dashboardData.wallet.formatted_balance} LP
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <strong>Status:</strong>
                          <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>
                            ✅ Connected
                          </span>
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <strong>Connected:</strong> {new Date(dashboardData.wallet.connected_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#ef4444' }}>
                        ❌ No wallet connected
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          </Box>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                  Recent Transactions
                </Typography>
                {dashboardData.transactions.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Balance After</TableCell>
                        <TableCell>Reference</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <span
                              style={{
                                color: tx.transaction_type === 'credit' ? '#22c55e' : '#ef4444',
                              }}
                            >
                              {tx.transaction_type === 'credit' ? '↗️ Credit' : '↘️ Debit'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              style={{
                                color: tx.transaction_type === 'credit' ? '#22c55e' : '#ef4444',
                              }}
                            >
                              {tx.transaction_type === 'credit' ? '+' : '-'}{(tx.amount / 100).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>{(tx.balance_after / 100).toFixed(2)} LP</TableCell>
                          <TableCell>{tx.reference || '-'}</TableCell>
                          <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    No transactions yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}