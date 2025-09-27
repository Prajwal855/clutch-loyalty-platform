import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, CircularProgress, createTheme, ThemeProvider } from '@mui/material';
import { motion } from 'framer-motion';

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
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: '#FFFFFF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#B0B0B0',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.6)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#B0B0B0',
          },
        },
      },
    },
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
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(45deg, #A0A0A0, #C0C0C0)',
            color: '#FFFFFF',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #B0B0B0, #D0D0D0)',
            },
          },
        },
      },
    },
  },
});

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('Attempting login with:', { email });
      await login(email, password);
      console.log('Login successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

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
          p: { xs: 2, sm: 4 },
          background: 'radial-gradient(circle at top, #1A1A1A, #0A0A0A)',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/login')}
            sx={{ pointerEvents: 'none', opacity: 0.7 }}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{ color: 'text.primary', borderColor: 'text.secondary' }}
          >
            Signup
          </Button>
        </Box>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" sx={{ mb: 4, color: 'text.primary', textAlign: 'center' }}>
            Log In to Your Account
          </Typography>
        </motion.div>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 500 }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '16px',
              p: 4,
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                InputProps={{
                  sx: { color: 'text.primary' },
                }}
              />
              <TextField
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <Typography color="error" variant="body2" sx={{ textAlign: 'center' }}>
                    {error}
                  </Typography>
                </motion.div>
              )}
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? <CircularProgress size={24} sx={{ color: 'text.secondary' }} /> : 'Log In'}
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </ThemeProvider>
  );
}