import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  createTheme,
  ThemeProvider,
  Alert,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
} from '@hashgraph/hedera-wallet-connect';

// Hedera SDK imports
import {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
  HbarUnit,
  TokenMintTransaction,
  TokenAssociateTransaction,
  AccountBalanceQuery,
  TransactionId,
  LedgerId,
  Transaction
} from '@hashgraph/sdk';

// Define SignTransactionParams interface based on error and API expectations
interface SignTransactionParams {
  signerAccountId: any;
  transactionBody: any;
}

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

// interface Transaction {
//   id: number;
//   transaction_type: string;
//   amount: number;
//   balance_after: number;
//   reference: string;
//   status: string;
//   created_at: string;
// }

interface HederaTransaction {
  id: string;
  type: 'HBAR_TRANSFER' | 'TOKEN_REWARD' | 'NFT_TRANSFER';
  amount?: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  hash: string;
  timestamp: string;
}

interface NFTData {
  tokenId: string;
  serialNumber: number;
  name: string;
  description: string;
  metadata: string;
  owner: string;
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

// Defensive environment variable loading
const OPERATOR_ID = process.env.REACT_APP_HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.REACT_APP_HEDERA_OPERATOR_KEY;
const REWARD_TOKEN_ID = process.env.REACT_APP_REWARD_TOKEN_ID;

if (!OPERATOR_ID || !OPERATOR_KEY || !REWARD_TOKEN_ID) {
  throw new Error(
    'Missing required Hedera environment variables: REACT_APP_HEDERA_OPERATOR_ID, REACT_APP_HEDERA_OPERATOR_KEY, REACT_APP_REWARD_TOKEN_ID'
  );
}

// WalletConnect project ID and metadata
const projectId = '00a80c9d1c9b960c3d5dfdb56cd90d90';
const metadata = {
  name: 'Hedera Transfer App',
  description: 'A secure HBAR transfer application',
  url: window.location.origin,
  icons: ['https://upload.wikimedia.org/wikipedia/commons/5/5a/Hedera-logo.png'],
};

// Hedera client configuration
const HEDERA_CLIENT = Client.forTestnet();
HEDERA_CLIENT.setOperator(AccountId.fromString(OPERATOR_ID), PrivateKey.fromString(OPERATOR_KEY));
const userClient = Client.forTestnet(); // Client without operator for user transactions

export default function Dashboard() {
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const location = useLocation();

  // Hedera-specific states
  const [hederaTransactions, setHederaTransactions] = useState<HederaTransaction[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [nftDialogOpen, setNftDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [receiverAccountId, setReceiverAccountId] = useState('');
  const [hederaLoading, setHederaLoading] = useState(false);
  const [userNFTs, setUserNFTs] = useState<NFTData[]>([]);
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [hederaBalance, setHederaBalance] = useState<string>('0');
  const [connected, setConnected] = useState(false);
  const [pairedAccountId, setPairedAccountId] = useState<string | null>(null);
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const dAppConnRef = useRef<DAppConnector | null>(null);

  // Initialize DAppConnector
  useEffect(() => {
    const initWalletConnect = async () => {
      try {
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

        // Check for existing sessions
        const sessions = dAppConnRef.current.walletConnectClient?.session.getAll() || [];
        if (sessions.length > 0) {
          const session = sessions[0];
          setSessionTopic(session.topic);
          const hederaAccounts = session.namespaces?.hedera?.accounts || [];
          if (hederaAccounts.length > 0) {
            const hederaAccountId = hederaAccounts[0].split(':')[2] || '';
            setPairedAccountId(hederaAccountId);
            setConnected(true);
            await fetchHederaBalance(hederaAccountId);
          }
        }

        // Handle session events
        dAppConnRef.current.walletConnectClient?.on('session_proposal', async (event) => {
          console.log('Session proposal:', event);
          const topic: any = event.params?.id || event.id;
          setSessionTopic(topic);

          const sessions = dAppConnRef.current?.walletConnectClient?.session.getAll() || [];
          if (sessions.length > 0) {
            const session = sessions[0];
            const hederaAccounts = session.namespaces?.hedera?.accounts || [];
            if (hederaAccounts.length > 0) {
              const hederaAccountId = hederaAccounts[0].split(':')[2] || '';
              setPairedAccountId(hederaAccountId);
              setConnected(true);
              await fetchHederaBalance(hederaAccountId);
            }
          }
        });

        dAppConnRef.current.walletConnectClient?.on('session_event', async (event) => {
          console.log('Session event:', event);
          if (event.params?.event?.name === HederaSessionEvent.AccountsChanged) {
            const newAccs = event.params.event.data as string[];
            if (newAccs.length > 0) {
              const hederaAccountId = newAccs[0].split(':').pop() || '';
              setPairedAccountId(hederaAccountId);
              setConnected(true);
              await fetchHederaBalance(hederaAccountId);
            } else {
              setError('No accounts found in AccountsChanged event');
              setConnected(false);
            }
          }
        });

        dAppConnRef.current.walletConnectClient?.on('session_delete', () => {
          console.log('Session deleted');
          setConnected(false);
          setPairedAccountId(null);
          setSessionTopic(null);
        });
      } catch (error) {
        console.error('WalletConnect initialization failed:', error);
        setError('Failed to initialize HashPack wallet');
      }
    };

    initWalletConnect();

    return () => {
      if (dAppConnRef.current && sessionTopic) {
        dAppConnRef.current
          .disconnect(sessionTopic)
          .catch((err) => console.error('Disconnect error:', err));
        dAppConnRef.current = null;
        setSessionTopic(null);
      }
    };
  }, []);

  const connectToHashPack = async () => {
    if (dAppConnRef.current && !connected) {
      try {
        await dAppConnRef.current.openModal();
        console.log('WalletConnect modal opened');
      } catch (error) {
        console.error('HashPack connection failed:', error);
        setPaymentMessage({ type: 'error', message: 'Failed to connect to HashPack' });
      }
    }
  };

  const fetchDashboardData = useCallback(async () => {
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
  }, [logout]);

  const fetchHederaBalance = useCallback(
    async (accountId?: string) => {
      const walletId = accountId || pairedAccountId || dashboardData?.wallet?.hedera_account_id;
      if (!walletId || typeof walletId !== 'string') return;

      try {
        const accountIdObj = AccountId.fromString(walletId);
        const balance = await new AccountBalanceQuery().setAccountId(accountIdObj).execute(userClient);
        setHederaBalance(balance.hbars.toString());
      } catch (error) {
        console.error('Error fetching Hedera balance:', error);
      }
    },
    [dashboardData, pairedAccountId]
  );

const handleHbarTransfer = async () => {
  if (!pairedAccountId || !dAppConnRef.current || !sessionTopic) {
    setPaymentMessage({ type: 'error', message: 'Please connect to HashPack wallet' });
    return;
  }
  if (!transferAmount || isNaN(Number(transferAmount))) {
    setPaymentMessage({ type: 'error', message: 'Valid transfer amount is required' });
    return;
  }
  if (!receiverAccountId.trim()) {
    setPaymentMessage({ type: 'error', message: 'Receiver account ID is required' });
    return;
  }

  try {
    setHederaLoading(true);
    setPaymentMessage(null);

    // Parse and verify accounts
    const senderAccountId = AccountId.fromString(pairedAccountId);
    const receiverAccount = AccountId.fromString(receiverAccountId.trim());
    await new AccountBalanceQuery().setAccountId(senderAccountId).execute(userClient);
    await new AccountBalanceQuery().setAccountId(receiverAccount).execute(userClient);

    // Build & freeze transaction
    const amount = parseFloat(transferAmount);
    const txId = TransactionId.generate(senderAccountId);
    const transferTx = new TransferTransaction()
      .setTransactionId(txId)
      .addHbarTransfer(senderAccountId, Hbar.from(-amount, HbarUnit.Hbar))
      .addHbarTransfer(receiverAccount, Hbar.from(amount, HbarUnit.Hbar))
      .setNodeAccountIds([
        AccountId.fromString('0.0.3'),
        AccountId.fromString('0.0.4'),
        AccountId.fromString('0.0.5'),
      ])
      .freezeWith(userClient);

    // Serialize and Base64-encode
    const bytes = transferTx.toBytes();
    const b64 = btoa(String.fromCharCode(...Array.from(bytes)));

    // Use the public signAndExecuteTransaction API
    // Note: parameter name is `transactionList`
    const result: any = await dAppConnRef.current.signAndExecuteTransaction({
      signerAccountId: `hedera:testnet:${pairedAccountId}`,
      transactionList: b64,
    });

    const txIdStr: string = result.transactionId;
    const txHash: string = result.transactionHash;
    if (!txIdStr) {
      throw new Error('HashPack did not return a transaction ID');
    }

    // Award rewards if any
 const rewardAmount = Math.floor((amount * 1) / 100);
if (rewardAmount > 0) {
  await awardRewardTokens(senderAccountId, rewardAmount);
}

    // Update state
    setHederaTransactions(prev => [
      {
        id: txIdStr,
        type: 'HBAR_TRANSFER',
        amount,
        status: 'SUCCESS',
        hash: txHash,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    setPaymentMessage({
      type: 'success',
      message: `Transferred ${amount} HBAR${rewardAmount ? ` and earned ${rewardAmount} tokens!` : ''}`,
    });
    setTransferDialogOpen(false);
    setTransferAmount('');
    setReceiverAccountId('');
    await fetchHederaBalance();
  } catch (err: any) {
    console.error('Transfer error:', err);
    setPaymentMessage({ type: 'error', message: `Transfer failed: ${err.message}` });
  } finally {
    setHederaLoading(false);
  }
};




  const awardRewardTokens = async (userAccountId: AccountId, amount: number) => {
    try {
      const REWARD_TOKEN_ID_RAW = process.env.REACT_APP_REWARD_TOKEN_ID;
      const OPERATOR_ID_RAW = process.env.REACT_APP_HEDERA_OPERATOR_ID;

      if (!REWARD_TOKEN_ID_RAW) {
        throw new Error('Missing required environment variable: REACT_APP_REWARD_TOKEN_ID');
      }
      if (!OPERATOR_ID_RAW) {
        throw new Error('Missing required environment variable: REACT_APP_HEDERA_OPERATOR_ID');
      }

      const REWARD_TOKEN_ID: string = REWARD_TOKEN_ID_RAW;
      const OPERATOR_ID: string = OPERATOR_ID_RAW;

      const rewardTx = new TransferTransaction()
        .addTokenTransfer(REWARD_TOKEN_ID, AccountId.fromString(OPERATOR_ID), -amount)
        .addTokenTransfer(REWARD_TOKEN_ID, userAccountId, amount)
        .freezeWith(HEDERA_CLIENT);

      const txResponse = await rewardTx.execute(HEDERA_CLIENT);
      const receipt = await txResponse.getReceipt(HEDERA_CLIENT);

      if (receipt.status.toString() === 'SUCCESS') {
        setHederaTransactions(prev => [
          {
            id: txResponse.transactionId.toString(),
            type: 'TOKEN_REWARD',
            amount,
            status: 'SUCCESS',
            hash: txResponse.transactionHash.toString(),
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (error:any) {
      console.error('Reward error:', {
        message: error.message,
        status: error.status?.toString(),
        transactionId: error.transactionId?.toString(),
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dashboardData?.wallet || pairedAccountId) fetchHederaBalance();
  }, [dashboardData, pairedAccountId, fetchHederaBalance]);

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
          <Typography sx={{ color: 'text.secondary', ml: 2 }}>Loading dashboard...</Typography>
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
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ color: 'text.primary' }}>
                Welcome, {dashboardData.user.first_name}! 👋
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" disabled={payLoading}>
                  {payLoading ? 'Redirecting...' : 'Buy 10 Points ($10)'}
                </Button>
                <Button variant="outlined" onClick={logout}>
                  Logout
                </Button>
                <Button variant="contained" onClick={connectToHashPack} disabled={connected}>
                  {connected ? 'HashPack Connected' : 'Connect HashPack'}
                </Button>
              </Box>
            </Box>
            {paymentMessage && (
              <Alert severity={paymentMessage.type} sx={{ mb: 2 }}>
                {paymentMessage.message}
              </Alert>
            )}
          </motion.div>

          {dashboardData.wallet && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                    🔗 Hedera Wallet
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Card>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Account ID: {pairedAccountId || dashboardData.wallet.hedera_account_id}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        HBAR Balance: {hederaBalance}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Token Balance: {dashboardData.wallet.formatted_balance} LP
                      </Typography>
                    </Card>
                    <Card>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => setTransferDialogOpen(true)}
                          disabled={hederaLoading || !connected}
                        >
                          Transfer HBAR
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setNftDialogOpen(true)}
                          disabled={hederaLoading}
                        >
                          Create NFT
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </Box>

        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)}>
          <DialogTitle>Transfer HBAR</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Receiver Account ID"
              type="text"
              fullWidth
              variant="outlined"
              value={receiverAccountId}
              onChange={e => setReceiverAccountId(e.target.value)}
              placeholder="0.0.123456"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Amount (HBAR)"
              type="number"
              fullWidth
              variant="outlined"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              placeholder="0.1"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Earn 2 reward tokens for every 100 HBAR transferred! Ensure HashPack is connected.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleHbarTransfer}
              variant="contained"
              disabled={hederaLoading || !transferAmount || !receiverAccountId || !connected}
            >
              {hederaLoading ? <CircularProgress size={20} /> : 'Transfer'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}