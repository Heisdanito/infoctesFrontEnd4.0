import { useState } from 'react';
import {
  LogIn, Eye, EyeOff, UserCheck, GraduationCap,
  ArrowLeft, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── API URLs — no credentials:include, no wildcard conflict ───
const LECTURER_LOGIN_URL = 'http://localhost/infoctes/web_server/auth/lec/authLogin.php';
const REP_LOGIN_URL      = 'http://localhost/infoctes/web_server/auth/rep/authLogin.php';

function saveWebUser(user) {
  sessionStorage.setItem('web_user', JSON.stringify(user));
  sessionStorage.setItem('role',     user.role);
}

export default function Login() {
  const navigate = useNavigate();

  const [panel,        setPanel]       = useState('lecturer');
  const [showLectPass, setShowLectPass] = useState(false);
  const [showRepPass,  setShowRepPass]  = useState(false);
  const [loading,      setLoading]      = useState(false);

  // Lecturer
  const [lectEmail,    setLectEmail]    = useState('');
  const [lectPassword, setLectPassword] = useState('');
  const [lectError,    setLectError]    = useState('');
  const [lectSuccess,  setLectSuccess]  = useState('');

  // Rep
  const [repIndex, setRepIndex] = useState('');
  const [repPin,   setRepPin]   = useState('');
  const [repError, setRepError] = useState('');
  const [repSuccess, setRepSuccess] = useState('');

  const isRight = panel === 'rep';

  // ── Lecturer submit ───────────────────────────────────────
  async function handleLecturerSubmit(e) {
    e.preventDefault();
    setLectError('');
    setLectSuccess('');

    if (!lectEmail.trim()) { setLectError('Email is required.'); return; }
    if (!lectPassword)     { setLectError('Password is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch(LECTURER_LOGIN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ NO credentials:'include' — conflicts with Access-Control-Allow-Origin: *
        body: JSON.stringify({
          email:    lectEmail.trim().toLowerCase(),
          password: lectPassword,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setLectError(json.message || 'Login failed. Please try again.');
        return;
      }

      saveWebUser(json.data.user);
      setLectSuccess(`Welcome back, ${json.data.user.first_name}!`);
      setTimeout(() => navigate('/dashboard'), 900);

    } catch (err) {
      console.error('Lecturer login error:', err);
      setLectError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Rep submit ────────────────────────────────────────────
  async function handleRepSubmit(e) {
    e.preventDefault();
    setRepError('');
    setRepSuccess('');

    if (!repIndex.trim())     { setRepError('Index number is required.'); return; }
    if (repPin.length !== 10) { setRepError('PIN must be exactly 10 digits.'); return; }

    setLoading(true);
    try {
      const res = await fetch(REP_LOGIN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ NO credentials:'include'
        body: JSON.stringify({
          index_number: repIndex.trim().toUpperCase(),
          pin:          repPin,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setRepError(json.message || 'Login failed. Please try again.');
        return;
      }

      saveWebUser(json.data.user);
      setRepSuccess(`Welcome, ${json.data.user.first_name}!`);
      setTimeout(() => navigate('/dashboard'), 900);

    } catch (err) {
      console.error('Rep login error:', err);
      setRepError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.blob1} />
      <div style={S.blob2} />
      <div style={S.blob3} />

      <button style={S.backBtn} onClick={() => navigate('/')}>
        <ArrowLeft size={18} /> Back to Home
      </button>

      <div style={S.card}>

        {/* ── Lecturer form (left) ── */}
        <div style={{ ...S.formPane, ...(isRight ? S.formPaneHidden : S.formPaneVisible) }}>
          <form onSubmit={handleLecturerSubmit} style={S.form}>
            <div style={S.logo}><span style={S.logoText}>IC</span></div>
            <h1 style={S.heading}>Lecturer Portal</h1>
            <div style={S.badge}><GraduationCap size={14} /> Faculty Access</div>

            {lectError   && <Alert type="error"   msg={lectError}   />}
            {lectSuccess && <Alert type="success" msg={lectSuccess} />}

            <input
              style={S.input}
              type="email"
              placeholder="Email address"
              value={lectEmail}
              onChange={e => { setLectEmail(e.target.value); setLectError(''); }}
              required
              autoComplete="email"
            />

            <div style={S.passWrap}>
              <input
                style={S.input}
                type={showLectPass ? 'text' : 'password'}
                placeholder="Password"
                value={lectPassword}
                onChange={e => { setLectPassword(e.target.value); setLectError(''); }}
                required
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowLectPass(v => !v)}>
                {showLectPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <a href="#" style={S.link} onClick={e => e.preventDefault()}>Forgot Password?</a>

            <button type="submit" style={S.submitBtn} disabled={loading}>
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <LogIn size={16} />
              }
              {loading ? 'Signing in...' : 'Sign in as Lecturer'}
            </button>
          </form>
        </div>

        {/* ── Course Rep form (right) ── */}
        <div style={{ ...S.formPane, left: '50%', ...(isRight ? S.formPaneVisible : S.formPaneHidden) }}>
          <form onSubmit={handleRepSubmit} style={S.form}>
            <div style={S.logo}><span style={S.logoText}>IC</span></div>
            <h1 style={S.heading}>Course Rep Login</h1>
            <div style={S.badge}><UserCheck size={14} /> Representative Access</div>

            {repError   && <Alert type="error"   msg={repError}   />}
            {repSuccess && <Alert type="success" msg={repSuccess} />}

            <input
              style={S.input}
              type="text"
              placeholder="Student index number"
              value={repIndex}
              onChange={e => { setRepIndex(e.target.value); setRepError(''); }}
              autoCapitalize="characters"
              required
            />

            <div style={S.passWrap}>
              <input
                style={S.input}
                type={showRepPass ? 'text' : 'password'}
                placeholder="10-digit PIN"
                value={repPin}
                onChange={e => { setRepPin(e.target.value.replace(/\D/g, '').slice(0, 10)); setRepError(''); }}
                inputMode="numeric"
                required
              />
              <button type="button" style={S.eyeBtn} onClick={() => setShowRepPass(v => !v)}>
                {showRepPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={S.pinDots}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ ...S.pinDot, ...(i < repPin.length ? S.pinDotFilled : {}) }} />
              ))}
            </div>

            <button type="submit" style={S.submitBtn} disabled={loading}>
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <LogIn size={16} />
              }
              {loading ? 'Signing in...' : 'Sign in as Course Rep'}
            </button>
          </form>
        </div>

        {/* ── Overlay ── */}
        <div style={{ ...S.overlay, ...(isRight ? S.overlayLeft : S.overlayRight) }}>
          <div style={S.overlayInner}>
            {isRight ? (
              <>
                <div style={S.overlayIcon}><GraduationCap size={36} color="white" /></div>
                <h2 style={S.overlayHeading}>Lecturer Access</h2>
                <p style={S.overlayText}>Sign in with your faculty email and password to manage courses and view attendance reports.</p>
                <FeaturePills items={['Live Tracking', 'Auto Reports', 'Analytics']} />
                <button style={S.switchBtn} onClick={() => setPanel('lecturer')}>Switch to Lecturer</button>
              </>
            ) : (
              <>
                <div style={S.overlayIcon}><UserCheck size={36} color="white" /></div>
                <h2 style={S.overlayHeading}>Course Rep?</h2>
                <p style={S.overlayText}>Manage attendance sessions, generate QR codes, and track student participation for your group.</p>
                <FeaturePills items={['QR Generation', 'Check-in Mgmt', 'Reports']} />
                <button style={S.switchBtn} onClick={() => setPanel('rep')}>Course Rep Login</button>
              </>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; }
        input:focus { outline: none; box-shadow: 0 0 0 2px rgba(99,102,241,0.35); background: #fff; }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}

function Alert({ type, msg }) {
  const isErr = type === 'error';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 10, marginBottom: 8,
      width: '100%', fontSize: 13,
      background: isErr ? '#fef2f2' : '#f0fdf4',
      color:      isErr ? '#dc2626' : '#16a34a',
      border:     `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`,
    }}>
      {isErr ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
      {msg}
    </div>
  );
}

function FeaturePills({ items }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0 28px' }}>
      {items.map(item => (
        <span key={item} style={{
          background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 40, padding: '5px 14px',
          fontSize: 12, color: 'white', fontWeight: 500,
        }}>✓ {item}</span>
      ))}
    </div>
  );
}

const PRIMARY = '#6366f1';
const PRIMARY2 = '#8b5cf6';
const GRAD     = `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY2} 100%)`;
const TRANS    = 'all 0.55s cubic-bezier(0.65, 0, 0.35, 1)';

const S = {
  page: { minHeight:'100vh', background:'linear-gradient(145deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden', fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  blob1: { position:'absolute', top:'-10%', left:'-5%', width:500, height:500, borderRadius:'50%', background:'rgba(99,102,241,0.15)', filter:'blur(80px)', pointerEvents:'none' },
  blob2: { position:'absolute', bottom:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'rgba(139,92,246,0.15)', filter:'blur(80px)', pointerEvents:'none' },
  blob3: { position:'absolute', top:'40%', left:'40%', width:300, height:300, borderRadius:'50%', background:'rgba(167,139,250,0.08)', filter:'blur(60px)', pointerEvents:'none' },
  backBtn: { position:'absolute', top:28, left:28, display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.15)', padding:'10px 20px', borderRadius:12, color:'white', cursor:'pointer', fontSize:14, fontWeight:500, transition:TRANS, zIndex:300 },
  card: { background:'#ffffff', borderRadius:28, boxShadow:'0 32px 64px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden', width:960, maxWidth:'100%', minHeight:580 },
  formPane: { position:'absolute', top:0, height:'100%', width:'50%', transition:TRANS, zIndex:2 },
  formPaneVisible: { opacity:1, pointerEvents:'all', transform:'translateX(0)' },
  formPaneHidden:  { opacity:0, pointerEvents:'none', transform:'translateX(-8px)' },
  form: { height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 48px', background:'#fff' },
  logo: { width:56, height:56, borderRadius:16, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 8px 20px rgba(99,102,241,0.35)' },
  logoText: { fontSize:18, fontWeight:800, color:'white' },
  heading: { fontSize:26, fontWeight:700, color:'#111827', margin:'0 0 6px' },
  badge: { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', padding:'6px 14px', borderRadius:40, fontSize:12, fontWeight:600, color:PRIMARY, marginBottom:20 },
  input: { width:'100%', padding:'13px 16px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:12, fontSize:14, color:'#111827', marginBottom:10, transition:'all 0.2s' },
  passWrap: { position:'relative', width:'100%' },
  eyeBtn: { position:'absolute', right:12, top:'50%', transform:'translateY(-60%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:6, lineHeight:0 },
  link: { color:PRIMARY, fontSize:12, textDecoration:'none', margin:'4px 0 16px', alignSelf:'flex-end' },
  submitBtn: { width:'100%', padding:'13px 0', background:GRAD, color:'white', border:'none', borderRadius:12, fontSize:14, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', letterSpacing:0.3, boxShadow:'0 6px 18px rgba(99,102,241,0.4)', transition:TRANS },
  pinDots: { display:'flex', gap:6, margin:'2px 0 14px', alignSelf:'flex-start' },
  pinDot: { width:8, height:8, borderRadius:'50%', border:'1.5px solid #d1d5db', background:'transparent', transition:'all 0.15s' },
  pinDotFilled: { background:PRIMARY, borderColor:PRIMARY },
  overlay: { position:'absolute', top:0, height:'100%', width:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', transition:TRANS, zIndex:100 },
  overlayRight: { left:'50%' },
  overlayLeft:  { left:'0%' },
  overlayInner: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 36px', textAlign:'center' },
  overlayIcon: { width:72, height:72, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 },
  overlayHeading: { fontSize:28, fontWeight:700, color:'white', margin:'0 0 12px' },
  overlayText:    { fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.7, margin:'0 0 4px' },
  switchBtn: { marginTop:4, padding:'12px 36px', borderRadius:40, background:'transparent', border:'2px solid rgba(255,255,255,0.8)', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', letterSpacing:0.5, textTransform:'uppercase', transition:TRANS },
};