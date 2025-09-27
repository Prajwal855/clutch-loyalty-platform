import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
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
    primary: { main: '#B0B0B0' },
    background: {
      default: '#0A0A0A',
      paper: 'rgba(28, 28, 28, 0.85)',
    },
    text: { primary: '#FFFFFF', secondary: '#B0B0B0' },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '0.05em' },
    body2: { fontWeight: 400 },
  },
});

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
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
          Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPoints = async () => {
    try {
      setPayLoading(true);
      const response = await axios.post(
        `/payments/create_payment`,
        { amount: 10 },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        // 🚀 Redirects user to PayPal standard checkout
        window.location.href = response.data.approval_url;
      } else {
        alert('Failed to create PayPal order: ' + response.data.error);
      }
    } catch (err) {
      console.error('PayPal create order error:', err);
      alert('Something went wrong creating the PayPal order.');
    } finally {
      setPayLoading(false);
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
              }}
            >
              <Typography variant="h4" sx={{ color: 'text.primary' }}>
                Welcome, {dashboardData.user.first_name}! 👋
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleBuyPoints}
                  disabled={payLoading}
                >
                  {payLoading ? 'Redirecting...' : 'Buy 10 Points ($10)'}
                </Button>
                <Button variant="outlined" onClick={logout}>
                  Logout
                </Button>
              </Box>
            </Box>
            </motion.div>
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
    </ThemeProvider>
  );
}
