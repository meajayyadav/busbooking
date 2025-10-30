import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const PaymentSuccess = ({ user, logout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setLoading(false);
      toast.error('Payment verification timed out');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/payments/status/${sessionId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        setPaymentStatus('success');
        setLoading(false);
        toast.success('Payment successful!');
        return;
      } else if (data.status === 'expired') {
        setPaymentStatus('failed');
        setLoading(false);
        toast.error('Payment session expired');
        return;
      }

      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      setLoading(false);
      toast.error('Failed to verify payment');
    }
  };

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo">BusGo</div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/profile')} data-testid="profile-btn">Profile</button>
            <button className="nav-btn" onClick={logout} data-testid="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }} data-testid="payment-success-card">
          {loading ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }} data-testid="loading-icon">⏳</div>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }} data-testid="verifying-title">
                Verifying Payment
              </h2>
              <p style={{ color: '#666', marginBottom: '2rem' }} data-testid="verifying-message">
                Please wait while we confirm your payment...
              </p>
            </>
          ) : paymentStatus === 'success' ? (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }} data-testid="success-icon">✓</div>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2E7D32' }} data-testid="success-title">
                Payment Successful!
              </h2>
              <p style={{ color: '#666', marginBottom: '2rem' }} data-testid="success-message">
                Your booking has been confirmed. You can view and download your ticket from your profile.
              </p>
              <button
                className="search-btn"
                onClick={() => navigate('/profile')}
                style={{ width: '100%' }}
                data-testid="view-bookings-btn"
              >
                View My Bookings
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }} data-testid="error-icon">✗</div>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#D32F2F' }} data-testid="error-title">
                Payment Verification Failed
              </h2>
              <p style={{ color: '#666', marginBottom: '2rem' }} data-testid="error-message">
                We couldn't verify your payment. Please contact support if amount was deducted.
              </p>
              <button
                className="search-btn"
                onClick={() => navigate('/')}
                style={{ width: '100%' }}
                data-testid="go-home-btn"
              >
                Go to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
