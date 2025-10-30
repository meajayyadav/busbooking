import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LandingPage = ({ user, login, logout }) => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [searchData, setSearchData] = useState({ from: '', to: '', date: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        login(data.token, data.user);
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
        setShowAuth(false);
      } else {
        toast.error(data.detail || 'Authentication failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchData.from || !searchData.to) {
      toast.error('Please enter both locations');
      return;
    }
    navigate(`/search?from=${searchData.from}&to=${searchData.to}&date=${searchData.date}`);
  };

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" data-testid="logo">BusGo</div>
          <div className="nav-links">
            {user ? (
              <>
                <button className="nav-btn" onClick={() => navigate('/profile')} data-testid="profile-btn">
                  Profile
                </button>
                {user.role === 'admin' && (
                  <button className="nav-btn" onClick={() => navigate('/admin')} data-testid="admin-btn">
                    Admin
                  </button>
                )}
                <button className="nav-btn" onClick={logout} data-testid="logout-btn">Logout</button>
              </>
            ) : (
              <button className="nav-btn primary" onClick={() => setShowAuth(true)} data-testid="login-btn">
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-content">
          <h1 data-testid="hero-title">
            Book Your <span className="gradient-text">Journey</span><br />With Ease
          </h1>
          <p data-testid="hero-subtitle">Travel comfortably across the country with our premium bus services</p>
          
          <div className="search-card" data-testid="search-card">
            <form className="search-form" onSubmit={handleSearch}>
              <div className="form-group">
                <label data-testid="from-label">From</label>
                <input
                  type="text"
                  placeholder="Departure city"
                  value={searchData.from}
                  onChange={(e) => setSearchData({ ...searchData, from: e.target.value })}
                  data-testid="from-input"
                />
              </div>
              <div className="form-group">
                <label data-testid="to-label">To</label>
                <input
                  type="text"
                  placeholder="Destination city"
                  value={searchData.to}
                  onChange={(e) => setSearchData({ ...searchData, to: e.target.value })}
                  data-testid="to-input"
                />
              </div>
              <div className="form-group">
                <label data-testid="date-label">Date</label>
                <input
                  type="date"
                  value={searchData.date}
                  onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
                  data-testid="date-input"
                />
              </div>
            </form>
            <button className="search-btn" onClick={handleSearch} data-testid="search-btn">
              Search Buses
            </button>
          </div>
        </div>
      </div>

      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)} data-testid="auth-modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} data-testid="auth-modal">
            <h2 className="modal-header" data-testid="modal-header">{isLogin ? 'Login' : 'Sign Up'}</h2>
            
            <div className="tab-buttons">
              <button
                className={`tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
                data-testid="login-tab"
              >
                Login
              </button>
              <button
                className={`tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
                data-testid="signup-tab"
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth}>
              {!isLogin && (
                <div className="form-group">
                  <label data-testid="name-label">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="name-input"
                  />
                </div>
              )}
              <div className="form-group">
                <label data-testid="email-label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="email-input"
                />
              </div>
              <div className="form-group">
                <label data-testid="password-label">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="password-input"
                />
              </div>
              <button type="submit" className="search-btn" style={{ width: '100%', marginTop: '1rem' }} data-testid="auth-submit-btn">
                {isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
