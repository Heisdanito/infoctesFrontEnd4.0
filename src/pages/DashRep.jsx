import { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode, Users, Trash2, Plus, Eye, Clock, CheckCircle,
  LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen,
  GraduationCap, ChevronDown, X, Smartphone, Hash,
  UserCheck, AlertCircle, Wifi, Shield
} from "lucide-react";

// ─── STATIC DATA (swap with DB calls) ────────────────────────────────────────

const MY_COURSES = [
  { code: "ICTE125", name: "Multimedia Authoring in Education" },
  { code: "ICTW123", name: "Fundamentals of Computer Programming" },
  { code: "ICTS201", name: "Systems Analysis and Design" },
  { code: "ICTD310", name: "Database Management Systems" },
];

const INITIAL_SESSIONS = [
  {
    id: "ATT-4869", course: "ICTE125", courseName: "Multimedia Authoring in Education",
    date: "6/2/2026", checkins: 2, status: "closed", timeWindow: 10,
    students: [
      { name: "Alberta Klokpa",   index: "5261000018", method: "QR Code",      time: "2:48:13 PM", avatar: "AK" },
      { name: "Emmanuel Oduro",   index: "5261000215", method: "Session Code",  time: "2:49:01 PM", avatar: "EO" },
    ]
  },
  {
    id: "ATT-6162", course: "ICTW123", courseName: "Fundamentals of Computer Programming",
    date: "6/1/2026", checkins: 1, status: "closed", timeWindow: 10,
    students: [
      { name: "Sandra Mensah",    index: "5261000712", method: "QR Code",      time: "4:10:05 PM", avatar: "SM" },
    ]
  },
  {
    id: "ATT-6656", course: "ICTW123", courseName: "Fundamentals of Computer Programming",
    date: "5/31/2026", checkins: 2, status: "closed", timeWindow: 15,
    students: [
      { name: "Nimako Joe",       index: "5261000334", method: "Session Code",  time: "4:28:57 PM", avatar: "NJ" },
      { name: "Heis Boateng",     index: "523232323",  method: "QR Code",      time: "4:30:12 PM", avatar: "HB" },
    ]
  },
];

// Simulated students who can "walk in" during a live session
const WALK_IN_POOL = [
  { name: "Alberta Klokpa",    index: "5261000018", method: "QR Code",     avatar: "AK" },
  { name: "Daniel Amoh",       index: "5261000667", method: "Session Code", avatar: "DA" },
  { name: "Emmanuel Oduro",    index: "5261000215", method: "QR Code",     avatar: "EO" },
  { name: "Emmanuel Twumasi",  index: "5261000267", method: "Session Code", avatar: "ET" },
  { name: "Heis Boateng",      index: "523232323",  method: "QR Code",     avatar: "HB" },
  { name: "Nimako Joe",        index: "5261000334", method: "Session Code", avatar: "NJ" },
  { name: "Osie Eugen Bonu",   index: "5261000660", method: "QR Code",     avatar: "OB" },
  { name: "Sandra Mensah",     index: "5261000712", method: "Session Code", avatar: "SM" },
];

// ─── QR VISUAL ───────────────────────────────────────────────────────────────

function QRVisual({ code, size = 200 }) {
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const on = ((seed * (r * 17 + 1) * (c * 13 + 1)) % 5) > 1;
      if (on) cells.push([r, c]);
    }
  }
  const cornerBlocks = [
    ...[[0,0],[0,1],[0,2],[1,0],[2,0],[2,1],[2,2],[1,2],[0,0]],
    ...[[0,10],[0,11],[0,12],[1,10],[2,10],[2,11],[2,12],[1,12]],
    ...[[10,0],[11,0],[12,0],[10,1],[10,2],[11,2],[12,1],[12,2]],
  ];
  const cs = size / 13;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="8"/>
      {cells.map(([r, c], i) => (
        <rect key={i} x={c * cs + 1} y={r * cs + 1} width={cs - 2} height={cs - 2} rx="2" fill="#0f172a"/>
      ))}
      {cornerBlocks.map(([r, c], i) => (
        <rect key={"cb" + i} x={c * cs + 1} y={r * cs + 1} width={cs - 2} height={cs - 2} rx="2" fill="#0f172a"/>
      ))}
      {/* Inner white squares for corner markers */}
      <rect x={cs + 2} y={cs + 2} width={cs - 4} height={cs - 4} rx="1" fill="white"/>
      <rect x={10 * cs + 2} y={cs + 2} width={cs - 4} height={cs - 4} rx="1" fill="white"/>
      <rect x={cs + 2} y={10 * cs + 2} width={cs - 4} height={cs - 4} rx="1" fill="white"/>
    </svg>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["#1e3a5f","#60a5fa"], ["#14532d","#4ade80"],
  ["#7c2d12","#fb923c"], ["#4a044e","#e879f9"],
  ["#1e1b4b","#818cf8"], ["#064e3b","#34d399"],
];

