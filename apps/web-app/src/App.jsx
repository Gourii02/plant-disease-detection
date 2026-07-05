import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8080/api/v1';
const WS_BASE = 'ws://localhost:8080/api/v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceBar({ value, isTop }) {
  return (
    <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        borderRadius: '100px',
        background: isTop
          ? 'linear-gradient(90deg, hsl(142, 70%, 40%), hsl(162, 70%, 50%))'
          : 'hsla(142, 50%, 45%, 0.5)',
        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
    </div>
  );
}

function DiseaseTag({ isHealthy }) {
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: '100px',
      backgroundColor: isHealthy ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: isHealthy ? 'var(--success-color)' : 'var(--danger-color)',
      border: `1px solid ${isHealthy ? 'hsla(142,70%,45%,0.25)' : 'var(--danger-border)'}`,
    }}>
      {isHealthy ? '✓ Healthy' : '⚠ Diseased'}
    </span>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('login');

  // Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Upload & Diagnosis
  const [uploadedFile, setUploadedFile] = useState(null);   // File object
  const [previewUrl, setPreviewUrl] = useState('');          // Object URL for preview
  const [isDragging, setIsDragging] = useState(false);
  const [inferLoading, setInferLoading] = useState(false);
  const [inferResult, setInferResult] = useState(null);      // AI result payload
  const [inferError, setInferError] = useState('');

  // History
  const [diagnoseHistory, setDiagnoseHistory] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [toastMessage, setToastMessage] = useState('');

  const wsRef = useRef(null);
  const fileInputRef = useRef(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const showToast = (msg) => setToastMessage(msg);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    setWsStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => { setWsStatus('connected'); showToast('⚡ Live updates active'); };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`🔔 ${data.message || 'Diagnosis updated'}`);
        fetchHistory();
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      setWsStatus('disconnected');
      if (token) setTimeout(connectWebSocket, 5000);
    };
    ws.onerror = () => setWsStatus('disconnected');
  }, [token]);

  useEffect(() => {
    if (!token) { wsRef.current?.close(); return; }
    connectWebSocket();
    return () => wsRef.current?.close();
  }, [token]);

  useEffect(() => { if (token) fetchHistory(); }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDiagnoseHistory((await res.json()) || []);
    } catch { /* silent */ }
  };

  // ─── Auth ────────────────────────────────────────────────────────────────

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const endpoint = activeTab === 'login' ? '/auth/login' : '/auth/signup';
    const payload = activeTab === 'login' ? { email, password } : { name, email, password };
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Authentication failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || { name: name || email, email }));
      setToken(data.token);
      setUser(data.user || { name: name || email, email });
      showToast(activeTab === 'login' ? '🌿 Welcome back!' : '🌱 Account created!');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(''); setUser(null); setDiagnoseHistory([]);
    setInferResult(null); setUploadedFile(null); setPreviewUrl('');
  };

  // ─── Image Upload Handlers ────────────────────────────────────────────────

  const acceptFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('❌ Please upload a JPEG or PNG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('❌ Image must be under 10 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setInferResult(null);
    setInferError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => acceptFile(e.target.files[0]);

  const handleAnalyze = async () => {
    if (!uploadedFile) { showToast('Please upload an image first.'); return; }
    setInferLoading(true);
    setInferError('');
    setInferResult(null);

    const formData = new FormData();
    formData.append('image', uploadedFile);

    try {
      const res = await fetch(`${API_BASE}/diagnose/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.detail?.detail || data?.error || 'Analysis failed.';
        throw new Error(msg);
      }
      setInferResult(data.ai_result);
      showToast('✅ Analysis complete!');
      fetchHistory();
    } catch (err) {
      setInferError(err.message);
      showToast(`❌ ${err.message}`);
    } finally {
      setInferLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-gradient-effects">
        <div className="gradient-orb-1" />
        <div className="gradient-orb-2" />
      </div>

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'hsl(150,16%,10%)', border: '1px solid hsla(142,70%,45%,0.3)',
          color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)', zIndex: 1000, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', gap: '8px',
          backdropFilter: 'blur(10px)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          whiteSpace: 'nowrap', maxWidth: '90vw',
        }}>
          {toastMessage}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 0' }}>

        {/* Header */}
        <header className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🌿</span>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                Plant<span style={{ color: 'var(--accent-color)' }}>Guard</span> AI
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Enterprise Disease Detection Portal</p>
            </div>
          </div>

          {token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* WS indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: wsStatus === 'connected' ? 'var(--accent-color)' : wsStatus === 'connecting' ? 'hsl(35,90%,55%)' : 'var(--danger-color)',
                  boxShadow: wsStatus === 'connected' ? '0 0 8px var(--accent-color)' : 'none',
                  animation: wsStatus === 'connecting' ? 'pulse 1s infinite alternate' : 'none',
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {wsStatus === 'connected' ? 'Live Mode' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleLogout}>Sign Out</button>
            </div>
          )}
        </header>

        {/* Auth Screen */}
        {!token ? (
          <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '40px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
                {['login', 'signup'].map(tab => (
                  <button key={tab} style={{
                    flex: 1, background: 'none', border: 'none',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '1rem', fontWeight: 600, paddingBottom: '12px', cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : 'none',
                  }} onClick={() => { setActiveTab(tab); setAuthError(''); }}>
                    {tab === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              {authError && (
                <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
                  ⚠️ {authError}
                </div>
              )}

              <form onSubmit={handleAuth}>
                {activeTab === 'signup' && (
                  <div className="input-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                  </div>
                )}
                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <input type="email" placeholder="you@domain.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                  {authLoading ? 'Connecting...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          </main>

        ) : (

          /* Dashboard */
          <main className="container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px', alignItems: 'start' }}>

            {/* Left: Upload Panel */}
            <section className="glass-card" style={{ padding: '32px', textAlign: 'left' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                Analyze Plant Leaf
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Upload a clear photo of a plant leaf to detect diseases using AI.
              </p>

              {/* Drop Zone */}
              <div
                id="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent-color)' : previewUrl ? 'hsla(142,70%,45%,0.5)' : 'var(--border-color)'}`,
                  borderRadius: '16px',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '20px',
                }}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Leaf preview" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: '8px', right: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                      fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px',
                    }}>
                      {uploadedFile?.name}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌿</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '4px' }}>
                      Drop leaf image here
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      or click to browse · JPEG, PNG · max 10 MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Change image button when file is loaded */}
              {previewUrl && (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '12px', fontSize: '0.85rem' }}
                  onClick={() => { fileInputRef.current?.click(); }}
                >
                  🔄 Change Image
                </button>
              )}

              <button
                id="analyze-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', opacity: (!uploadedFile || inferLoading) ? 0.7 : 1 }}
                onClick={handleAnalyze}
                disabled={!uploadedFile || inferLoading}
              >
                {inferLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Analyzing with AI...
                  </span>
                ) : '🔬 Analyze Disease'}
              </button>

              {/* Model info note */}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                Powered by <strong>linkanjarad/mobilenet_v2</strong> · PlantVillage dataset · 38 disease classes
              </p>
            </section>

            {/* Right: Results + History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* AI Results Panel */}
              {(inferResult || inferError || inferLoading) && (
                <section className="glass-card" style={{ padding: '28px', textAlign: 'left' }}>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '18px' }}>
                    🔬 Detection Results
                  </h2>

                  {inferLoading && (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      <p>Running inference on HuggingFace...</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>First call may take ~20s if model is cold-starting.</p>
                    </div>
                  )}

                  {inferError && !inferLoading && (
                    <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-color)', padding: '14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                      ⚠️ {inferError}
                    </div>
                  )}

                  {inferResult && !inferLoading && (
                    <>
                      {/* Top Prediction Hero */}
                      <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '14px',
                        padding: '20px',
                        marginBottom: '20px',
                        border: '1px solid hsla(142,70%,45%,0.2)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Top Match</p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              {inferResult.top_prediction?.plant}
                            </p>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {inferResult.top_prediction?.disease}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <DiseaseTag isHealthy={inferResult.top_prediction?.is_healthy} />
                            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '8px' }}>
                              {inferResult.top_prediction?.confidence?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <ConfidenceBar value={inferResult.top_prediction?.confidence} isTop={true} />
                      </div>

                      {/* Other Predictions */}
                      {inferResult.all_predictions?.length > 1 && (
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Other Possibilities
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {inferResult.all_predictions.slice(1).map(pred => (
                              <div key={pred.rank} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '16px', textAlign: 'right' }}>#{pred.rank}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                      {pred.plant} · {pred.disease}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                                      {pred.confidence.toFixed(1)}%
                                    </span>
                                  </div>
                                  <ConfidenceBar value={pred.confidence} isTop={false} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Diagnosis History */}
              <section className="glass-card" style={{ padding: '28px', textAlign: 'left', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>Diagnosis Log</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Your scan history</p>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={fetchHistory}>Refresh 🔄</button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {diagnoseHistory.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px', padding: '32px 0' }}>
                      <span style={{ fontSize: '2.5rem' }}>🍃</span>
                      <p style={{ fontSize: '0.9rem' }}>No scans yet. Upload a leaf image to start.</p>
                    </div>
                  ) : (
                    diagnoseHistory.map(diag => (
                      <div
                        key={diag.id}
                        style={{
                          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                          borderRadius: '14px', padding: '14px 16px',
                          display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px',
                          transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {diag.species_label ? `${diag.species_label} · ${diag.disease_label}` : `Scan #${diag.id.substring(0, 8)}...`}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(diag.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          {diag.confidence > 0 && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '2px' }}>
                              {(diag.confidence * 100).toFixed(1)}% confidence
                            </p>
                          )}
                        </div>
                        <span style={{
                          alignSelf: 'center', fontSize: '0.72rem', fontWeight: 700,
                          padding: '4px 10px', borderRadius: '100px',
                          backgroundColor: diag.status === 'completed' ? 'var(--success-bg)' : diag.status === 'pending' ? 'hsla(35,90%,55%,0.1)' : 'var(--danger-bg)',
                          color: diag.status === 'completed' ? 'var(--success-color)' : diag.status === 'pending' ? 'hsl(35,90%,55%)' : 'var(--danger-color)',
                          border: '1px solid',
                          borderColor: diag.status === 'completed' ? 'hsla(142,70%,45%,0.2)' : diag.status === 'pending' ? 'hsla(35,90%,55%,0.2)' : 'var(--danger-border)',
                        }}>
                          {diag.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

          </main>
        )}
      </div>

      <style>{`
        @keyframes pulse { to { opacity: 0.4; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
