import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8080/api/v1';
const WS_BASE = 'ws://localhost:8080/api/v1';

// Preset test images representing plant diseases to make local testing simple and visual.
const PRESETS = [
  {
    id: 1,
    name: 'Tomato (Early Blight)',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80',
    latitude: 12.9716,
    longitude: 77.5946
  },
  {
    id: 2,
    name: 'Potato (Late Blight)',
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    latitude: 13.0827,
    longitude: 80.2707
  },
  {
    id: 3,
    name: 'Healthy Leaf (Control)',
    url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
    latitude: 19.0760,
    longitude: 72.8777
  }
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('login'); // login, signup
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard State
  const [diagnoseHistory, setDiagnoseHistory] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [latitude, setLatitude] = useState(PRESETS[0].latitude);
  const [longitude, setLongitude] = useState(PRESETS[0].longitude);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [toastMessage, setToastMessage] = useState('');

  const wsRef = useRef(null);

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!token) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  // Fetch history when authenticated
  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const connectWebSocket = () => {
    setWsStatus('connecting');
    // Using query parameter token authentication supported by updated middleware
    const wsUrl = `${WS_BASE}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      showToast('⚡ WebSocket Connected: Live AI Task Updates Active');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        showToast(`🔔 Update: ${data.message || 'Diagnosis task updated'}`);
        // Refresh diagnosis history on receiving live event
        fetchHistory();
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      // Attempt reconnect after 5 seconds if authenticated
      if (token) {
        setTimeout(connectWebSocket, 5000);
      }
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnoseHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch diagnosis history:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = activeTab === 'login' ? '/auth/login' : '/auth/signup';
    const payload = activeTab === 'login' 
      ? { email, password } 
      : { name, email, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      // Success
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || { name: name || email, email }));
      setToken(data.token);
      setUser(data.user || { name: name || email, email });
      showToast(activeTab === 'login' ? 'Welcome back!' : 'Account registered successfully!');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setDiagnoseHistory([]);
    showToast('Logged out successfully');
  };

  const handleDiagnoseSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const imageUrl = customImageUrl || selectedPreset.url;

    try {
      const res = await fetch(`${API_BASE}/diagnose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_url: imageUrl,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      showToast('🚀 Diagnosis task submitted successfully!');
      fetchHistory(); // refresh history immediately
      setCustomImageUrl('');
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setCustomImageUrl('');
  };

  return (
    <>
      <div className="bg-gradient-effects">
        <div className="gradient-orb-1"></div>
        <div className="gradient-orb-2"></div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'hsl(150, 16%, 10%)',
          border: '1px solid hsla(142, 70%, 45%, 0.3)',
          color: 'var(--text-primary)',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(10px)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span>🌿</span> {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 0' }}>
        
        {/* Navigation / Header */}
        <header className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🌿</span>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.5px',
                margin: 0
              }}>
                Plant<span style={{ color: 'var(--accent-color)' }}>Guard</span> AI
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Enterprise Disease Detection Portal
              </p>
            </div>
          </div>

          {token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* WebSocket Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: wsStatus === 'connected' ? 'var(--accent-color)' : wsStatus === 'connecting' ? 'hsl(35, 90%, 55%)' : 'var(--danger-color)',
                  boxShadow: wsStatus === 'connected' ? '0 0 8px var(--accent-color)' : 'none',
                  animation: wsStatus === 'connecting' ? 'pulse 1s infinite alternate' : 'none'
                }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {wsStatus === 'connected' ? 'Live Mode' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>

              {/* User badge */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>

              <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Auth Screen */}
        {!token ? (
          <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '40px' }}>
              
              {/* Form Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
                <button 
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: activeTab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    paddingBottom: '12px',
                    borderBottom: activeTab === 'login' ? '2px solid var(--accent-color)' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => { setActiveTab('login'); setAuthError(''); }}
                >
                  Sign In
                </button>
                <button 
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: activeTab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    paddingBottom: '12px',
                    borderBottom: activeTab === 'signup' ? '2px solid var(--accent-color)' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => { setActiveTab('signup'); setAuthError(''); }}
                >
                  Register
                </button>
              </div>

              {authError && (
                <div style={{
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-color)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  ⚠️ {authError}
                </div>
              )}

              <form onSubmit={handleAuth}>
                {activeTab === 'signup' && (
                  <div className="input-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <input 
                      type="email" 
                      placeholder="you@domain.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={authLoading}
                >
                  {authLoading ? 'Connecting...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          </main>
        ) : (
          
          /* Dashboard Screen */
          <main className="container" style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '32px',
            alignItems: 'start'
          }}>
            
            {/* Left side: Upload / Submit Diagnosis */}
            <section className="glass-card" style={{ padding: '32px', textAlign: 'left' }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: 700,
                marginBottom: '8px'
              }}>
                Analyze Plant Leaf
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Upload a custom image link or select one of our pre-validated diseased leaf samples below.
              </p>

              {/* Sample Presets */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Select Sample Preset
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p)}
                      style={{
                        padding: '10px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: selectedPreset.id === p.id && !customImageUrl ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: selectedPreset.id === p.id && !customImageUrl ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        color: selectedPreset.id === p.id && !customImageUrl ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL Input */}
              <div className="input-group">
                <label>Custom Image URL</label>
                <div className="input-wrapper">
                  <input 
                    type="url" 
                    placeholder="https://example.com/leaf.jpg"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Image Preview */}
              <div style={{
                width: '100%',
                height: '180px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '24px'
              }}>
                <img 
                  src={customImageUrl || selectedPreset.url} 
                  alt="Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  {customImageUrl ? 'Custom Image' : 'Selected Preset'}
                </div>
              </div>

              {/* Location parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Latitude</label>
                  <div className="input-wrapper">
                    <input 
                      type="number" 
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Longitude</label>
                  <div className="input-wrapper">
                    <input 
                      type="number" 
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px' }}
                onClick={handleDiagnoseSubmit}
                disabled={submitLoading}
              >
                {submitLoading ? 'Sending task...' : 'Submit to AI Engine'}
              </button>
            </section>

            {/* Right side: Diagnosis History */}
            <section className="glass-card" style={{ padding: '32px', textAlign: 'left', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.4rem',
                    fontWeight: 700
                  }}>
                    Diagnosis Log
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Historical logs and pipeline processing tasks.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={fetchHistory}>
                  Refresh 🔄
                </button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {diagnoseHistory.length === 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    gap: '12px',
                    padding: '40px 0'
                  }}>
                    <span style={{ fontSize: '2.5rem' }}>🍃</span>
                    <p style={{ fontSize: '0.9rem' }}>No diagnoses in database yet.</p>
                    <p style={{ fontSize: '0.75rem', maxWidth: '250px', textAlign: 'center' }}>Submit an image from the panel to run the clean architecture backend pipeline.</p>
                  </div>
                ) : (
                  diagnoseHistory.map((diag) => (
                    <div 
                      key={diag.id} 
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <img 
                        src={diag.image_url} 
                        alt="Diagnosed Leaf" 
                        style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '100px',
                            backgroundColor: diag.status === 'Completed' ? 'var(--success-bg)' : diag.status === 'Pending' ? 'hsla(35, 90%, 55%, 0.1)' : 'var(--danger-bg)',
                            color: diag.status === 'Completed' ? 'var(--success-color)' : diag.status === 'Pending' ? 'hsl(35, 90%, 55%)' : 'var(--danger-color)',
                            border: '1px solid',
                            borderColor: diag.status === 'Completed' ? 'hsla(142, 70%, 45%, 0.2)' : diag.status === 'Pending' ? 'hsla(35, 90%, 55%, 0.2)' : 'var(--danger-border)'
                          }}>
                            {diag.status}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(diag.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          ID: {diag.id.substring(0, 8)}...
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          📍 Lat: {diag.latitude?.toFixed(4) || 'N/A'}, Lon: {diag.longitude?.toFixed(4) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>
        )}
      </div>

      {/* Global CSS styles injected for custom animations */}
      <style>{`
        @keyframes pulse {
          to { opacity: 0.4; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
