import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress, Typography, Button, Box } from '@mui/material';

const PayPalCapture: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token'); // PayPal returns "token" query param as order ID

    if (!orderId) {
      setStatus('error');
      setErrorMessage('Missing PayPal order ID.');
      return;
    }

    const captureOrder = async () => {
      try {
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
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(response.data.error || 'Failed to capture PayPal order.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Network or server error capturing PayPal order.');
      }
    };

    captureOrder();
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: 3,
        bgcolor: 'background.default',
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Finalizing your payment, please wait...</Typography>
        </>
      )}
      {status === 'success' && (
        <>
          <Typography variant="h6" sx={{ color: 'success.main' }}>Payment successful! Loyalty points awarded.</Typography>
          <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </>
      )}
      {status === 'error' && (
        <>
          <Typography variant="h6" sx={{ color: 'error.main' }}>Payment failed</Typography>
          <Typography sx={{ mt: 1, mb: 3 }}>{errorMessage}</Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </>
      )}
    </Box>
  );
};

export default PayPalCapture;
