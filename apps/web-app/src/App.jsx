import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8080/api/v1';
const WS_BASE  = 'ws://localhost:8080/api/v1';

// ─── Static Treatment Data ────────────────────────────────────────────────────
const TREATMENTS = {
  "Apple Scab": {
    display_name: "Apple Scab",
    description: "A fungal disease caused by Venturia inaequalis. It creates dark, scabby lesions on leaves and fruit, reducing yield and marketability.",
    preventive_measures: ["Plant resistant apple varieties", "Rake and destroy fallen leaves in autumn", "Ensure good air circulation by pruning", "Avoid overhead irrigation"],
    organic_treatments: ["Apply sulfur-based fungicide at bud break", "Use neem oil spray every 7–10 days", "Copper-based sprays before wet weather"],
    chemical_treatments: ["Myclobutanil (Rally)", "Trifloxystrobin (Flint)", "Mancozeb at green tip stage"],
  },
  "Apple with Black Rot": {
    display_name: "Apple Black Rot",
    description: "Caused by Botryosphaeria obtusa. Affects fruit, leaves, and bark — producing frog-eye leaf spots and mummified fruit.",
    preventive_measures: ["Remove and destroy infected fruit and mummified apples", "Prune dead or infected wood", "Maintain tree vigor through fertilization"],
    organic_treatments: ["Captan fungicide (OMRI listed)", "Copper hydroxide sprays", "Bacillus subtilis biofungicide"],
    chemical_treatments: ["Thiophanate-methyl", "Ziram", "Captan + myclobutanil combination"],
  },
  "Cedar Apple Rust": {
    display_name: "Cedar Apple Rust",
    description: "A fungal disease caused by Gymnosporangium juniperi-virginianae requiring both apple and juniper/cedar hosts to complete its cycle.",
    preventive_measures: ["Remove nearby juniper/red cedar trees within 1km", "Plant rust-resistant apple varieties", "Apply fungicides starting at pink bud stage"],
    organic_treatments: ["Sulfur-based sprays during bloom", "Neem oil applications", "Copper sulfate before bud break"],
    chemical_treatments: ["Myclobutanil", "Propiconazole", "Tebuconazole"],
  },
  "Cherry with Powdery Mildew": {
    display_name: "Cherry Powdery Mildew",
    description: "White powdery fungal growth on leaves and shoots caused by Podosphaera clandestina. Can stunt growth and reduce fruit quality.",
    preventive_measures: ["Avoid excessive nitrogen fertilization", "Prune for open canopy structure", "Remove and destroy infected shoots in winter"],
    organic_treatments: ["Potassium bicarbonate sprays", "Neem oil every 7 days", "Dilute milk spray (40% milk, 60% water)"],
    chemical_treatments: ["Myclobutanil", "Trifloxystrobin", "Sulfur-based fungicides"],
  },
  "Corn (Maize) with Cercospora and Gray Leaf Spot": {
    display_name: "Corn Gray Leaf Spot",
    description: "Caused by Cercospora zeae-maydis. Creates rectangular lesions on leaves that reduce photosynthesis and can cause significant yield loss.",
    preventive_measures: ["Rotate crops — avoid continuous corn planting", "Plant resistant hybrids", "Till to bury crop residue"],
    organic_treatments: ["Trichoderma-based biofungicides", "Neem oil sprays", "Compost tea applications"],
    chemical_treatments: ["Azoxystrobin", "Pyraclostrobin", "Propiconazole"],
  },
  "Corn (Maize) with Common Rust": {
    display_name: "Corn Common Rust",
    description: "Caused by Puccinia sorghi. Produces cinnamon-brown pustules on both leaf surfaces, weakening the plant.",
    preventive_measures: ["Plant rust-resistant corn hybrids", "Early planting to avoid peak rust season", "Monitor fields weekly during growing season"],
    organic_treatments: ["Sulfur dust applications", "Neem oil sprays", "Potassium silicate to strengthen cell walls"],
    chemical_treatments: ["Trifloxystrobin + propiconazole", "Azoxystrobin", "Mancozeb"],
  },
  "Corn (Maize) with Northern Leaf Blight": {
    display_name: "Corn Northern Leaf Blight",
    description: "Caused by Exserohilum turcicum. Creates long, cigar-shaped gray-green to tan lesions that can destroy up to 50% of leaf area.",
    preventive_measures: ["Use resistant hybrids", "Crop rotation with non-host plants", "Deep tillage to bury infected residue"],
    organic_treatments: ["Bacillus subtilis foliar sprays", "Compost tea", "Neem cake soil treatment"],
    chemical_treatments: ["Azoxystrobin + propiconazole", "Tebuconazole", "Mancozeb"],
  },
  "Grape with Black Rot": {
    display_name: "Grape Black Rot",
    description: "Caused by Guignardia bidwellii. Causes circular brown lesions on leaves and shrivels berries into hard black mummies.",
    preventive_measures: ["Remove mummified berries and infected canes", "Ensure good canopy ventilation", "Apply fungicides from bud break"],
    organic_treatments: ["Copper hydroxide sprays", "Sulfur dust", "Bordeaux mixture"],
    chemical_treatments: ["Mancozeb", "Myclobutanil", "Captan"],
  },
  "Grape with Esca (Black Measles)": {
    display_name: "Grape Esca (Black Measles)",
    description: "A complex wood disease caused by multiple fungi (Phaeomoniella, Phaeoacremonium). Causes tiger-stripe leaf patterns and can kill vines.",
    preventive_measures: ["Protect pruning wounds immediately with wound sealants", "Avoid large pruning cuts", "Remove and burn infected wood"],
    organic_treatments: ["Trichoderma viride wound treatments", "Garlic extract sprays", "Silicon-based foliar feeds to build resistance"],
    chemical_treatments: ["Thiophanate-methyl wound paste", "Flusilazole", "Tebuconazole"],
  },
  "Grape with Isariopsis Leaf Spot": {
    display_name: "Grape Leaf Spot (Isariopsis)",
    description: "Caused by Pseudocercospora vitis. Creates angular brown spots on upper leaf surface with gray sporulation below.",
    preventive_measures: ["Improve air circulation through canopy management", "Avoid leaf wetness with drip irrigation", "Remove infected leaves"],
    organic_treatments: ["Copper-based sprays", "Neem oil", "Sulfur dust"],
    chemical_treatments: ["Mancozeb", "Myclobutanil", "Ziram"],
  },
  "Orange with Citrus Greening": {
    display_name: "Citrus Greening (HLB)",
    description: "Caused by Candidatus Liberibacter asiaticus, spread by the Asian citrus psyllid. One of the most destructive citrus diseases — currently has no cure.",
    preventive_measures: ["Control Asian citrus psyllid with insecticides", "Remove and destroy infected trees immediately", "Use certified disease-free nursery stock", "Inspect new plants before introduction"],
    organic_treatments: ["Thermotherapy (heat treatment of nursery stock)", "Psyllid control using insecticidal soap", "Reflective mulches to deter psyllids"],
    chemical_treatments: ["Imidacloprid for psyllid control", "Drenches with systemic insecticides", "Oxytetracycline antibiotic injections (to slow progression, not cure)"],
  },
  "Peach with Bacterial Spot": {
    display_name: "Peach Bacterial Spot",
    description: "Caused by Xanthomonas arboricola pv. pruni. Creates water-soaked spots on leaves and fruit, leading to defoliation in severe cases.",
    preventive_measures: ["Plant resistant peach varieties", "Avoid overhead irrigation", "Apply copper-based bactericides at leaf fall"],
    organic_treatments: ["Copper hydroxide sprays", "Bordeaux mixture", "Bacillus subtilis biobactericide"],
    chemical_treatments: ["Oxytetracycline", "Copper-based bactericides", "Ziram + copper combination"],
  },
  "Bell Pepper with Bacterial Spot": {
    display_name: "Bell Pepper Bacterial Spot",
    description: "Caused by Xanthomonas campestris pv. vesicatoria. Creates water-soaked lesions on leaves and fruit, reducing quality significantly.",
    preventive_measures: ["Use disease-free certified seed", "Avoid working in fields when plants are wet", "Rotate crops every 2–3 years", "Remove crop debris after harvest"],
    organic_treatments: ["Copper octanoate sprays", "Bacillus amyloliquefaciens biofungicide", "Compost tea foliar spray"],
    chemical_treatments: ["Copper hydroxide", "Mancozeb + copper combination", "Acibenzolar-S-methyl (plant activator)"],
  },
  "Potato with Early Blight": {
    display_name: "Potato Early Blight",
    description: "Caused by Alternaria solani. Produces dark brown spots with concentric rings (bullseye pattern) on older leaves, weakening the plant.",
    preventive_measures: ["Maintain plant vigor with adequate fertilization", "Use certified seed potatoes", "Avoid wetting foliage during irrigation", "Rotate crops 3–4 years"],
    organic_treatments: ["Copper-based fungicides", "Neem oil sprays", "Compost tea applications"],
    chemical_treatments: ["Chlorothalonil", "Mancozeb", "Azoxystrobin"],
  },
  "Potato with Late Blight": {
    display_name: "Potato Late Blight",
    description: "Caused by Phytophthora infestans — the pathogen responsible for the Irish Famine. Causes rapid collapse of foliage and tuber rot in wet conditions.",
    preventive_measures: ["Plant certified blight-free seed potatoes", "Avoid excessive nitrogen", "Hill soil around plants to protect tubers", "Harvest promptly when vines die"],
    organic_treatments: ["Copper-based fungicides (early intervention)", "Biofungicides containing Bacillus subtilis", "Remove and destroy infected plant material immediately"],
    chemical_treatments: ["Mancozeb", "Metalaxyl + mancozeb", "Dimethomorph", "Cymoxanil + famoxadone"],
  },
  "Squash with Powdery Mildew": {
    display_name: "Squash Powdery Mildew",
    description: "Caused by Podosphaera xanthii or Erysiphe cichoracearum. White powdery coating on leaves reduces photosynthesis and shortens plant life.",
    preventive_measures: ["Plant resistant varieties", "Ensure adequate plant spacing", "Avoid overhead watering", "Remove infected leaves promptly"],
    organic_treatments: ["Potassium bicarbonate sprays", "Neem oil every 7 days", "Dilute milk spray", "Sulfur dust"],
    chemical_treatments: ["Trifloxystrobin", "Myclobutanil", "Azoxystrobin"],
  },
  "Strawberry with Leaf Scorch": {
    display_name: "Strawberry Leaf Scorch",
    description: "Caused by Diplocarpon earlianum. Creates irregular purple-to-brown spots, causing leaves to look scorched. Weakens plants and reduces fruit production.",
    preventive_measures: ["Remove and destroy old foliage after harvest", "Avoid overhead irrigation", "Use disease-free transplants", "Rotate planting sites every 3 years"],
    organic_treatments: ["Copper fungicide sprays", "Neem oil", "Remove heavily infected leaves"],
    chemical_treatments: ["Captan", "Myclobutanil", "Thiophanate-methyl"],
  },
  "Tomato with Bacterial Spot": {
    display_name: "Tomato Bacterial Spot",
    description: "Caused by Xanthomonas vesicatoria. Water-soaked spots on leaves, stems, and fruit surfaces reduce marketability and plant health.",
    preventive_measures: ["Use disease-free certified seed", "Avoid overhead watering", "Crop rotation every 2+ years", "Disinfect tools between plants"],
    organic_treatments: ["Copper-based bactericides", "Bacillus subtilis sprays", "Hydrogen peroxide diluted solution"],
    chemical_treatments: ["Copper hydroxide", "Mancozeb + copper", "Acibenzolar-S-methyl"],
  },
  "Tomato with Early Blight": {
    display_name: "Tomato Early Blight",
    description: "Caused by Alternaria solani. Brown bullseye lesions starting on lower/older leaves, moving upward. Common in warm, humid conditions.",
    preventive_measures: ["Mulch around plants to prevent soil splash", "Water at soil level only", "Remove lower leaves touching soil", "Use crop rotation"],
    organic_treatments: ["Copper-based fungicides", "Neem oil sprays every 7 days", "Bacillus subtilis products"],
    chemical_treatments: ["Chlorothalonil", "Mancozeb", "Azoxystrobin + propiconazole"],
  },
  "Tomato with Late Blight": {
    display_name: "Tomato Late Blight",
    description: "Caused by Phytophthora infestans. Large, water-soaked lesions with white mold on undersides. Spreads rapidly in cool, moist conditions.",
    preventive_measures: ["Stake plants for airflow", "Avoid wetting foliage", "Monitor closely during wet weather", "Remove and bag infected material"],
    organic_treatments: ["Copper hydroxide sprays", "Bacillus amyloliquefaciens", "Remove infected plants immediately"],
    chemical_treatments: ["Mancozeb", "Metalaxyl + mancozeb", "Cymoxanil", "Famoxadone + cymoxanil"],
  },
  "Tomato with Leaf Mold": {
    display_name: "Tomato Leaf Mold",
    description: "Caused by Passalora fulva (formerly Fulvia fulva). Yellow spots on upper leaf surface with olive-green mold below. Common in humid greenhouse conditions.",
    preventive_measures: ["Reduce humidity in greenhouses", "Ensure adequate ventilation", "Avoid wetting foliage", "Remove and destroy infected leaves"],
    organic_treatments: ["Copper-based fungicides", "Bacillus subtilis", "Sulfur dust in greenhouses"],
    chemical_treatments: ["Chlorothalonil", "Difenoconazole", "Azoxystrobin"],
  },
  "Tomato with Septoria Leaf Spot": {
    display_name: "Tomato Septoria Leaf Spot",
    description: "Caused by Septoria lycopersici. Small circular spots with dark borders and light centers on lower leaves, spreading upward rapidly.",
    preventive_measures: ["Mulch soil to prevent rain splash", "Remove and destroy infected lower leaves", "Avoid overhead watering", "3-year crop rotation"],
    organic_treatments: ["Copper-based fungicides", "Bacillus subtilis sprays", "Neem oil"],
    chemical_treatments: ["Chlorothalonil", "Mancozeb", "Myclobutanil"],
  },
  "Tomato with Spider Mites or Two-spotted Spider Mite": {
    display_name: "Tomato Spider Mites",
    description: "Tetranychus urticae causes stippled, bronzed leaves with fine webbing. Thrives in hot, dry conditions. Not a fungus — requires miticides.",
    preventive_measures: ["Maintain adequate soil moisture", "Avoid excessive nitrogen", "Encourage natural predators (lady beetles)", "Spray water to knock mites off plants"],
    organic_treatments: ["Neem oil every 5–7 days", "Insecticidal soap sprays", "Diatomaceous earth", "Release predatory mites (Phytoseiidae)"],
    chemical_treatments: ["Abamectin", "Spiromesifen", "Bifenazate"],
  },
  "Tomato with Target Spot": {
    display_name: "Tomato Target Spot",
    description: "Caused by Corynespora cassiicola. Concentric ring pattern lesions on leaves, stems, and fruit. Spreads rapidly in warm, wet conditions.",
    preventive_measures: ["Ensure good plant spacing and air circulation", "Avoid overhead irrigation", "Remove crop debris after harvest"],
    organic_treatments: ["Copper-based fungicides", "Bacillus subtilis", "Neem oil"],
    chemical_treatments: ["Azoxystrobin", "Mancozeb", "Difenoconazole"],
  },
  "Tomato Yellow Leaf Curl Virus": {
    display_name: "Tomato Yellow Leaf Curl Virus",
    description: "A begomovirus spread by the silverleaf whitefly (Bemisia tabaci). Causes severe leaf curling, yellowing, and stunting. No chemical cure — control the vector.",
    preventive_measures: ["Use reflective silver mulch to deter whiteflies", "Plant resistant tomato varieties", "Use insect-proof mesh in seedling nurseries", "Remove and destroy infected plants immediately"],
    organic_treatments: ["Neem oil + insecticidal soap for whitefly control", "Yellow sticky traps", "Spinosad sprays (OMRI listed)"],
    chemical_treatments: ["Imidacloprid soil drench", "Thiamethoxam", "Pymetrozine for whitefly control"],
  },
  "Tomato Mosaic Virus": {
    display_name: "Tomato Mosaic Virus",
    description: "ToMV is mechanically transmitted through touch, tools, and tobacco products. Causes mosaic mottling, leaf distortion, and reduced fruit quality.",
    preventive_measures: ["Wash hands thoroughly before working with plants", "Disinfect tools with 1:9 bleach solution", "Avoid using tobacco near plants", "Remove infected plants immediately"],
    organic_treatments: ["No chemical cure — focus on prevention and removal", "Milk spray may have antiviral properties", "Diatomaceous earth to reduce aphid/whitefly vectors"],
    chemical_treatments: ["No effective chemical treatment", "Control aphid/whitefly vectors with appropriate insecticides"],
  },
};

