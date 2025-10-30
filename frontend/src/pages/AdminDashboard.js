import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AdminDashboard = ({ user, logout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [buses, setBuses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [showBusForm, setShowBusForm] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [busForm, setBusForm] = useState({
    bus_number: '',
    route_from: '',
    route_to: '',
    departure_time: '',
    arrival_time: '',
    total_seats: 40,
    price: 0,
    bus_type: 'Seater',
    amenities: []
  });

  useEffect(() => {
    if (activeTab === 'overview') fetchAnalytics();
    if (activeTab === 'buses') fetchBuses();
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    }
  };

  const fetchBuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBuses(data);
    } catch (error) {
      toast.error('Failed to fetch buses');
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleBusSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingBus
        ? `${process.env.REACT_APP_BACKEND_URL}/api/admin/buses/${editingBus.id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/admin/buses`;
      
      const response = await fetch(url, {
        method: editingBus ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(busForm)
      });

      if (response.ok) {
        toast.success(editingBus ? 'Bus updated successfully' : 'Bus created successfully');
        setShowBusForm(false);
        setEditingBus(null);
        setBusForm({
          bus_number: '',
          route_from: '',
          route_to: '',
          departure_time: '',
          arrival_time: '',
          total_seats: 40,
          price: 0,
          bus_type: 'Seater',
          amenities: []
        });
        fetchBuses();
      } else {
        toast.error('Failed to save bus');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDeleteBus = async (busId) => {
    if (!window.confirm('Are you sure you want to delete this bus?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/buses/${busId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Bus deleted successfully');
        fetchBuses();
      } else {
        toast.error('Failed to delete bus');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setBusForm({
      bus_number: bus.bus_number,
      route_from: bus.route_from,
      route_to: bus.route_to,
      departure_time: bus.departure_time,
      arrival_time: bus.arrival_time,
      total_seats: bus.total_seats,
      price: bus.price,
      bus_type: bus.bus_type,
      amenities: bus.amenities || []
    });
    setShowBusForm(true);
  };

  return (
    <div>
      <nav className="navbar" data-testid="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo">BusGo Admin</div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/')} data-testid="home-btn">Home</button>
            <button className="nav-btn" onClick={() => navigate('/profile')} data-testid="profile-btn">Profile</button>
            <button className="nav-btn" onClick={logout} data-testid="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#1a1a1a' }} data-testid="admin-title">
          Admin Dashboard
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #E5E5E5' }}>
          {['overview', 'buses', 'bookings', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 2rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                color: activeTab === tab ? '#4A90E2' : '#666',
                borderBottom: activeTab === tab ? '3px solid #4A90E2' : 'none',
                transition: 'all 0.3s ease'
              }}
              data-testid={`tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div data-testid="overview-tab">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Buses', value: analytics.total_buses, color: '#4A90E2' },
                { label: 'Total Bookings', value: analytics.total_bookings, color: '#66BB6A' },
                { label: 'Total Users', value: analytics.total_users, color: '#FFA726' },
                { label: 'Total Revenue', value: `$${analytics.total_revenue.toFixed(2)}`, color: '#AB47BC' }
              ].map((stat, idx) => (
                <div key={idx} style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} data-testid={`stat-${idx}`}>
                  <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: stat.color }} data-testid={`stat-value-${idx}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#1a1a1a' }} data-testid="recent-bookings-title">
                Recent Bookings
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E5E5' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Bus</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Route</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Seats</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Amount</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recent_bookings.map((booking, idx) => (
                      <tr key={booking.id} style={{ borderBottom: '1px solid #F5F5F5' }} data-testid={`recent-booking-${idx}`}>
                        <td style={{ padding: '1rem' }}>{booking.bus_details?.bus_number}</td>
                        <td style={{ padding: '1rem' }}>{booking.bus_details?.route_from} → {booking.bus_details?.route_to}</td>
                        <td style={{ padding: '1rem' }}>{booking.seats?.join(', ')}</td>
                        <td style={{ padding: '1rem', fontWeight: '600', color: '#4A90E2' }}>${booking.total_amount}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.3rem 0.8rem',
                            borderRadius: '15px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: booking.status === 'confirmed' ? '#E8F5E9' : '#FFF3E0',
                            color: booking.status === 'confirmed' ? '#2E7D32' : '#F57C00'
                          }}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Buses Tab */}
        {activeTab === 'buses' && (
          <div data-testid="buses-tab">
            <button
              className="nav-btn primary"
              onClick={() => setShowBusForm(true)}
              style={{ marginBottom: '1.5rem' }}
              data-testid="add-bus-btn"
            >
              Add New Bus
            </button>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {buses.map((bus) => (
                <div key={bus.id} className="bus-card" data-testid={`bus-card-${bus.id}`}>
                  <div className="bus-header">
                    <div className="bus-number">{bus.bus_number}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="bus-type">{bus.bus_type}</div>
                    </div>
                  </div>
                  <div className="route-info">
                    <span className="route-location">{bus.route_from}</span>
                    <span className="route-arrow">→</span>
                    <span className="route-location">{bus.route_to}</span>
                  </div>
                  <div className="time-info">
                    <div className="time-item">
                      <span className="time-label">Departure</span>
                      <span className="time-value">{bus.departure_time}</span>
                    </div>
                    <div className="time-item">
                      <span className="time-label">Arrival</span>
                      <span className="time-value">{bus.arrival_time}</span>
                    </div>
                  </div>
                  <div className="bus-footer">
                    <div>
                      <div className="price">${bus.price}</div>
                      <div className="seats-available">{bus.available_seats}/{bus.total_seats} seats available</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="book-btn" onClick={() => handleEditBus(bus)} data-testid={`edit-bus-${bus.id}`}>
                        Edit
                      </button>
                      <button
                        className="book-btn"
                        onClick={() => handleDeleteBus(bus.id)}
                        style={{ background: '#F44336' }}
                        data-testid={`delete-bus-${bus.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} data-testid="bookings-tab">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E5E5' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Bus</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Route</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Seats</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, idx) => (
                    <tr key={booking.id} style={{ borderBottom: '1px solid #F5F5F5' }} data-testid={`booking-row-${idx}`}>
                      <td style={{ padding: '1rem' }}>{booking.user_details?.name}</td>
                      <td style={{ padding: '1rem' }}>{booking.bus_details?.bus_number}</td>
                      <td style={{ padding: '1rem' }}>{booking.bus_details?.route_from} → {booking.bus_details?.route_to}</td>
                      <td style={{ padding: '1rem' }}>{booking.seats?.join(', ')}</td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#4A90E2' }}>${booking.total_amount}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.3rem 0.8rem',
                          borderRadius: '15px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: booking.status === 'confirmed' ? '#E8F5E9' : '#FFF3E0',
                          color: booking.status === 'confirmed' ? '#2E7D32' : '#F57C00'
                        }}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} data-testid="users-tab">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E5E5' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Role</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontWeight: '600' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F5' }} data-testid={`user-row-${idx}`}>
                      <td style={{ padding: '1rem' }}>{u.name}</td>
                      <td style={{ padding: '1rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.3rem 0.8rem',
                          borderRadius: '15px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: u.role === 'admin' ? '#E8F4F8' : '#F5F5F5',
                          color: u.role === 'admin' ? '#4A90E2' : '#666'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bus Form Modal */}
      {showBusForm && (
        <div className="modal-overlay" onClick={() => { setShowBusForm(false); setEditingBus(null); }} data-testid="bus-form-modal">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-header">{editingBus ? 'Edit Bus' : 'Add New Bus'}</h2>
            <form onSubmit={handleBusSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label>Bus Number</label>
                  <input
                    type="text"
                    value={busForm.bus_number}
                    onChange={(e) => setBusForm({ ...busForm, bus_number: e.target.value })}
                    required
                    data-testid="bus-number-input"
                  />
                </div>
                <div className="form-group">
                  <label>Bus Type</label>
                  <select
                    value={busForm.bus_type}
                    onChange={(e) => setBusForm({ ...busForm, bus_type: e.target.value })}
                    data-testid="bus-type-select"
                  >
                    <option>Seater</option>
                    <option>Sleeper</option>
                    <option>AC</option>
                    <option>Non-AC</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>From</label>
                  <input
                    type="text"
                    value={busForm.route_from}
                    onChange={(e) => setBusForm({ ...busForm, route_from: e.target.value })}
                    required
                    data-testid="route-from-input"
                  />
                </div>
                <div className="form-group">
                  <label>To</label>
                  <input
                    type="text"
                    value={busForm.route_to}
                    onChange={(e) => setBusForm({ ...busForm, route_to: e.target.value })}
                    required
                    data-testid="route-to-input"
                  />
                </div>
                <div className="form-group">
                  <label>Departure Time</label>
                  <input
                    type="time"
                    value={busForm.departure_time}
                    onChange={(e) => setBusForm({ ...busForm, departure_time: e.target.value })}
                    required
                    data-testid="departure-time-input"
                  />
                </div>
                <div className="form-group">
                  <label>Arrival Time</label>
                  <input
                    type="time"
                    value={busForm.arrival_time}
                    onChange={(e) => setBusForm({ ...busForm, arrival_time: e.target.value })}
                    required
                    data-testid="arrival-time-input"
                  />
                </div>
                <div className="form-group">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    value={busForm.total_seats}
                    onChange={(e) => setBusForm({ ...busForm, total_seats: parseInt(e.target.value) })}
                    required
                    data-testid="total-seats-input"
                  />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={busForm.price}
                    onChange={(e) => setBusForm({ ...busForm, price: parseFloat(e.target.value) })}
                    required
                    data-testid="price-input"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="search-btn" style={{ flex: 1 }} data-testid="submit-bus-btn">
                  {editingBus ? 'Update Bus' : 'Create Bus'}
                </button>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => { setShowBusForm(false); setEditingBus(null); }}
                  style={{ flex: 1 }}
                  data-testid="cancel-bus-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
