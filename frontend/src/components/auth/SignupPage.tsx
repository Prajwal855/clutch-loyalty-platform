import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Stepper, Step, StepLabel, CircularProgress, createTheme, ThemeProvider } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
} from '@hashgraph/hedera-wallet-connect';
import { Client, AccountBalanceQuery, LedgerId } from '@hashgraph/sdk';

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
    MuiStepper: {
      styleOverrides: {
        root: {
          '& .MuiStepIcon-root': {
            color: 'rgba(255, 255, 255, 0.2)',
            '&.Mui-active': {
              color: '#B0B0B0',
            },
            '&.Mui-completed': {
              color: '#FFFFFF',
            },
          },
          '& .MuiStepLabel-label': {
            color: 'rgba(255, 255, 255, 0.6)',
            '&.Mui-active': {
              color: '#FFFFFF',
            },
            '&.Mui-completed': {
              color: '#B0B0B0',
            },
          },
        },
      },
    },
  },
});

const projectId = '00a80c9d1c9b960c3d5dfdb56cd90d90';

const metadata = {
  name: 'Hedera Testnet DApp',
  description: 'Connect HashPack Wallet (Testnet)',
  url: 'http://localhost:5173',
  icons: ['https://upload.wikimedia.org/wikipedia/commons/5/5a/Hedera-logo.png'],
};

const steps = ['Sign Up', 'Verify OTP', 'Connect Wallet'];