function getTreatment(rawLabel) {
  if (!rawLabel) return null;
  return TREATMENTS[rawLabel] || null;
}

// ─── Treatment Panel Component ────────────────────────────────────────────────
function TreatmentPanel({ treatment, onClose }) {
  if (!treatment) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 500, padding: '20px',
    }} onClick={onClose}>
      <div className="glass-card" style={{
        maxWidth: '600px', width: '100%', padding: '36px',
        maxHeight: '85vh', overflowY: 'auto', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          color: 'var(--text-muted)', borderRadius: '8px', width: '32px', height: '32px',
          cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Treatment Guide</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>{treatment.display_name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{treatment.description}</p>
        </div>

        {[['🛡️ Preventive Measures', treatment.preventive_measures], ['🌿 Organic Treatments', treatment.organic_treatments], ['⚗️ Chemical Treatments', treatment.chemical_treatments]].map(([title, items]) =>
          items?.length > 0 && (
            <div key={title} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>{title}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-primary)',
                  }}>
                    <span style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '1px' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ConfidenceBar({ value, isTop }) {
  return (
    <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${value}%`, borderRadius: '100px',
        background: isTop
          ? 'linear-gradient(90deg, var(--accent-color), hsl(152, 60%, 45%))'
          : 'var(--text-muted)',
        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
    </div>
  );
}

function DiseaseTag({ isHealthy }) {
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px',
      backgroundColor: isHealthy ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: isHealthy ? 'var(--success-color)' : 'var(--danger-color)',
      border: `1px solid ${isHealthy ? 'hsla(142,70%,45%,0.15)' : 'var(--danger-border)'}`,
    }}>
      {isHealthy ? '✓ Healthy' : '⚠ Diseased'}
    </span>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser]   = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('login');

  // Auth
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Upload & Diagnosis
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl]     = useState('');
  const [isDragging, setIsDragging]     = useState(false);
  const [inferLoading, setInferLoading] = useState(false);
  const [inferResult, setInferResult]   = useState(null);
  const [inferError, setInferError]     = useState('');

  // Treatment modal
  const [treatment, setTreatment] = useState(null);

  // History & realtime
  const [diagnoseHistory, setDiagnoseHistory] = useState([]);
  const [wsStatus, setWsStatus]       = useState('disconnected');
  const [toastMessage, setToastMessage] = useState('');

  const wsRef       = useRef(null);
  const fileInputRef = useRef(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const showToast = msg => setToastMessage(msg);

  // WebSocket
  const connectWebSocket = useCallback(() => {
    setWsStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    wsRef.current = ws;
    ws.onopen    = () => { setWsStatus('connected'); showToast('⚡ Connected to realtime events'); };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`🔔 ${data.message || 'Diagnosis log updated'}`);
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

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const endpoint = activeTab === 'login' ? '/auth/login' : '/auth/signup';
    const payload  = activeTab === 'login' ? { email, password } : { name, email, password };
    try {
      const res  = await fetch(`${API_BASE}${endpoint}`, {
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
    setTreatment(null);
  };

  // ─── Image Upload ──────────────────────────────────────────────────────────
  const acceptFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('❌ Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { showToast('❌ Image must be under 10 MB.'); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setInferResult(null);
    setInferError('');
    setTreatment(null);
  };

  const handleDrop       = (e) => { e.preventDefault(); setIsDragging(false); acceptFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => acceptFile(e.target.files[0]);

  const handleAnalyze = async () => {
    if (!uploadedFile) { showToast('Please upload an image first.'); return; }
    setInferLoading(true);
    setInferError('');
    setInferResult(null);
    setTreatment(null);

    const formData = new FormData();
    formData.append('image', uploadedFile);

    try {
      const res  = await fetch(`${API_BASE}/diagnose/upload`, {
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

  const handleViewTreatment = () => {
    const rawLabel = inferResult?.top_prediction?.raw_label;
    const found    = getTreatment(rawLabel);
    if (found) {
      setTreatment(found);
    } else {
      showToast('⚠️ No treatment guide available for this condition.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'hsl(120, 15%, 20%)', border: '1px solid var(--accent-color)',
          color: '#ffffff', padding: '12px 24px', borderRadius: '12px',
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
            <span style={{ fontSize: '2.2rem' }}>🌿</span>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                Plant<span style={{ color: 'var(--accent-color)' }}>Guard</span> AI
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Expert Plant Doctor & Diagnostics</p>
            </div>
          </div>

          {token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* WS Live mode badge */}
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
            <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '2.5rem' }}>🌱</span>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
                  {activeTab === 'login' ? 'Welcome to PlantGuard' : 'Create an Account'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {activeTab === 'login' ? 'Sign in to start diagnosing plant leaves' : 'Get instant treatment guides and search logs'}
                </p>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
                {['login', 'signup'].map(tab => (
                  <button key={tab} style={{
                    flex: 1, background: 'none', border: 'none',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '0.95rem', fontWeight: 600, paddingBottom: '12px', cursor: 'pointer',
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
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '14px', borderRadius: '12px' }} disabled={authLoading}>
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
                Upload a clear photo of a plant leaf to identify diseases instantly.
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
                  borderRadius: '16px', minHeight: '200px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--bg-primary)',
                  transition: 'all 0.2s', overflow: 'hidden', position: 'relative', marginBottom: '20px',
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
                    <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>📸</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '4px' }}>
                      Drop leaf image here
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      or click to browse · JPEG, PNG, WebP · max 10 MB
                    </p>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={handleFileChange} />

              {previewUrl && (
                <button className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '12px', fontSize: '0.85rem' }}
                  onClick={() => fileInputRef.current?.click()}>
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

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                Powered by <strong>linkanjarad/mobilenet_v2</strong> · PlantVillage dataset · 38 disease classes
              </p>

              {/* Supported crops note */}
              <div style={{ marginTop: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Supported Crops</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Apple', 'Blueberry', 'Cherry', 'Corn', 'Grape', 'Orange', 'Peach', 'Pepper', 'Potato', 'Raspberry', 'Soybean', 'Squash', 'Strawberry', 'Tomato'].map(crop => (
                    <span key={crop} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      {crop}
                    </span>
                  ))}
                </div>
              </div>
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
                      {/* OOD Warning */}
                      {inferResult.is_unsupported_plant && (
                        <div style={{
                          backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                          color: 'var(--danger-color)', padding: '12px 16px', borderRadius: '10px',
                          fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '16px',
                        }}>
                          <strong>⚠️ Unsupported or unrecognized plant</strong><br />
                          {inferResult.warning}
                        </div>
                      )}

                      {/* Top Prediction Hero */}
                      <div style={{
                        backgroundColor: 'var(--bg-primary)', borderRadius: '14px', padding: '20px',
                        marginBottom: '20px', border: '1px solid hsla(142,60%,35%,0.15)',
                        opacity: inferResult.is_unsupported_plant ? 0.7 : 1,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                              {inferResult.is_unsupported_plant ? 'Closest Match (Low Confidence)' : 'Top Match'}
                            </p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              {inferResult.top_prediction?.plant}
                            </p>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {inferResult.top_prediction?.disease}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <DiseaseTag isHealthy={inferResult.top_prediction?.is_healthy} />
                            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: inferResult.is_unsupported_plant ? 'hsl(0, 74%, 42%)' : 'var(--accent-color)', marginTop: '8px' }}>
                              {inferResult.top_prediction?.confidence?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <ConfidenceBar value={inferResult.top_prediction?.confidence} isTop={true} />
                      </div>

                      {/* Other Predictions */}
                      {inferResult.all_predictions?.length > 1 && (
                        <div style={{ marginBottom: '20px' }}>
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

                      {/* Treatment Button */}
                      {!inferResult.is_unsupported_plant && !inferResult.top_prediction?.is_healthy && (
                        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                            onClick={handleViewTreatment}
                          >
                            💊 View Treatment Guide
                          </button>
                        </div>
                      )}

                      {inferResult.top_prediction?.is_healthy && !inferResult.is_unsupported_plant && (
                        <div style={{
                          paddingTop: '16px', borderTop: '1px solid var(--border-color)',
                          textAlign: 'center', color: 'var(--success-color)', fontSize: '0.85rem',
                        }}>
                          ✅ Plant looks healthy — no treatment needed!
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
                          backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
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
                          borderColor: diag.status === 'completed' ? 'hsla(142,70%,45%,0.15)' : diag.status === 'pending' ? 'hsla(35,90%,55%,0.2)' : 'var(--danger-border)',
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

      {/* Treatment Modal */}
      <TreatmentPanel treatment={treatment} onClose={() => setTreatment(null)} />

      <style>{`
        @keyframes pulse   { to { opacity: 0.4; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