function Avatar({ initials, idx = 0, size = 36 }) {
  const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, flexShrink: 0,
      border: `2px solid ${fg}33`
    }}>{initials}</div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function CourseRepDashboard() {
  const [tab, setTab]             = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions]   = useState(INITIAL_SESSIONS);
  const [selectedCourse, setSelectedCourse] = useState(MY_COURSES[0].code);
  const [timeWindow, setTimeWindow] = useState("10");

  // Active session state
  const [activeSession, setActiveSession] = useState(null); // {id, course, courseName, checkins, students, countdown}
  const [showModal, setShowModal]  = useState(false);
  const [newCheckin, setNewCheckin] = useState(null); // triggers animation

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Students tab
  const [studentSearch, setStudentSearch] = useState("");

  const timerRef    = useRef(null);
  const walkInRef   = useRef(null);
  const walkInUsed  = useRef([]);

  // ── Open a new session ──
  const openSession = () => {
    const course = MY_COURSES.find(c => c.code === selectedCourse);
    const code   = "ATT-" + Math.floor(1000 + Math.random() * 9000);
    const secs   = parseInt(timeWindow) * 60;
    walkInUsed.current = [];
    const sess = {
      id: code, course: course.code, courseName: course.name,
      date: new Date().toLocaleDateString(),
      checkins: 0, status: "active", timeWindow: parseInt(timeWindow),
      students: [], countdown: secs,
    };
    setActiveSession(sess);
    setShowModal(true);
    startCountdown(sess, secs);
    scheduleWalkIns(sess);
  };

  const startCountdown = (sess, secs) => {
    clearInterval(timerRef.current);
    let remaining = secs;
    timerRef.current = setInterval(() => {
      remaining--;
      setActiveSession(prev => prev ? { ...prev, countdown: remaining } : null);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        clearInterval(walkInRef.current);
        closeSession();
      }
    }, 1000);
  };

  // Simulate random walk-ins every 4-9 seconds for demo
  const scheduleWalkIns = (sess) => {
    clearInterval(walkInRef.current);
    walkInRef.current = setInterval(() => {
      const remaining = WALK_IN_POOL.filter(
        s => !walkInUsed.current.includes(s.index)
      );
      if (remaining.length === 0) { clearInterval(walkInRef.current); return; }
      const student = remaining[Math.floor(Math.random() * remaining.length)];
      walkInUsed.current.push(student.index);
      const entry = {
        ...student,
        time: new Date().toLocaleTimeString(),
        isNew: true,
      };
      setActiveSession(prev => {
        if (!prev) return null;
        return { ...prev, checkins: prev.checkins + 1, students: [entry, ...prev.students] };
      });
      setNewCheckin(entry.index);
      setTimeout(() => setNewCheckin(null), 2000);
    }, 4000 + Math.random() * 5000);
  };

  const closeSession = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(walkInRef.current);
    setActiveSession(prev => {
      if (!prev) return null;
      const closed = { ...prev, status: "closed" };
      setSessions(s => [closed, ...s.slice(0, 2)]);
      return null;
    });
    setShowModal(false);
  }, []);

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(walkInRef.current); }, []);

  const fmtTime = s => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const pctFull = s => s > 0 ? Math.round((s / (parseInt(timeWindow)*60)) * 100) : 100;

  // ── Delete session ──
  const confirmDelete = (id) => setDeleteTarget(id);
  const doDelete = () => {
    setSessions(s => s.filter(x => x.id !== deleteTarget));
    setDeleteTarget(null);
  };

  // All students across all sessions (unique by index)
  const allStudents = Object.values(
    sessions.flatMap(s => s.students).reduce((acc, st) => {
      if (!acc[st.index]) acc[st.index] = { ...st, sessions: 0 };
      acc[st.index].sessions++;
      return acc;
    }, {})
  ).filter(s =>
    studentSearch === "" ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.index.includes(studentSearch)
  );

  const recentThree = sessions.slice(0, 3);

  // ─── SIDEBAR ─────────────────────────────────────────────────────────────

  const navLinks = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "sessions",  label: "Sessions",  icon: QrCode },
    { key: "students",  label: "Students",  icon: Users },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f1f5f9" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarOpen ? 210 : 64, minHeight:"100vh",
        background:"#0f172a", display:"flex", flexDirection:"column",
        transition:"width 0.3s ease", overflow:"hidden", flexShrink:0, zIndex:10
      }}>
        <div style={{
          padding: sidebarOpen ? "24px 20px 16px" : "24px 12px 16px",
          display:"flex", alignItems:"center", gap:10,
          borderBottom:"1px solid #1e293b"
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
            display:"flex", alignItems:"center", justifyContent:"center"
          }}>
            <GraduationCap size={20} color="white"/>
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:15 }}>INFOCTESS</div>
              <div style={{ fontSize:10, color:"#64748b" }}>Class Register</div>
            </div>
          )}
        </div>

        <nav style={{ padding:"16px 8px", flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1px", color:"#475569",
            padding: sidebarOpen ? "0 12px 8px" : "0 0 8px",
            textAlign: sidebarOpen ? "left" : "center" }}>
            {sidebarOpen ? "NAVIGATION" : "·"}
          </div>
          {navLinks.map(({ key, label, icon: Icon }) => (
            <div key={key} onClick={() => setTab(key)} style={{
              display:"flex", alignItems:"center", gap:12,
              padding: sidebarOpen ? "10px 12px" : "10px 0",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              borderRadius:10, marginBottom:4, cursor:"pointer",
              background: tab === key ? "#1e3a5f" : "transparent",
              color: tab === key ? "#60a5fa" : "#94a3b8",
              transition:"all 0.2s"
            }}>
              <Icon size={18} style={{ flexShrink:0 }}/>
              {sidebarOpen && <span style={{ fontSize:14, fontWeight: tab===key ? 600 : 400 }}>{label}</span>}
            </div>
          ))}
        </nav>

        <div style={{ borderTop:"1px solid #1e293b", padding: sidebarOpen ? "16px 20px" : "16px 8px" }}>
          {sidebarOpen && (
            <div style={{ marginBottom:12 }}>
              <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:14 }}>heis</div>
              <div style={{ color:"#64748b", fontSize:12 }}>Course Rep</div>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8, color:"#64748b",
            cursor:"pointer", fontSize:13, justifyContent: sidebarOpen ? "flex-start" : "center" }}>
            <LogOut size={16}/>{sidebarOpen && "Sign Out"}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Topbar */}
        <header style={{
          height:56, background:"white", borderBottom:"1px solid #e2e8f0",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 28px"
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            background:"none", border:"none", cursor:"pointer", color:"#64748b", padding:4
          }}>
            {sidebarOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            {activeSession && (
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                background:"#dcfce7", color:"#166534",
                padding:"6px 14px", borderRadius:40, fontSize:12, fontWeight:700
              }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a",
                  animation:"pulse 1.5s ease-in-out infinite" }}/>
                Live: {activeSession.id}
              </div>
            )}
            <span style={{ fontSize:13, fontWeight:600, color:"#334155" }}>heis</span>
          </div>
        </header>

        <main style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>

          {/* ══ DASHBOARD TAB ══ */}
          {tab === "dashboard" && (
            <>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:24, fontWeight:700, color:"#0f172a", margin:0 }}>Course Rep Dashboard</h1>
                <p style={{ fontSize:13, color:"#64748b", margin:"4px 0 0" }}>Manage attendance sessions for your group</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                {/* CREATE SESSION CARD */}
                <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0",
                  padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                    <Plus size={18} color="#3b82f6"/>
                    <span style={{ fontWeight:700, fontSize:16 }}>Create New Session</span>
                  </div>

                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>Course</label>
                    <div style={{ position:"relative" }}>
                      <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                        disabled={!!activeSession}
                        style={{
                          width:"100%", appearance:"none", padding:"10px 36px 10px 12px",
                          border:"1px solid #e2e8f0", borderRadius:9, fontSize:13,
                          background: activeSession ? "#f8fafc" : "white", color:"#1e293b", cursor:"pointer"
                        }}>
                        {MY_COURSES.map(c => (
                          <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position:"absolute", right:10, top:"50%",
                        transform:"translateY(-50%)", pointerEvents:"none", color:"#94a3b8" }}/>
                    </div>
                  </div>

                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>Time Window</label>
                    <div style={{ position:"relative" }}>
                      <select value={timeWindow} onChange={e => setTimeWindow(e.target.value)}
                        disabled={!!activeSession}
                        style={{
                          width:"100%", appearance:"none", padding:"10px 36px 10px 12px",
                          border:"1px solid #e2e8f0", borderRadius:9, fontSize:13,
                          background: activeSession ? "#f8fafc" : "white", color:"#1e293b", cursor:"pointer"
                        }}>
                        {["5","10","15","20","30"].map(t => (
                          <option key={t} value={t}>{t} minutes</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position:"absolute", right:10, top:"50%",
                        transform:"translateY(-50%)", pointerEvents:"none", color:"#94a3b8" }}/>
                    </div>
                  </div>

                  {!activeSession ? (
                    <button onClick={openSession} style={{
                      width:"100%", padding:"12px", border:"none", borderRadius:10,
                      background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
                      color:"white", fontWeight:700, fontSize:14, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      transition:"transform 0.2s, box-shadow 0.2s",
                      boxShadow:"0 4px 12px #3b82f640"
                    }}>
                      <QrCode size={16}/> Open Session
                    </button>
                  ) : (
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={() => setShowModal(true)} style={{
                        flex:1, padding:"11px", border:"none", borderRadius:10,
                        background:"#1e3a5f", color:"#60a5fa",
                        fontWeight:700, fontSize:13, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:7
                      }}>
                        <Eye size={15}/> View Live
                      </button>
                      <button onClick={closeSession} style={{
                        flex:1, padding:"11px", border:"none", borderRadius:10,
                        background:"#fef2f2", color:"#ef4444",
                        fontWeight:700, fontSize:13, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:7
                      }}>
                        <X size={15}/> End Session
                      </button>
                    </div>
                  )}

                  {activeSession && (
                    <div style={{
                      marginTop:14, padding:"10px 14px", background:"#f0fdf4",
                      borderRadius:10, border:"1px solid #bbf7d0",
                      display:"flex", alignItems:"center", justifyContent:"space-between"
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"#16a34a",
                          animation:"pulse 1.5s ease-in-out infinite" }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:"#166534" }}>{activeSession.id}</span>
                      </div>
                      <span style={{ fontSize:20, fontWeight:800, color:"#16a34a", fontVariantNumeric:"tabular-nums" }}>
                        {fmtTime(activeSession.countdown ?? 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* LAST 3 SESSIONS CARD */}
                <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0",
                  padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                    <Clock size={18} color="#64748b"/>
                    <span style={{ fontWeight:700, fontSize:16 }}>Recent Sessions</span>
                  </div>

                  {recentThree.length === 0 ? (
                    <div style={{ textAlign:"center", color:"#cbd5e1", paddingTop:40 }}>
                      <QrCode size={40} style={{ marginBottom:10 }}/>
                      <div style={{ fontSize:13 }}>No sessions yet</div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {recentThree.map((sess, i) => (
                        <div key={sess.id} style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"14px 16px", borderRadius:12,
                          background: sess.status === "active" ? "#f0fdf4" : "#f8fafc",
                          border: `1px solid ${sess.status === "active" ? "#bbf7d0" : "#e2e8f0"}`,
                          animation: i === 0 && sess.status === "active" ? "slideIn 0.4s ease" : "none"
                        }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <span style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>{sess.id}</span>
                              <span style={{
                                fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20,
                                background: sess.status === "active" ? "#dcfce7" : "#f1f5f9",
                                color: sess.status === "active" ? "#16a34a" : "#64748b"
                              }}>
                                {sess.status === "active" ? "● Live" : "Closed"}
                              </span>
                            </div>
                            <div style={{ fontSize:12, color:"#64748b", overflow:"hidden",
                              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {sess.course} · {sess.date}
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0, marginLeft:12 }}>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>{sess.checkins}</div>
                              <div style={{ fontSize:10, color:"#94a3b8" }}>check-ins</div>
                            </div>
                            <button onClick={() => confirmDelete(sess.id)} style={{
                              background:"#fef2f2", border:"none", borderRadius:8,
                              width:32, height:32, display:"flex", alignItems:"center",
                              justifyContent:"center", cursor:"pointer", color:"#ef4444"
                            }}>
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ SESSIONS TAB ══ */}
          {tab === "sessions" && (
            <>
              <div style={{ marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <h1 style={{ fontSize:24, fontWeight:700, color:"#0f172a", margin:0 }}>Manage Sessions</h1>
                  <p style={{ fontSize:13, color:"#64748b", margin:"4px 0 0" }}>View, preview and delete attendance sessions</p>
                </div>
                {activeSession && (
                  <button onClick={() => setShowModal(true)} style={{
                    display:"flex", alignItems:"center", gap:8,
                    background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
                    color:"white", border:"none", borderRadius:10,
                    padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer",
                    animation:"pulse-btn 2s ease-in-out infinite"
                  }}>
                    <Eye size={15}/> Preview Live Session
                  </button>
                )}
              </div>

              <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0",
                overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["Session Code","Course","Date","Time Window","Check-ins","Status","Actions"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"12px 20px",
                          color:"#64748b", fontWeight:600, fontSize:12,
                          borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
                        No sessions found
                      </td></tr>
                    ) : sessions.map(sess => (
                      <tr key={sess.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"14px 20px", fontWeight:700, color:"#3b82f6" }}>{sess.id}</td>
                        <td style={{ padding:"14px 20px" }}>
                          <div style={{ fontWeight:600 }}>{sess.course}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{sess.courseName.slice(0,30)}…</div>
                        </td>
                        <td style={{ padding:"14px 20px", color:"#64748b" }}>{sess.date}</td>
                        <td style={{ padding:"14px 20px", color:"#64748b" }}>{sess.timeWindow} min</td>
                        <td style={{ padding:"14px 20px" }}>
                          <span style={{ fontWeight:700, fontSize:16 }}>{sess.checkins}</span>
                        </td>
                        <td style={{ padding:"14px 20px" }}>
                          <span style={{
                            fontSize:12, fontWeight:600, padding:"3px 12px", borderRadius:20,
                            background: sess.status === "active" ? "#dcfce7" : "#f1f5f9",
                            color: sess.status === "active" ? "#16a34a" : "#64748b"
                          }}>
                            {sess.status === "active" ? "● Live" : "Closed"}
                          </span>
                        </td>
                        <td style={{ padding:"14px 20px" }}>
                          <div style={{ display:"flex", gap:8 }}>
                            {sess.status === "active" && (
                              <button onClick={() => setShowModal(true)} style={{
                                display:"flex", alignItems:"center", gap:6,
                                background:"#eff6ff", border:"1px solid #bfdbfe",
                                borderRadius:8, padding:"6px 12px", fontSize:12,
                                color:"#1d4ed8", cursor:"pointer", fontWeight:500
                              }}>
                                <Eye size={13}/> Preview
                              </button>
                            )}
                            <button onClick={() => confirmDelete(sess.id)} style={{
                              display:"flex", alignItems:"center", gap:6,
                              background:"#fef2f2", border:"1px solid #fecaca",
                              borderRadius:8, padding:"6px 12px", fontSize:12,
                              color:"#ef4444", cursor:"pointer", fontWeight:500
                            }}>
                              <Trash2 size={13}/> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══ STUDENTS TAB ══ */}
          {tab === "students" && (
            <>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:24, fontWeight:700, color:"#0f172a", margin:0 }}>Students</h1>
                <p style={{ fontSize:13, color:"#64748b", margin:"4px 0 0" }}>All students who have checked in across your sessions</p>
              </div>

              <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0",
                overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
                  display:"flex", alignItems:"center", gap:12 }}>
                  <input
                    value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search by name or index number…"
                    style={{ flex:1, padding:"9px 14px", border:"1px solid #e2e8f0",
                      borderRadius:9, fontSize:13, outline:"none" }}
                  />
                  <div style={{ fontSize:13, color:"#94a3b8", whiteSpace:"nowrap" }}>
                    {allStudents.length} student{allStudents.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["#","Student","Index Number","Method","Sessions","Last Check-in"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"10px 20px",
                          color:"#64748b", fontWeight:600, fontSize:12,
                          borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allStudents.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>
                        No students found
                      </td></tr>
                    ) : allStudents.map((s, i) => (
                      <tr key={s.index} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"12px 20px", color:"#94a3b8" }}>{i+1}</td>
                        <td style={{ padding:"12px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <Avatar initials={s.avatar} idx={i}/>
                            <span style={{ fontWeight:600 }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding:"12px 20px", color:"#64748b" }}>{s.index}</td>
                        <td style={{ padding:"12px 20px" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                            background: s.method === "QR Code" ? "#eff6ff" : "#f5f3ff",
                            color: s.method === "QR Code" ? "#1d4ed8" : "#7c3aed",
                            padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                            {s.method === "QR Code" ? <Smartphone size={11}/> : <Hash size={11}/>}
                            {s.method}
                          </span>
                        </td>
                        <td style={{ padding:"12px 20px" }}>
                          <span style={{ fontWeight:700 }}>{s.sessions}</span>
                        </td>
                        <td style={{ padding:"12px 20px", color:"#64748b" }}>{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </main>
      </div>

      {/* ══ LIVE SESSION MODAL ══ */}
      {showModal && activeSession && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
          backdropFilter:"blur(4px)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:24, animation:"fadeIn 0.25s ease"
        }}>
          <div style={{
            background:"white", borderRadius:20, width:"100%", maxWidth:960,
            maxHeight:"90vh", display:"flex", flexDirection:"column",
            overflow:"hidden", boxShadow:"0 32px 64px rgba(0,0,0,0.3)",
            animation:"slideUp 0.3s ease"
          }}>
            {/* Modal Header */}
            <div style={{
              padding:"18px 24px", borderBottom:"1px solid #e2e8f0",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:"#0f172a"
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80",
                  animation:"pulse 1.5s ease-in-out infinite" }}/>
                <span style={{ color:"white", fontWeight:700, fontSize:16 }}>Live Session</span>
                <span style={{ color:"#60a5fa", fontWeight:700, fontSize:16 }}>{activeSession.id}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  background: activeSession.countdown < 60 ? "#7f1d1d" : "#1e3a5f",
                  color: activeSession.countdown < 60 ? "#fca5a5" : "#60a5fa",
                  padding:"6px 16px", borderRadius:40, fontWeight:800,
                  fontSize:18, fontVariantNumeric:"tabular-nums",
                  display:"flex", alignItems:"center", gap:8
                }}>
                  <Clock size={15}/>{fmtTime(activeSession.countdown ?? 0)}
                </div>
                <button onClick={() => setShowModal(false)} style={{
                  background:"#1e293b", border:"none", borderRadius:8,
                  width:36, height:36, cursor:"pointer", color:"#94a3b8",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}>
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* Modal Body: QR left | Check-ins right */}
            <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

              {/* ── LEFT: QR + Info ── */}
              <div style={{
                width:340, flexShrink:0, background:"#0f172a",
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", padding:32, gap:20
              }}>
                <div style={{ fontSize:12, color:"#64748b", fontWeight:600, letterSpacing:"1px",
                  textTransform:"uppercase", alignSelf:"flex-start" }}>Scan QR Code</div>

                <div style={{
                  padding:16, background:"white", borderRadius:16,
                  boxShadow:"0 0 40px #3b82f640"
                }}>
                  <QRVisual code={activeSession.id} size={220}/>
                </div>

                {/* Session Code badge */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>OR USE SESSION CODE</div>
                  <div style={{
                    background:"#1e293b", border:"2px solid #334155",
                    borderRadius:12, padding:"10px 24px",
                    fontSize:28, fontWeight:900, letterSpacing:8,
                    color:"#60a5fa", fontVariantNumeric:"tabular-nums"
                  }}>
                    {activeSession.id}
                  </div>
                </div>

                {/* Course name */}
                <div style={{
                  width:"100%", background:"#1e293b", borderRadius:10,
                  padding:"12px 16px", border:"1px solid #334155"
                }}>
                  <div style={{ fontSize:10, color:"#64748b", fontWeight:600,
                    textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>Course</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{activeSession.course}</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{activeSession.courseName}</div>
                </div>

                {/* Stats strip */}
                <div style={{ display:"flex", gap:12, width:"100%" }}>
                  <div style={{ flex:1, background:"#1e293b", borderRadius:10, padding:"10px 14px",
                    border:"1px solid #334155", textAlign:"center" }}>
                    <div style={{ fontSize:24, fontWeight:800, color:"#4ade80" }}>
                      {activeSession.checkins}
                    </div>
                    <div style={{ fontSize:10, color:"#64748b" }}>Check-ins</div>
                  </div>
                  <div style={{ flex:1, background:"#1e293b", borderRadius:10, padding:"10px 14px",
                    border:"1px solid #334155", textAlign:"center" }}>
                    <div style={{ fontSize:24, fontWeight:800, color:"#60a5fa" }}>
                      {activeSession.timeWindow}m
                    </div>
                    <div style={{ fontSize:10, color:"#64748b" }}>Duration</div>
                  </div>
                </div>

                <button onClick={closeSession} style={{
                  width:"100%", padding:"11px", border:"none", borderRadius:10,
                  background:"#7f1d1d", color:"#fca5a5",
                  fontWeight:700, fontSize:13, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8
                }}>
                  <X size={15}/> End Session
                </button>
              </div>

              {/* ── RIGHT: Check-in list ── */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
                <div style={{
                  padding:"14px 20px", borderBottom:"1px solid #f1f5f9",
                  display:"flex", alignItems:"center", justifyContent:"space-between"
                }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>Signed-in Students</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Wifi size={14} color="#16a34a"/>
                    <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>Live</span>
                  </div>
                </div>

                <div style={{ flex:1, overflowY:"auto", padding:"12px 20px" }}>
                  {activeSession.students.length === 0 ? (
                    <div style={{ textAlign:"center", paddingTop:60, color:"#94a3b8" }}>
                      <UserCheck size={48} style={{ marginBottom:12, opacity:0.4 }}/>
                      <div style={{ fontWeight:600, fontSize:14 }}>Waiting for students…</div>
                      <div style={{ fontSize:12, marginTop:4 }}>Students will appear here as they check in</div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {activeSession.students.map((st, i) => (
                        <div key={st.index + i} style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"12px 16px", borderRadius:12,
                          background: newCheckin === st.index ? "#f0fdf4" : "#f8fafc",
                          border: `1px solid ${newCheckin === st.index ? "#86efac" : "#e2e8f0"}`,
                          animation: i === 0 ? "slideIn 0.4s ease" : "none",
                          transition:"background 0.5s, border-color 0.5s"
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <Avatar initials={st.avatar} idx={i}/>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13 }}>{st.name}</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>{st.index}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            {newCheckin === st.index && (
                              <span style={{ fontSize:11, fontWeight:700, color:"#16a34a",
                                animation:"fadeIn 0.3s ease", display:"flex", alignItems:"center", gap:4 }}>
                                <CheckCircle size={13}/> Just joined!
                              </span>
                            )}
                            <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                              background: st.method === "QR Code" ? "#eff6ff" : "#f5f3ff",
                              color: st.method === "QR Code" ? "#1d4ed8" : "#7c3aed",
                              padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:600 }}>
                              {st.method === "QR Code" ? <Smartphone size={10}/> : <Hash size={10}/>}
                              {st.method}
                            </span>
                            <span style={{ fontSize:11, color:"#94a3b8" }}>{st.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteTarget && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          backdropFilter:"blur(4px)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center",
          animation:"fadeIn 0.2s ease"
        }}>
          <div style={{
            background:"white", borderRadius:16, padding:28, maxWidth:380, width:"90%",
            boxShadow:"0 20px 40px rgba(0,0,0,0.2)", animation:"slideUp 0.25s ease"
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"#fef2f2",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <AlertCircle size={24} color="#ef4444"/>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>Delete Session</div>
                <div style={{ fontSize:12, color:"#64748b" }}>This action cannot be undone</div>
              </div>
            </div>
            <p style={{ fontSize:13, color:"#475569", marginBottom:20, lineHeight:1.6 }}>
              Are you sure you want to delete session <strong>{deleteTarget}</strong>?
              All check-in records for this session will be permanently removed.
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                flex:1, padding:"10px", border:"1px solid #e2e8f0", borderRadius:9,
                background:"white", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569"
              }}>Cancel</button>
              <button onClick={doDelete} style={{
                flex:1, padding:"10px", border:"none", borderRadius:9,
                background:"#ef4444", color:"white", fontSize:13, fontWeight:700, cursor:"pointer"
              }}>Delete Session</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-btn { 0%,100%{box-shadow:0 0 0 0 #3b82f640} 50%{box-shadow:0 0 0 8px #3b82f600} }
        select:focus,input:focus { outline:2px solid #3b82f6; outline-offset:1px; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
      `}</style>
    </div>
  );
}