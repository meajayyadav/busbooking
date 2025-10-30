import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BookingPage = ({ user, logout }) => {
  const { busId } = useParams();
  const navigate = useNavigate();
  const [bus, setBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerInfo, setPassengerInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBus();
  }, [busId]);

  const fetchBus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buses/${busId}`);
      const data = await response.json();
      setBus(data);
    } catch (error) {
      toast.error('Failed to fetch bus details');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
    } else {
      if (selectedSeats.length < 5) {
        setSelectedSeats([...selectedSeats, seatNumber]);
      } else {
        toast.error('Maximum 5 seats can be selected');
      }
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    if (!passengerInfo.name || !passengerInfo.email || !passengerInfo.phone) {
      toast.error('Please fill all passenger details');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bus_id: busId,
          seats: selectedSeats,
          passenger_name: passengerInfo.name,
          passenger_email: passengerInfo.email,
          passenger_phone: passengerInfo.phone
        })
      });

      const booking = await response.json();

      if (response.ok) {
        // Create payment session
        const paymentResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            booking_id: booking.id,
            host_url: window.location.origin
          })
        });

        const paymentData = await paymentResponse.json();

        if (paymentResponse.ok) {
          window.location.href = paymentData.url;
        } else {
          toast.error('Payment initialization failed');
        }
      } else {
        toast.error(booking.detail || 'Booking failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  if (loading) {
    return <div className="loading" data-testid="loading">Loading...</div>;
  }

  if (!bus) {
    return <div className="empty-state" data-testid="error-state">Bus not found</div>;
  }

  const totalSeats = bus.total_seats || 40;
  const bookedSeatsCount = totalSeats - bus.available_seats;

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

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#1a1a1a' }} data-testid="page-title">
          Select Your Seats
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Seat Selection */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div className="bus-header" style={{ marginBottom: '2rem' }}>
              <div>
                <div className="bus-number" data-testid="bus-number">{bus.bus_number}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }} data-testid="route">
                  {bus.route_from} → {bus.route_to}
                </div>
              </div>
              <div className="bus-type" data-testid="bus-type">{bus.bus_type}</div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '30px', height: '30px', border: '2px solid #E5E5E5', borderRadius: '6px' }}></div>
                <span data-testid="legend-available">Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', borderRadius: '6px' }}></div>
                <span data-testid="legend-selected">Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '30px', height: '30px', background: '#F5F5F5', borderRadius: '6px' }}></div>
                <span data-testid="legend-booked">Booked</span>
              </div>
            </div>

            {/* Seat Grid */}
            <div className="seat-grid" data-testid="seat-grid">
              {Array.from({ length: totalSeats }, (_, i) => i + 1).map((seatNumber) => {
                const isBooked = seatNumber <= bookedSeatsCount;
                const isSelected = selectedSeats.includes(seatNumber);

                return (
                  <div
                    key={seatNumber}
                    className={`seat ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isBooked && toggleSeat(seatNumber)}
                    data-testid={`seat-${seatNumber}`}
                  >
                    {seatNumber}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Summary */}
          <div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#1a1a1a' }} data-testid="summary-title">
                Booking Summary
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>Selected Seats</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333' }} data-testid="selected-seats">
                  {selectedSeats.length > 0 ? selectedSeats.sort((a, b) => a - b).join(', ') : 'None'}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666' }}>Price per seat</span>
                  <span style={{ fontWeight: '600' }} data-testid="price-per-seat">${bus.price}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666' }}>Number of seats</span>
                  <span style={{ fontWeight: '600' }} data-testid="num-seats">{selectedSeats.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: '700', color: '#4A90E2', paddingTop: '1rem', borderTop: '1px solid #E5E5E5' }}>
                  <span>Total</span>
                  <span data-testid="total-price">${(bus.price * selectedSeats.length).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1a1a1a' }}>Passenger Details</h4>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label data-testid="passenger-name-label">Name</label>
                  <input
                    type="text"
                    value={passengerInfo.name}
                    onChange={(e) => setPassengerInfo({ ...passengerInfo, name: e.target.value })}
                    data-testid="passenger-name-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label data-testid="passenger-email-label">Email</label>
                  <input
                    type="email"
                    value={passengerInfo.email}
                    onChange={(e) => setPassengerInfo({ ...passengerInfo, email: e.target.value })}
                    data-testid="passenger-email-input"
                  />
                </div>
                <div className="form-group">
                  <label data-testid="passenger-phone-label">Phone</label>
                  <input
                    type="tel"
                    value={passengerInfo.phone}
                    onChange={(e) => setPassengerInfo({ ...passengerInfo, phone: e.target.value })}
                    data-testid="passenger-phone-input"
                  />
                </div>
              </div>

              <button
                className="book-btn"
                style={{ width: '100%', padding: '1rem' }}
                onClick={handleBooking}
                disabled={selectedSeats.length === 0}
                data-testid="proceed-payment-btn"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