export default function Signup() {
  const dAppConnRef = useRef<DAppConnector | null>(null);
  const { register, verifyOtp, connectWallet, login } = useAuth();
  const [step, setStep] = useState<'signup' | 'otp' | 'wallet'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);

  const navigate = useNavigate();

  const stepIndex = step === 'signup' ? 0 : step === 'otp' ? 1 : 2;

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (dAppConnRef.current && sessionTopic) {
        dAppConnRef.current
          .disconnect(sessionTopic)
          .catch((err) => console.error('Disconnect error:', err));
        dAppConnRef.current = null;
        setSessionTopic(null);
      }
    };
  }, [sessionTopic]);

  // Handle WalletConnect session events
  useEffect(() => {
    if (!dAppConnRef.current || !dAppConnRef.current.walletConnectClient) return;

    const handleSessionEvent = async (event: any) => {
      console.log('Session event:', event);
      if (event.params?.event?.name === HederaSessionEvent.AccountsChanged) {
        const newAccs = event.params.event.data as string[];
        if (newAccs.length > 0) {
          const hederaAccountId = newAccs[0].split(':').pop() || '';
          console.log('New account ID from AccountsChanged:', hederaAccountId);
          setAccountId(hederaAccountId);
          setConnected(true);

          await loadBalance(hederaAccountId);

          try {
            console.log('Calling connectWallet with account ID:', hederaAccountId);
            const connectRes = await connectWallet(hederaAccountId);
            console.log('Connect wallet response:', connectRes);
            if (connectRes.success) {
              console.log('Calling login with email:', email);
              await login(email, password);
              console.log('Login successful, navigating to dashboard');
              navigate('/dashboard');
            } else {
              setError('Failed to store wallet address');
            }
          } catch (err: any) {
            console.error('Backend error:', err);
            setError(err.message || 'Backend wallet connect failed');
          }
        } else {
          setError('No accounts found in AccountsChanged event');
        }
      }
    };

    const handleSessionProposal = async (event: any) => {
      console.log('Session proposal:', event);
      const topic = event.params?.id || event.id;
      if (topic) {
        setSessionTopic(topic);
        console.log('Session topic set:', topic);
      }

      // Attempt to get session after proposal
      if (dAppConnRef.current?.walletConnectClient) {
        const sessions = dAppConnRef.current.walletConnectClient.session.getAll();
        console.log('Sessions after proposal:', sessions);
        if (sessions.length > 0) {
          const session = sessions[0];
          const hederaAccounts = session.namespaces?.hedera?.accounts || [];
          if (hederaAccounts.length > 0) {
            const hederaAccount = hederaAccounts[0];
            const hederaAccountId = hederaAccount.split(':')[2] || '';
            console.log('Extracted account ID from session:', hederaAccountId);
            setAccountId(hederaAccountId);
            setConnected(true);

            await loadBalance(hederaAccountId);

            try {
              console.log('Calling connectWallet with account ID:', hederaAccountId);
              const connectRes = await connectWallet(hederaAccountId);
              console.log('Connect wallet response:', connectRes);
              if (connectRes.success) {
                console.log('Calling login with email:', email);
                await login(email, password);
                console.log('Login successful, navigating to dashboard');
                navigate('/dashboard');
              } else {
                setError('Failed to store wallet address');
              }
            } catch (err: any) {
              console.error('Backend error:', err);
              setError(err.message || 'Backend wallet connect failed');
            }
          } else {
            setError('No Hedera accounts found in session');
          }
        }
      }
    };

    const handleSessionDelete = (event: any) => {
      console.log('Session delete event:', event);
      setConnected(false);
      setError('Wallet connection cancelled or failed');
      setLoading(false);
      setSessionTopic(null);
    };

    dAppConnRef.current.walletConnectClient.on('session_proposal', handleSessionProposal);
    dAppConnRef.current.walletConnectClient.on('session_event', handleSessionEvent);
    dAppConnRef.current.walletConnectClient.on('session_delete', handleSessionDelete);

    return () => {
      if (dAppConnRef.current?.walletConnectClient) {
        dAppConnRef.current.walletConnectClient.off('session_proposal', handleSessionProposal);
        dAppConnRef.current.walletConnectClient.off('session_event', handleSessionEvent);
        dAppConnRef.current.walletConnectClient.off('session_delete', handleSessionDelete);
      }
    };
  }, [connectWallet, email, password, navigate, login]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('Starting signup with:', { email, firstName, lastName });
      await register({ email, password, firstName, lastName });
      console.log('Signup successful, moving to OTP step');
      setStep('otp');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('Verifying OTP:', otpCode);
      await verifyOtp(otpCode);
      console.log('OTP verified, moving to wallet step');
      setStep('wallet');
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectWallet(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!dAppConnRef.current) {
        dAppConnRef.current = new DAppConnector(
          metadata,
          LedgerId.TESTNET,
          projectId,
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.AccountsChanged],
          [HederaChainId.Testnet]
        );
        await dAppConnRef.current.init({ logger: 'debug' });
        console.log('DAppConnector initialized');
      }

      console.log('Opening WalletConnect modal');
      await dAppConnRef.current.openModal();
      console.log('Modal opened, awaiting user interaction');

      // Check for active sessions after modal approval
      if (dAppConnRef.current?.walletConnectClient) {
        const sessions = dAppConnRef.current.walletConnectClient.session.getAll();
        console.log('Sessions after openModal:', sessions);
        if (sessions.length > 0) {
          const session = sessions[0];
          const topic = session.topic;
          setSessionTopic(topic);
          console.log('Session topic set:', topic);

          const hederaAccounts = session.namespaces?.hedera?.accounts || [];
          if (hederaAccounts.length > 0) {
            const hederaAccount = hederaAccounts[0];
            const hederaAccountId = hederaAccount.split(':')[2] || '';
            console.log('Extracted account ID from session:', hederaAccountId);
            setAccountId(hederaAccountId);
            setConnected(true);

            await loadBalance(hederaAccountId);

            try {
              console.log('Calling connectWallet with account ID:', hederaAccountId);
              const connectRes = await connectWallet(hederaAccountId);
              console.log('Connect wallet response:', connectRes);
              if (connectRes.success) {
                console.log('Calling login with email:', email);
                await login(email, password);
                console.log('Login successful, navigating to dashboard');
                navigate('/dashboard');
              } else {
                setError('Failed to store wallet address');
              }
            } catch (err: any) {
              console.error('Backend error:', err);
              setError(err.message || 'Backend wallet connect failed');
            }
          } else {
            setError('No Hedera accounts found in session');
          }
        } else {
          setError('No session created after wallet approval');
        }
      } else {
        setError('WalletConnect client not initialized');
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }

  async function loadBalance(account: string) {
    try {
      const client = Client.forTestnet();
      const balanceQuery = new AccountBalanceQuery().setAccountId(account);
      const result = await balanceQuery.execute(client);
      setBalance(result.hbars.toString());
      console.log('Account balance:', result.hbars.toString());
    } catch (err) {
      console.error('Balance query failed:', err);
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
            variant="outlined"
            onClick={() => navigate('/login')}
            sx={{ color: 'text.primary', borderColor: 'text.secondary' }}
          >
            Login
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/')}
            sx={{ pointerEvents: 'none', opacity: 0.7 }}
          >
            Signup
          </Button>
        </Box>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h2" sx={{ mb: 4, color: 'text.primary', textAlign: 'center' , fontSize: "Bold"}}>
           Clutch
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: 'grey', textAlign: 'center', fontSize: "Bold" }}>
            Web3 Loyalty Platform
          </Typography>
          <Typography variant="h4" sx={{ mb: 4, color: 'text.primary', textAlign: 'center' }}>
            Create Your Account
          </Typography>
        </motion.div>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 500 }}
        >
          <Stepper activeStep={stepIndex} alternativeLabel sx={{ mb: 4, bgcolor: 'transparent' }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-labelContainer': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
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
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: step === 'signup' ? 300 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: step === 'signup' ? -300 : 300, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{ width: '100%' }}
              >
                {step === 'signup' && (
                  <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                      label="First Name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Last Name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      fullWidth
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
                      {loading ? <CircularProgress size={24} sx={{ color: 'text.secondary' }} /> : 'Sign Up'}
                    </Button>
                  </Box>
                )}
                {step === 'otp' && (
                  <Box component="form" onSubmit={handleVerifyOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Enter OTP"
                      type="text"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      fullWidth
                      InputProps={{
                        sx: { color: 'text.primary', textAlign: 'center', letterSpacing: '0.2em' },
                      }}
                    />
                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <Typography color="error" variant="body2" sx={{ textAlign: 'center' }}>
                          {error}
                        </Typography>
                      </motion.div>
                    )}
                    <Button type="submit" variant="contained" disabled={loading} fullWidth>
                      {loading ? <CircularProgress size={24} sx={{ color: 'text.secondary' }} /> : 'Verify OTP'}
                    </Button>
                  </Box>
                )}
                {step === 'wallet' && (
                  <Box component="form" onSubmit={handleConnectWallet} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Button type="submit" variant="contained" disabled={loading || connected} fullWidth>
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: 'text.secondary' }} />
                      ) : connected ? (
                        'Wallet Connected'
                      ) : (
                        'Connect Hedera Wallet (HashPack)'
                      )}
                    </Button>
                    {!loading && !connected && (
                      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                        Please approve the connection in your HashPack wallet. If a modal appears with a pairing string or QR code, copy the string and paste it into HashPack, or scan the QR code.
                      </Typography>
                    )}
                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <Typography color="error" variant="body2" sx={{ textAlign: 'center' }}>
                          {error}
                        </Typography>
                      </motion.div>
                    )}
                    {connected && (
                      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                        Connected Account: {accountId} <br />
                        Balance: {balance} HBAR
                      </Typography>
                    )}
                  </Box>
                )}
              </motion.div>
            </AnimatePresence>
          </Box>
        </motion.div>
      </Box>
    </ThemeProvider>
  );
}