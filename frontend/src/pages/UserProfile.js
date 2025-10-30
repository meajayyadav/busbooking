import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UserProfile = ({ user, logout }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bookings/${bookingId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket_${bookingId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Ticket downloaded successfully');
      } else {
        toast.error('Failed to download ticket');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const retryPayment = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          host_url: window.location.origin
        })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to initiate payment');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Booking cancelled successfully');
        fetchBookings();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to cancel booking');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo">BusGo</div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/')} data-testid="home-btn">Home</button>
            {user?.role === 'admin' && (
              <button className="nav-btn" onClick={() => navigate('/admin')} data-testid="admin-btn">Admin</button>
            )}
            <button className="nav-btn" onClick={logout} data-testid="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }} data-testid="profile-title">
            My Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Name</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }} data-testid="user-name">{user?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Email</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }} data-testid="user-email">{user?.email}</div>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#1a1a1a' }} data-testid="bookings-title">
          My Bookings
        </h3>

        {loading ? (
          <div className="loading" data-testid="loading">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <h3>No bookings yet</h3>
            <p>Start your journey by booking a bus</p>
            <button className="nav-btn primary" onClick={() => navigate('/')} data-testid="book-now-btn">
              Book Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} data-testid="bookings-list">
            {bookings.map((booking) => (
              <div key={booking.id} style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} data-testid={`booking-card-${booking.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' }} data-testid={`booking-bus-${booking.id}`}>
                      {booking.bus_details?.bus_number}
                    </div>
                    <div style={{ color: '#666', fontSize: '1.1rem' }} data-testid={`booking-route-${booking.id}`}>
                      {booking.bus_details?.route_from} → {booking.bus_details?.route_to}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        background: booking.status === 'confirmed' ? '#E8F5E9' : '#FFF3E0',
                        color: booking.status === 'confirmed' ? '#2E7D32' : '#F57C00'
                      }}
                      data-testid={`booking-status-${booking.id}`}
                    >
                      {booking.status}
                    </span>
                    <span
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        background: booking.payment_status === 'completed' ? '#E8F4F8' : '#FFE0E0',
                        color: booking.payment_status === 'completed' ? '#4A90E2' : '#D32F2F'
                      }}
                      data-testid={`payment-status-${booking.id}`}
                    >
                      {booking.payment_status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Seats</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }} data-testid={`booking-seats-${booking.id}`}>
                      {booking.seats?.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Departure</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }} data-testid={`booking-departure-${booking.id}`}>
                      {booking.bus_details?.departure_time}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>Total Amount</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#4A90E2' }} data-testid={`booking-amount-${booking.id}`}>
                      ${booking.total_amount}
                    </div>
                  </div>
                </div>

                {booking.payment_status === 'completed' && (
                  <button
                    className="book-btn"
                    onClick={() => downloadTicket(booking.id)}
                    data-testid={`download-ticket-${booking.id}`}
                  >
                    Download Ticket
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
