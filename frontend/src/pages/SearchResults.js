import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SearchResults = ({ user, logout }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  useEffect(() => {
    fetchBuses();
  }, [from, to]);

  const fetchBuses = async () => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/buses/search?route_from=${from}&route_to=${to}`;
      const response = await fetch(url);
      const data = await response.json();
      setBuses(data);
    } catch (error) {
      toast.error('Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (busId) => {
    if (!user) {
      toast.error('Please login to book a ticket');
      navigate('/');
      return;
    }
    navigate(`/booking/${busId}`);
  };

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo">BusGo</div>
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
              <button className="nav-btn primary" onClick={() => navigate('/')} data-testid="login-btn">
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }} data-testid="search-header">
          {from} → {to}
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }} data-testid="date-info">Travel Date: {date || 'Any date'}</p>

        {loading ? (
          <div className="loading" data-testid="loading">Loading buses...</div>
        ) : buses.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <h3>No buses found</h3>
            <p>Try searching with different locations</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} data-testid="bus-list">
            {buses.map((bus) => (
              <div key={bus.id} className="bus-card" data-testid={`bus-card-${bus.id}`}>
                <div className="bus-header">
                  <div className="bus-number" data-testid={`bus-number-${bus.id}`}>{bus.bus_number}</div>
                  <div className="bus-type" data-testid={`bus-type-${bus.id}`}>{bus.bus_type}</div>
                </div>
                
                <div className="route-info">
                  <span className="route-location" data-testid={`route-from-${bus.id}`}>{bus.route_from}</span>
                  <span className="route-arrow">→</span>
                  <span className="route-location" data-testid={`route-to-${bus.id}`}>{bus.route_to}</span>
                </div>
                
                <div className="time-info">
                  <div className="time-item">
                    <span className="time-label">Departure</span>
                    <span className="time-value" data-testid={`departure-${bus.id}`}>{bus.departure_time}</span>
                  </div>
                  <div className="time-item">
                    <span className="time-label">Arrival</span>
                    <span className="time-value" data-testid={`arrival-${bus.id}`}>{bus.arrival_time}</span>
                  </div>
                </div>
                
                {bus.amenities && bus.amenities.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Amenities:</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {bus.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '0.3rem 0.8rem',
                            background: '#F0F8FF',
                            borderRadius: '15px',
                            fontSize: '0.8rem',
                            color: '#4A90E2'
                          }}
                          data-testid={`amenity-${bus.id}-${idx}`}
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bus-footer">
                  <div>
                    <div className="price" data-testid={`price-${bus.id}`}>${bus.price}</div>
                    <div className="seats-available" data-testid={`seats-${bus.id}`}>
                      {bus.available_seats} seats available
                    </div>
                  </div>
                  <button className="book-btn" onClick={() => handleBooking(bus.id)} data-testid={`book-btn-${bus.id}`}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
