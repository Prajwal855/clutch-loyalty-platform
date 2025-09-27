import React, { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

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
} from '@hashgraph/sdk';

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

// Hedera client configuration
const HEDERA_CLIENT = Client.forTestnet();
const OPERATOR_ID = process.env.REACT_APP_HEDERA_OPERATOR_ID!;
const OPERATOR_KEY = process.env.REACT_APP_HEDERA_OPERATOR_KEY!;
const REWARD_TOKEN_ID = process.env.REACT_APP_REWARD_TOKEN_ID!;

HEDERA_CLIENT.setOperator(
  AccountId.fromString(OPERATOR_ID),
  PrivateKey.fromString(OPERATOR_KEY)
);

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

  const fetchHederaBalance = useCallback(async () => {
    const walletId = dashboardData?.wallet?.hedera_account_id;
    if (!walletId) return;

    try {
      const accountId = AccountId.fromString(walletId);
      const balance = await new AccountBalanceQuery().setAccountId(accountId).execute(HEDERA_CLIENT);
      setHederaBalance(balance.hbars.toString());
    } catch (error) {
      console.error('Error fetching Hedera balance:', error);
    }
  }, [dashboardData]);

  const handleHbarTransfer = async () => {
    const walletId = dashboardData?.wallet?.hedera_account_id;
    if (!walletId || !transferAmount || !receiverAccountId) {
      setPaymentMessage({ type: 'error', message: 'Please fill in all transfer fields' });
      return;
    }

    try {
      setHederaLoading(true);
      setPaymentMessage(null);

      const senderAccountId = AccountId.fromString(walletId);
      const receiverAccount = AccountId.fromString(receiverAccountId);
      const amount = parseFloat(transferAmount);

      const transferTx = new TransferTransaction()
        .addHbarTransfer(senderAccountId, Hbar.from(amount * -1, HbarUnit.Hbar))
        .addHbarTransfer(receiverAccount, Hbar.from(amount, HbarUnit.Hbar))
        .freezeWith(HEDERA_CLIENT);

      const txResponse = await transferTx.execute(HEDERA_CLIENT);
      const receipt = await txResponse.getReceipt(HEDERA_CLIENT);

      if (receipt.status.toString() === 'SUCCESS') {
        const rewardAmount = Math.floor(amount / 100) * 2;
        if (rewardAmount > 0) await awardRewardTokens(senderAccountId, rewardAmount);

        setHederaTransactions(prev => [
          {
            id: txResponse.transactionId.toString(),
            type: 'HBAR_TRANSFER',
            amount,
            status: 'SUCCESS',
            hash: txResponse.transactionHash.toString(),
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);

        setPaymentMessage({
          type: 'success',
          message: `Transferred ${amount} HBAR${rewardAmount > 0 ? ` and earned ${rewardAmount} tokens!` : ''}`,
        });
        setTransferDialogOpen(false);
        setTransferAmount('');
        setReceiverAccountId('');
        await fetchHederaBalance();
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      setPaymentMessage({ type: 'error', message: `Transfer failed: ${error.message}` });
    } finally {
      setHederaLoading(false);
    }
  };

  const awardRewardTokens = async (userAccountId: AccountId, amount: number) => {
    try {
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
    } catch (error) {
      console.error('Reward error:', error);
    }
  };

  const createAndMintNFT = async () => {
    const walletId = dashboardData?.wallet?.hedera_account_id;
    if (!walletId || !nftName || !nftDescription) {
      setPaymentMessage({ type: 'error', message: 'Please fill in all NFT fields' });
      return;
    }

    try {
      setHederaLoading(true);
      setPaymentMessage(null);

      const treasuryAccountId = AccountId.fromString(walletId);
      const supplyKey = PrivateKey.generate();

      const nftCreateTx = new TokenCreateTransaction()
        .setTokenName(nftName)
        .setTokenSymbol('HNFT')
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setMaxSupply(250)
        .setSupplyType(TokenSupplyType.Finite)
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyKey(supplyKey)
        .freezeWith(HEDERA_CLIENT);

      const createResponse = await nftCreateTx.execute(HEDERA_CLIENT);
      const createReceipt = await createResponse.getReceipt(HEDERA_CLIENT);
      const tokenId = createReceipt.tokenId!.toString();

      if (walletId !== OPERATOR_ID) {
        await new TokenAssociateTransaction()
          .setAccountId(treasuryAccountId)
          .setTokenIds([tokenId])
          .freezeWith(HEDERA_CLIENT)
          .execute(HEDERA_CLIENT);
      }

      const metadata = JSON.stringify({ name: nftName, description: nftDescription });
      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .addMetadata(Buffer.from(metadata))
        .freezeWith(HEDERA_CLIENT);

      const signedMint = await (await mintTx.sign(supplyKey)).execute(HEDERA_CLIENT);
      const mintReceipt = await signedMint.getReceipt(HEDERA_CLIENT);

      if (mintReceipt.status.toString() === 'SUCCESS') {
        setUserNFTs(prev => [
          {
            tokenId,
            serialNumber: 1,
            name: nftName,
            description: nftDescription,
            metadata,
            owner: walletId,
          },
          ...prev,
        ]);

        setHederaTransactions(prev => [
          {
            id: signedMint.transactionId.toString(),
            type: 'NFT_TRANSFER',
            status: 'SUCCESS',
            hash: signedMint.transactionHash.toString(),
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);

        setPaymentMessage({ type: 'success', message: `NFT "${nftName}" created (Token ID: ${tokenId})` });
        setNftDialogOpen(false);
        setNftName('');
        setNftDescription('');
      }
    } catch (error: any) {
      console.error('NFT error:', error);
      setPaymentMessage({ type: 'error', message: `NFT creation failed: ${error.message}` });
    } finally {
      setHederaLoading(false);
    }
  };

  const handleBuyPoints = async () => {
    try {
      setPayLoading(true);
      setPaymentMessage(null);
      const response = await axios.post(
        'http://localhost:3001/payment/create_order',
        { amount: 10 },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,  
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data.success) window.location.href = response.data.approval_url;
      else setPaymentMessage({ type: 'error', message: response.data.error });
    } catch (err: any) {
      console.error(err);
      setPaymentMessage({ type: 'error', message: err.response?.data?.error || 'Payment error' });
    } finally {
      setPayLoading(false);
    }
  };

  const handleCaptureOrder = useCallback(
    async (orderId: string) => {
      try {
        setPayLoading(true);
        setPaymentMessage(null);
        const response = await axios.post(
          '/payments/capture_order',
          { order_id: orderId },
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.data.success) {
          setPaymentMessage({
            type: 'success',
            message: `Payment successful! ${response.data.points_awarded / 100} points awarded.`,
          });
          await fetchDashboardData();
        } else {
          setPaymentMessage({ type: 'error', message: response.data.error });
        }
      } catch (err) {
        console.error(err);
        setPaymentMessage({ type: 'error', message: 'Capture error' });
      } finally {
        setPayLoading(false);
      }
    },
    [fetchDashboardData]
  );

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const orderId = query.get('token');
    if (orderId) {
      handleCaptureOrder(orderId);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location, handleCaptureOrder]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dashboardData?.wallet) fetchHederaBalance();
  }, [dashboardData, fetchHederaBalance]);

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
                <Button variant="contained" onClick={handleBuyPoints} disabled={payLoading}>
                  {payLoading ? 'Redirecting...' : 'Buy 10 Points ($10)'}
                </Button>
                <Button variant="outlined" onClick={logout}>
                  Logout
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
                        Account ID: {dashboardData.wallet.hedera_account_id}
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
                        <Button variant="contained" size="small" onClick={() => setTransferDialogOpen(true)} disabled={hederaLoading}>
                          Transfer HBAR
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => setNftDialogOpen(true)} disabled={hederaLoading}>
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
              autoFocus
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
              placeholder="100"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Earn 2 reward tokens for every 100 HBAR transferred!
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleHbarTransfer} variant="contained" disabled={hederaLoading || !transferAmount || !receiverAccountId}>
              {hederaLoading ? <CircularProgress size={20} /> : 'Transfer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* NFT Creation Dialog */}
        <Dialog open={nftDialogOpen} onClose={() => setNftDialogOpen(false)}>
          <DialogTitle>Create NFT</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="NFT Name"
              type="text"
              fullWidth
              variant="outlined"
              value={nftName}
              onChange={e => setNftName(e.target.value)}
              placeholder="My Cool NFT"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={nftDescription}
              onChange={e => setNftDescription(e.target.value)}
              placeholder="This is my amazing NFT..."
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNftDialogOpen(false)}>Cancel</Button>
            <Button onClick={createAndMintNFT} variant="contained" disabled={hederaLoading || !nftName || !nftDescription}>
              {hederaLoading ? <CircularProgress size={20} /> : 'Create NFT'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
