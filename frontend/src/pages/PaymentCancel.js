import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = ({ user, logout }) => {
  const navigate = useNavigate();

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo">BusGo</div>
          <div className="nav-links">
            {user ? (
              <>
                <button className="nav-btn" onClick={() => navigate('/profile')} data-testid="profile-btn">Profile</button>
                <button className="nav-btn" onClick={logout} data-testid="logout-btn">Logout</button>
              </>
            ) : (
              <button className="nav-btn primary" onClick={() => navigate('/')} data-testid="login-btn">Login</button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }} data-testid="payment-cancel-card">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }} data-testid="cancel-icon">⚠️</div>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#F57C00' }} data-testid="cancel-title">
            Payment Cancelled
          </h2>
          <p style={{ color: '#666', marginBottom: '2rem' }} data-testid="cancel-message">
            Your payment was cancelled. Your booking has not been confirmed.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="search-btn"
              onClick={() => navigate('/')}
              style={{ flex: 1 }}
              data-testid="search-again-btn"
            >
              Search Buses
            </button>
            {user && (
              <button
                className="nav-btn"
                onClick={() => navigate('/profile')}
                style={{ flex: 1 }}
                data-testid="view-profile-btn"
              >
                My Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
