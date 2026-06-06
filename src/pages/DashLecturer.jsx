import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Users, AlertTriangle, BarChart2, QrCode,
  TrendingUp, Settings, LogOut, LayoutDashboard,
  FileText, GraduationCap, ChevronDown, RefreshCw,
  Download, Eye, PanelLeftClose, PanelLeftOpen, Clock,
  XCircle, Loader, Layers, Check, ChevronRight,
  Smartphone, AlertOctagon, Shield, X
} from "lucide-react";

// ─── ALL LEVELS DATA ──────────────────────────────────────────────────────────

const ALL_LEVELS = [
  {
    id: "L100", label: "Level 100", year: "1st Year",
    color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
    courses: [
      { code: "ICTE125", name: "Multimedia Authoring in Education" },
      { code: "ICTW123", name: "Fundamentals of Computer Programming" },
    ],
    groups: ["Group 1", "Group 2"],
    students: [
      { id: 1,  name: "Alberta Klokpa",   index: "5261000018", attended: 8, total: 8, pct: 100, device: "iPhone 13",      deviceId: "dev-001", flagged: false, group: "Group 1" },
      { id: 2,  name: "Daniel Amoh",      index: "5261000667", attended: 0, total: 8, pct: 0,   device: "Samsung S21",    deviceId: "dev-002", flagged: false, group: "Group 1" },
      { id: 3,  name: "Emmanuel Oduro",   index: "5261000215", attended: 7, total: 8, pct: 88,  device: "Pixel 7",        deviceId: "dev-003", flagged: false, group: "Group 2" },
      { id: 4,  name: "Emmanuel Twumasi", index: "5261000267", attended: 2, total: 8, pct: 25,  device: "Multiple (2)",   deviceId: null,      flagged: true,  alertType: "multi_device",  flagReason: "Logged in from 2 devices: iPhone 12 & Samsung A52", group: "Group 2" },
      { id: 5,  name: "Heis Boateng",     index: "523232323",  attended: 5, total: 8, pct: 63,  device: "iPhone 12",      deviceId: "dev-005", flagged: false, group: "Group 1" },
      { id: 6,  name: "Nimako Joe",       index: "5261000334", attended: 6, total: 8, pct: 75,  device: "Changed device", deviceId: null,      flagged: true,  alertType: "device_change", flagReason: "Device changed: Tecno Spark → Infinix Hot 20", group: "Group 2" },
      { id: 7,  name: "Osie Eugen Bonu",  index: "5261000660", attended: 3, total: 8, pct: 38,  device: "Tecno Spark",    deviceId: "dev-007", flagged: false, group: "Group 1" },
      { id: 8,  name: "Sandra Mensah",    index: "5261000712", attended: 8, total: 8, pct: 100, device: "iPhone SE",      deviceId: "dev-008", flagged: false, group: "Group 2" },
    ],
    sessions: [
      { id: "ATT-4869", course: "ICTE125", date: "6/2/2026",  checkins: 2, status: "closed" },
      { id: "ATT-6162", course: "ICTW123", date: "6/1/2026",  checkins: 1, status: "closed" },
      { id: "ATT-4225", course: "ICTW123", date: "5/31/2026", checkins: 1, status: "closed" },
      { id: "ATT-6656", course: "ICTW123", date: "5/30/2026", checkins: 2, status: "closed" },
    ],
    progress: [
      { label: "Overall Attendance", value: 78, color: "#3b82f6" },
      { label: "This Week",          value: 91, color: "#10b981" },
      { label: "Below 75%",          value: 22, color: "#ef4444", raw: "5 students" },
      { label: "Perfect Attendance", value: 43, color: "#f59e0b" },
    ],
    stats: { courses: 2, groups: 2, lowAttendance: 5, flagged: 2 },
  },
  {
    id: "L200", label: "Level 200", year: "2nd Year",
    color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe",
    courses: [
      { code: "ICTS201", name: "Systems Analysis and Design" },
      { code: "ICTD310", name: "Database Management Systems" },
      { code: "ICTN220", name: "Computer Networks" },
    ],
    groups: ["Group 1", "Group 2", "Group 3"],
    students: [
      { id: 9,  name: "Ama Boateng",  index: "5251000011", attended: 6, total: 8, pct: 75,  device: "Samsung A53",  deviceId: "dev-009", flagged: false, group: "Group 1" },
      { id: 10, name: "Kofi Mensah",  index: "5251000022", attended: 8, total: 8, pct: 100, device: "iPhone 14",    deviceId: "dev-010", flagged: false, group: "Group 1" },
      { id: 11, name: "Abena Osei",   index: "5251000033", attended: 3, total: 8, pct: 38,  device: "Multiple (3)", deviceId: null,      flagged: true,  alertType: "multi_device",  flagReason: "Signed in from 3 different devices this semester", group: "Group 2" },
      { id: 12, name: "Kweku Asante", index: "5251000044", attended: 7, total: 8, pct: 88,  device: "Pixel 6",      deviceId: "dev-012", flagged: false, group: "Group 2" },
      { id: 13, name: "Adwoa Darko",  index: "5251000055", attended: 1, total: 8, pct: 13,  device: "Tecno Spark",  deviceId: "dev-013", flagged: false, group: "Group 3" },
    ],
    sessions: [
      { id: "ATT-3312", course: "ICTS201", date: "6/2/2026",  checkins: 4, status: "closed" },
      { id: "ATT-2211", course: "ICTD310", date: "5/30/2026", checkins: 3, status: "closed" },
    ],
    progress: [
      { label: "Overall Attendance", value: 63, color: "#3b82f6" },
      { label: "This Week",          value: 82, color: "#10b981" },
      { label: "Below 75%",          value: 40, color: "#ef4444", raw: "3 students" },
      { label: "Perfect Attendance", value: 20, color: "#f59e0b" },
    ],
    stats: { courses: 3, groups: 3, lowAttendance: 3, flagged: 1 },
  },
  {
    id: "L300", label: "Level 300", year: "3rd Year",
    color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0",
    courses: [
      { code: "ICTP150", name: "Programming Paradigms" },
      { code: "ICTA301", name: "Artificial Intelligence" },
    ],
    groups: ["Group 1", "Group 2"],
    students: [
      { id: 14, name: "Yaw Frempong", index: "5241000001", attended: 8, total: 8, pct: 100, device: "iPhone 13 Pro",  deviceId: "dev-014", flagged: false, group: "Group 1" },
      { id: 15, name: "Akosua Ampah", index: "5241000002", attended: 5, total: 8, pct: 63,  device: "Changed device", deviceId: null,      flagged: true,  alertType: "device_change", flagReason: "Phone changed mid-semester: Huawei P30 → Samsung S22", group: "Group 1" },
      { id: 16, name: "Kwame Ofori",  index: "5241000003", attended: 8, total: 8, pct: 100, device: "Pixel 7 Pro",    deviceId: "dev-016", flagged: false, group: "Group 2" },
      { id: 17, name: "Efua Asiedu",  index: "5241000004", attended: 2, total: 8, pct: 25,  device: "Multiple (2)",   deviceId: null,      flagged: true,  alertType: "multi_device",  flagReason: "Two devices detected in same session: iPhone 11 & Oppo A57", group: "Group 2" },
    ],
    sessions: [
      { id: "ATT-7711", course: "ICTP150", date: "6/1/2026",  checkins: 3, status: "closed" },
      { id: "ATT-5522", course: "ICTA301", date: "5/28/2026", checkins: 4, status: "closed" },
    ],
    progress: [
      { label: "Overall Attendance", value: 72, color: "#3b82f6" },
      { label: "This Week",          value: 88, color: "#10b981" },
      { label: "Below 75%",          value: 50, color: "#ef4444", raw: "2 students" },
      { label: "Perfect Attendance", value: 50, color: "#f59e0b" },
    ],
    stats: { courses: 2, groups: 2, lowAttendance: 2, flagged: 2 },
  },
  {
    id: "L400", label: "Level 400", year: "4th Year",
    color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
    courses: [
      { code: "ICPR401", name: "Project Work" },
      { code: "ICTE410", name: "E-Commerce Systems" },
    ],
    groups: ["Group 1"],
    students: [
      { id: 18, name: "Nana Ama Sarpong", index: "5231000010", attended: 7, total: 8, pct: 88,  device: "Samsung S23",   deviceId: "dev-018", flagged: false, group: "Group 1" },
      { id: 19, name: "Fiifi Entsie",     index: "5231000011", attended: 8, total: 8, pct: 100, device: "iPhone 15 Pro", deviceId: "dev-019", flagged: false, group: "Group 1" },
      { id: 20, name: "Maame Serwaa",     index: "5231000012", attended: 4, total: 8, pct: 50,  device: "Multiple (2)",  deviceId: null,      flagged: true,  alertType: "multi_device",  flagReason: "Checked in using 2 phones: own device + borrowed device detected", group: "Group 1" },
    ],
    sessions: [
      { id: "ATT-9901", course: "ICPR401", date: "6/3/2026", checkins: 2, status: "closed" },
    ],
    progress: [
      { label: "Overall Attendance", value: 85, color: "#3b82f6" },
      { label: "This Week",          value: 95, color: "#10b981" },
      { label: "Below 75%",          value: 33, color: "#ef4444", raw: "1 student" },
      { label: "Perfect Attendance", value: 67, color: "#f59e0b" },
    ],
    stats: { courses: 2, groups: 1, lowAttendance: 1, flagged: 1 },
  },
];

// ─── SVG PIE CHART ────────────────────────────────────────────────────────────

function PieChart({ data, size = 200 }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return null;
  let cumulative = 0;
  const slices = data.map(d => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    const r = size / 2 - 10;
    const cx = size / 2, cy = size / 2;
    const toRad = deg => (deg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const largeArc = end - start > 180 ? 1 : 0;
    const midRad = toRad((start + end) / 2);
    const lx = cx + (r * 0.65) * Math.cos(midRad);
    const ly = cy + (r * 0.65) * Math.sin(midRad);
    const pct = Math.round((d.value / total) * 100);
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`, lx, ly, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
          {s.pct >= 8 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize="11" fontWeight="700">{s.pct}%</text>
          )}
        </g>
      ))}
      <circle cx={size / 2} cy={size / 2} r={size / 5} fill="white" />
    </svg>
  );
}

// ─── PROGRESS RING ────────────────────────────────────────────────────────────

function ProgressRing({ value, color, size = 90, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ─── QR PLACEHOLDER ──────────────────────────────────────────────────────────

function QRPlaceholder({ code }) {
  const cells = [];
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (((seed * (r + 1) * (c + 1)) % 3) !== 0) cells.push({ r, c });
  const corners = [
    [0,0],[0,1],[0,2],[1,0],[2,0],[1,2],[2,1],[2,2],
    [0,7],[0,8],[0,9],[1,7],[2,7],[1,9],[2,8],[2,9],
    [7,0],[8,0],[9,0],[7,1],[7,2],[8,2],[9,1],[9,2],
  ];
  return (
    <svg width="160" height="160" viewBox="0 0 100 100" style={{ display: "block" }}>
      <rect width="100" height="100" fill="white" rx="4" />
      {cells.map(({ r, c }, i) => <rect key={i} x={c * 10} y={r * 10} width="9" height="9" rx="1" fill="#1e293b" />)}
      {corners.map(([r, c], i) => <rect key={"c" + i} x={c * 10} y={r * 10} width="9" height="9" rx="1" fill="#1e293b" />)}
    </svg>
  );
}

// ─── ALERT DETAIL MODAL ──────────────────────────────────────────────────────

function AlertDetailModal({ student, onClose, onConfirm, onDelete }) {
  if (!student) return null;

  const isMultiDevice  = student.alertType === "multi_device";
  const isDeviceChange = student.alertType === "device_change";

  // Parse device names from flagReason
  const multiDevices = isMultiDevice
    ? (student.flagReason.match(/:\s*(.+)$/)?.[1]?.split(/[,&]/).map(d => d.trim()) || [])
    : [];
  const [oldDevice, newDevice] = isDeviceChange
    ? (student.flagReason.match(/:\s*(.+?)\s*→\s*(.+)$/) || []).slice(1)
    : [null, null];

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, animation: "fadeIn 0.2s ease"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: 20, maxWidth: 480, width: "100%",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "slideUp 0.25s ease", overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          background: isMultiDevice
            ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
            : "linear-gradient(135deg,#78350f,#92400e)",
          padding: "20px 24px", display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {isMultiDevice
              ? <Smartphone size={24} color="white" />
              : <RefreshCw size={24} color="white" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>{student.name}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{student.index}</div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "22px 24px" }}>

          {/* Alert type badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: isMultiDevice ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${isMultiDevice ? "#fecaca" : "#fde68a"}`,
            color: isMultiDevice ? "#991b1b" : "#92400e",
            padding: "6px 14px", borderRadius: 24, fontSize: 12, fontWeight: 700, marginBottom: 16
          }}>
            <AlertOctagon size={13} />
            {isMultiDevice ? "Multiple Device Login Detected" : "Device Change Detected"}
          </div>

          {/* Explanation block */}
          <div style={{
            background: "#f8fafc", borderRadius: 12, padding: "14px 16px",
            marginBottom: 16, border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>
              {isMultiDevice ? "What happened:" : "What changed:"}
            </div>

            {isMultiDevice && (
              <>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 12 }}>
                  This student's attendance was recorded from <strong>{multiDevices.length || 2} different
                  devices</strong> during this semester. This may indicate that another person checked in
                  on their behalf (proxy attendance), which is a violation of attendance policy.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {multiDevices.map((d, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "white", border: "1px solid #e2e8f0",
                      borderRadius: 8, padding: "8px 12px"
                    }}>
                      <Smartphone size={14} color={i === 0 ? "#3b82f6" : "#ef4444"} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", flex: 1 }}>{d}</span>
                      <span style={{
                        fontSize: 10, padding: "1px 8px", borderRadius: 10, fontWeight: 700,
                        background: i === 0 ? "#dbeafe" : "#fef2f2",
                        color: i === 0 ? "#1e40af" : "#991b1b"
                      }}>
                        {i === 0 ? "PRIMARY" : "SECONDARY"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isDeviceChange && (
              <>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 12 }}>
                  The device used to mark attendance has <strong>changed mid-semester</strong>. This could
                  indicate a legitimate phone replacement, or that a different person is using this
                  student's account to mark attendance.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    flex: 1, background: "white", border: "1px solid #e2e8f0",
                    borderRadius: 10, padding: "10px 14px"
                  }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>ORIGINAL DEVICE</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Smartphone size={13} color="#64748b" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{oldDevice}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                  <div style={{
                    flex: 1, background: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: 10, padding: "10px 14px"
                  }}>
                    <div style={{ fontSize: 10, color: "#b45309", marginBottom: 4, fontWeight: 600 }}>NEW DEVICE</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Smartphone size={13} color="#b45309" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{newDevice}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Attendance summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3, fontWeight: 600 }}>SESSIONS ATTENDED</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>
                {student.attended}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>/{student.total}</span>
              </div>
            </div>
            <div style={{
              flex: 1, borderRadius: 10, padding: "10px 14px",
              background: student.pct < 75 ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${student.pct < 75 ? "#fecaca" : "#bbf7d0"}`
            }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3, fontWeight: 600 }}>ATTENDANCE RATE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: student.pct < 75 ? "#ef4444" : "#16a34a" }}>
                {student.pct}%
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { onConfirm(student); onClose(); }} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "linear-gradient(135deg,#16a34a,#15803d)", color: "white",
              border: "none", borderRadius: 10, padding: "10px 0",
              fontSize: 13, fontWeight: 700, cursor: "pointer"
            }}>
              <Check size={14} /> Confirm
            </button>
            <button onClick={() => { onDelete(student); onClose(); }} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#fef2f2", color: "#ef4444",
              border: "1px solid #fecaca", borderRadius: 10, padding: "10px 0",
              fontSize: 13, fontWeight: 700, cursor: "pointer"
            }}>
              <XCircle size={14} /> Delete Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function LecturerDashboard() {
  const [showLevelModal, setShowLevelModal] = useState(true);
  const [selectedLevel, setSelectedLevel]   = useState(null);
  const [loadingLevel, setLoadingLevel]     = useState(false);

  const [navItem, setNavItem]         = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab]                 = useState("reports");
  const [course, setCourse]           = useState("");
  const [group, setGroup]             = useState("");
  const [reportType, setReportType]   = useState("Cumulative Student Attendance");

  // QR session
  const [qrCourse, setQrCourse]           = useState("");
  const [timeWindow, setTimeWindow]       = useState("10");
  const [sessionCode, setSessionCode]     = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [countdown, setCountdown]         = useState(0);
  const timerRef = useRef(null);

  // Students
  const [studentTab, setStudentTab]             = useState("all");
  const [alertModalStudent, setAlertModalStudent] = useState(null);
  const [flaggedList, setFlaggedList]           = useState([]);

  const level = selectedLevel;

  useEffect(() => {
    if (level) setFlaggedList(level.students.filter(s => s.flagged));
  }, [level]);

  const selectLevel = (lvl) => {
    setLoadingLevel(true);
    setTimeout(() => {
      setSelectedLevel(lvl);
      setCourse(lvl.courses[0]?.code || "");
      setQrCourse(lvl.courses[0]?.code || "");
      setGroup(lvl.groups[0] || "");
      setFlaggedList(lvl.students.filter(s => s.flagged));
      setLoadingLevel(false);
      setShowLevelModal(false);
    }, 900);
  };

  // Alert actions
  const handleConfirmAlert = (student) => {
    setFlaggedList(prev => prev.filter(s => s.id !== student.id));
  };
  const handleDeleteRecord = (student) => {
    setFlaggedList(prev => prev.filter(s => s.id !== student.id));
  };

  // QR timer
  const openSession = () => {
    const code = "ATT-" + Math.floor(1000 + Math.random() * 9000);
    setSessionCode(code);
    setSessionActive(true);
    setCountdown(parseInt(timeWindow) * 60);
  };
  const closeSession = () => {
    setSessionActive(false);
    setSessionCode(null);
    clearInterval(timerRef.current);
  };
  useEffect(() => {
    if (sessionActive && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); setSessionActive(false); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionActive]);

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const pctBadge = (pct) => {
    const bg   = pct === 100 ? "#dbeafe" : pct >= 75 ? "#d1fae5" : "#fee2e2";
    const text = pct === 100 ? "#1e40af" : pct >= 75 ? "#065f46" : "#991b1b";
    return <span style={{ background: bg, color: text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{pct}%</span>;
  };

  const navLinks = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "reports",   label: "Reports",   icon: FileText },
    { key: "students",  label: "Students",  icon: Users },
  ];

  const STATS = level ? [
    { label: "Total Courses",  value: String(level.stats.courses),       icon: BookOpen,      color: "#3b82f6", bg: "#eff6ff" },
    { label: "Student Groups", value: String(level.stats.groups),        icon: Users,         color: "#10b981", bg: "#ecfdf5" },
    { label: "Low Attendance", value: String(level.stats.lowAttendance), icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", sub: "Students below 75%" },
    { label: "Device Alerts",  value: String(flaggedList.length),        icon: Smartphone,    color: "#f59e0b", bg: "#fffbeb", sub: "Flagged logins" },
  ] : [];

  // Group pie chart data
  const getGroupPieData = () => {
    if (!level) return [];
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    return level.groups.map((g, i) => {
      const gs  = level.students.filter(s => s.group === g);
      const avg = gs.length ? Math.round(gs.reduce((a, s) => a + s.pct, 0) / gs.length) : 0;
      return { label: g, value: gs.length, avg, color: colors[i % colors.length] };
    });
  };
  const groupPieData = level ? getGroupPieData() : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f1f5f9", color: "#1e293b" }}>

      {/* ══ LEVEL SELECT MODAL ══ */}
      {showLevelModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f2044 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24
        }}>
          <div style={{ width: "100%", maxWidth: 700, animation: "slideUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={26} color="white" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "white", fontWeight: 800, fontSize: 22 }}>INFOCTESS</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Class Register · Lecturer Portal</div>
                </div>
              </div>
              <h2 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Select Your Level</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Choose the student level to load attendance data for</p>
            </div>

            {loadingLevel ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#3b82f6", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading level data…</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {ALL_LEVELS.map(lvl => (
                  <button key={lvl.id} onClick={() => selectLevel(lvl)} style={{
                    background: "#1e293b", border: "2px solid #334155", borderRadius: 16,
                    padding: "22px 24px", cursor: "pointer", textAlign: "left",
                    transition: "all 0.25s ease", display: "flex", alignItems: "center", gap: 16
                  }}
                    onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${lvl.color}`; e.currentTarget.style.background = "#243044"; }}
                    onMouseLeave={e => { e.currentTarget.style.border = "2px solid #334155"; e.currentTarget.style.background = "#1e293b"; }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: lvl.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${lvl.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: lvl.color }}>{lvl.id}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{lvl.label}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>{lvl.year}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: "#0f172a", color: "#94a3b8", padding: "2px 8px", borderRadius: 20 }}>{lvl.courses.length} courses</span>
                        <span style={{ fontSize: 11, background: "#0f172a", color: "#94a3b8", padding: "2px 8px", borderRadius: 20 }}>{lvl.students.length} students</span>
                        {lvl.stats.flagged > 0 && (
                          <span style={{ fontSize: 11, background: "#7f1d1d", color: "#fca5a5", padding: "2px 8px", borderRadius: 20 }}>⚠ {lvl.stats.flagged} alerts</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} color="#475569" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarOpen ? 210 : 64, minHeight: "100vh",
        background: "#0f172a", color: "#94a3b8",
        display: "flex", flexDirection: "column",
        transition: "width 0.3s ease", overflow: "hidden", flexShrink: 0, zIndex: 10
      }}>
        <div style={{ padding: sidebarOpen ? "24px 20px 16px" : "24px 12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e293b" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={20} color="white" />
          </div>
          {sidebarOpen && <div><div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>INFOCTESS</div><div style={{ fontSize: 10, color: "#64748b" }}>Class Register</div></div>}
        </div>

        {sidebarOpen && level && (
          <div style={{ margin: "12px 12px 0", padding: "10px 12px", background: "#1e293b", borderRadius: 10, border: `1px solid ${level.color}33` }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>CURRENT LEVEL</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: level.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${level.border}` }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: level.color }}>{level.id}</span>
              </div>
              <span style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{level.label}</span>
            </div>
          </div>
        )}

        <nav style={{ padding: "16px 8px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "#475569", padding: sidebarOpen ? "0 12px 8px" : "0 0 8px", textAlign: sidebarOpen ? "left" : "center" }}>
            {sidebarOpen ? "NAVIGATION" : "·"}
          </div>
          {navLinks.map(({ key, label, icon: Icon }) => {
            const hasBadge = key === "students" && flaggedList.length > 0;
            return (
              <div key={key} onClick={() => setNavItem(key)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: sidebarOpen ? "10px 12px" : "10px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                borderRadius: 10, marginBottom: 4, cursor: "pointer",
                background: navItem === key ? "#1e3a5f" : "transparent",
                color: navItem === key ? "#60a5fa" : "#94a3b8",
                transition: "all 0.2s", position: "relative"
              }}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span style={{ fontSize: 14, fontWeight: navItem === key ? 600 : 400, flex: 1 }}>{label}</span>}
                {hasBadge && sidebarOpen && <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{flaggedList.length}</span>}
                {hasBadge && !sidebarOpen && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />}
              </div>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid #1e293b", padding: sidebarOpen ? "16px 20px" : "16px 8px" }}>
          {sidebarOpen && <div style={{ marginBottom: 12 }}><div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>prof</div><div style={{ color: "#64748b", fontSize: 12 }}>Lecturer</div></div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", cursor: "pointer", fontSize: 13, justifyContent: sidebarOpen ? "flex-start" : "center" }}>
            <LogOut size={16} />{sidebarOpen && "Sign Out"}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ height: 56, background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}>
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            {level && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: level.bg, border: `1px solid ${level.border}`, padding: "4px 12px", borderRadius: 40 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: level.color }}>{level.id}</span>
                <span style={{ fontSize: 12, color: level.color, fontWeight: 500 }}>{level.year}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setShowLevelModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f172a", color: "#60a5fa", border: "1px solid #1e3a5f", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Layers size={15} /> Switch Level
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "#475569", cursor: "pointer" }}>
              <Settings size={15} /> Manage Courses
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>prof</span>
          </div>
        </header>

        {!level && !showLevelModal && (
          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#94a3b8" }}>
              <Layers size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
              <div style={{ fontWeight: 600, fontSize: 16 }}>No level selected</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Click "Switch Level" to load data</div>
            </div>
          </main>
        )}

        {/* ══ DASHBOARD PAGE ══ */}
        {level && navItem === "dashboard" && (
          <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Lecturer Dashboard</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{level.label} · {level.year} — Manage students, view reports and attendance analytics</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
              {STATS.map(({ label, value, icon: Icon, color, bg, sub }) => (
                <div key={label} style={{ background: "white", borderRadius: 14, padding: "20px 22px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color={color} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, background: "white", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid #e2e8f0", width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {[
                { key: "reports", label: "Reports",    icon: BarChart2  },
                { key: "qr",      label: "QR Session", icon: QrCode     },
                { key: "charts",  label: "Charts",     icon: TrendingUp },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 22px",
                  border: "none", cursor: "pointer", borderRadius: 9,
                  background: tab === key ? "#1e3a5f" : "transparent",
                  color: tab === key ? "#60a5fa" : "#64748b",
                  fontWeight: tab === key ? 600 : 400, fontSize: 13, transition: "all 0.2s"
                }}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>

            {/* ── DASHBOARD > REPORTS TAB (simple table view) ── */}
            {tab === "reports" && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <div style={{ padding: "22px 24px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <BarChart2 size={18} color="#3b82f6" />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Attendance Report</span>
                    <span style={{ fontSize: 12, background: level.bg, color: level.color, padding: "2px 10px", borderRadius: 20, fontWeight: 600, border: `1px solid ${level.border}` }}>{level.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "2 1 220px" }}>
                      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Course</label>
                      <div style={{ position: "relative" }}>
                        <select value={course} onChange={e => setCourse(e.target.value)} style={{ width: "100%", appearance: "none", padding: "9px 36px 9px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, background: "white", color: "#1e293b", cursor: "pointer" }}>
                          {level.courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }} />
                      </div>
                    </div>
                    <div style={{ flex: "1 1 140px" }}>
                      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Group</label>
                      <div style={{ position: "relative" }}>
                        <select value={group} onChange={e => setGroup(e.target.value)} style={{ width: "100%", appearance: "none", padding: "9px 36px 9px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, background: "white", color: "#1e293b", cursor: "pointer" }}>
                          {level.groups.map(g => <option key={g}>{g}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }} />
                      </div>
                    </div>
                    <div style={{ flex: "2 1 200px" }}>
                      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Report Type</label>
                      <div style={{ position: "relative" }}>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ width: "100%", appearance: "none", padding: "9px 36px 9px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, background: "white", color: "#1e293b", cursor: "pointer" }}>
                          <option>Cumulative Student Attendance</option>
                          <option>Per-Session Attendance</option>
                          <option>Weekly Summary</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }} />
                      </div>
                    </div>
                    <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e3a5f", color: "#60a5fa", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      <Download size={15} /> Export PDF
                    </button>
                  </div>
                </div>
                {/* Progress Rings */}
                <div style={{ display: "flex", gap: 0, padding: "20px 24px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                  {level.progress.map(item => (
                    <div key={item.label} style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px", borderRight: "1px solid #f1f5f9", gap: 10 }}>
                      <div style={{ position: "relative" }}>
                        <ProgressRing value={item.value} color={item.color} size={88} stroke={8} />
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.raw ? item.raw.split(" ")[0] : `${item.value}%`}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 500 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {/* Table */}
                <div style={{ padding: "0 24px 24px" }}>
                  <div style={{ padding: "16px 0 10px", fontSize: 13, fontWeight: 600, color: "#475569" }}>Class Attendance Metrics · {level.label}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["#", "Student Name", "Index Number", "Attended", "Total", "Percentage"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {level.students.map((row, i) => (
                        <tr key={row.id} style={{ background: row.pct < 75 ? "#fff7f7" : "white", borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{i + 1}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 600 }}>{row.name}</span>
                              {row.flagged && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef3c7", color: "#b45309", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                                  <AlertOctagon size={10} /> ALERT
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b" }}>{row.index}</td>
                          <td style={{ padding: "12px 14px" }}>{row.attended}</td>
                          <td style={{ padding: "12px 14px" }}>{row.total}</td>
                          <td style={{ padding: "12px 14px" }}>{pctBadge(row.pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DASHBOARD > QR TAB ── */}
            {tab === "qr" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <QrCode size={18} color="#3b82f6" />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Create QR Session</span>
                    <span style={{ fontSize: 12, background: level.bg, color: level.color, padding: "2px 10px", borderRadius: 20, fontWeight: 600, border: `1px solid ${level.border}` }}>{level.label}</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Course</label>
                    <div style={{ position: "relative" }}>
                      <select value={qrCourse} onChange={e => setQrCourse(e.target.value)} disabled={sessionActive} style={{ width: "100%", appearance: "none", padding: "10px 36px 10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, background: sessionActive ? "#f8fafc" : "white", color: "#1e293b", cursor: "pointer" }}>
                        {level.courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Time Window</label>
                    <div style={{ position: "relative" }}>
                      <select value={timeWindow} onChange={e => setTimeWindow(e.target.value)} disabled={sessionActive} style={{ width: "100%", appearance: "none", padding: "10px 36px 10px 12px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, background: sessionActive ? "#f8fafc" : "white", color: "#1e293b", cursor: "pointer" }}>
                        {["5", "10", "15", "20", "30"].map(t => <option key={t} value={t}>{t} minutes</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }} />
                    </div>
                  </div>
                  {!sessionActive ? (
                    <button onClick={openSession} style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <QrCode size={16} /> Open Session
                    </button>
                  ) : (
                    <button onClick={closeSession} style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: "#ef4444", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <XCircle size={16} /> Close Session
                    </button>
                  )}
                </div>

                <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  {sessionActive && sessionCode ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#10b981", fontWeight: 700, fontSize: 14 }}>
                        <Loader size={16} style={{ animation: "spin 2s linear infinite" }} /> Session Active
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: "#1e293b", marginBottom: 16 }}>{sessionCode}</div>
                      <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                        <QRPlaceholder code={sessionCode} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: countdown < 60 ? "#fef2f2" : "#eff6ff", color: countdown < 60 ? "#ef4444" : "#3b82f6", padding: "8px 20px", borderRadius: 40, fontWeight: 700, fontSize: 16 }}>
                        <Clock size={16} /> {fmtTime(countdown)}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, textAlign: "center" }}>Show this QR code to students to check in</div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", color: "#cbd5e1" }}>
                      <QrCode size={64} style={{ marginBottom: 16 }} />
                      <div style={{ fontWeight: 600, color: "#94a3b8", fontSize: 14 }}>No active session</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Open a session to generate a QR code</div>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1", background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <RefreshCw size={16} color="#64748b" /> Recent Sessions · {level.label}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Course", "Session Code", "Date", "Check-ins", "Status", "Actions"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 20px", color: "#64748b", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {level.sessions.map(s => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 20px", fontWeight: 600 }}>{s.course}</td>
                          <td style={{ padding: "12px 20px", color: "#3b82f6", fontWeight: 600 }}>{s.id}</td>
                          <td style={{ padding: "12px 20px", color: "#64748b" }}>{s.date}</td>
                          <td style={{ padding: "12px 20px" }}>{s.checkins}</td>
                          <td style={{ padding: "12px 20px" }}><span style={{ background: "#f1f5f9", color: "#64748b", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Closed</span></td>
                          <td style={{ padding: "12px 20px" }}>
                            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                              <Eye size={13} /> View List
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DASHBOARD > CHARTS TAB ── */}
            {tab === "charts" && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                  <TrendingUp size={18} color="#3b82f6" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Attendance Charts</span>
                  <span style={{ fontSize: 12, background: level.bg, color: level.color, padding: "2px 10px", borderRadius: 20, fontWeight: 600, border: `1px solid ${level.border}` }}>{level.label}</span>
                </div>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 16 }}>Attendance % by Course</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
                    {level.courses.map((c, i) => {
                      const avg = Math.round(level.students.reduce((a, s) => a + s.pct, 0) / level.students.length);
                      const val = [avg, Math.min(avg + 15, 100)][i % 2];
                      const col = val >= 75 ? "#3b82f6" : "#ef4444";
                      return (
                        <div key={c.code} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{val}%</span>
                          <div style={{ width: "100%", height: `${val}%`, background: `linear-gradient(180deg,${col}cc,${col}44)`, borderRadius: "6px 6px 0 0", transition: "height 0.6s ease" }} />
                          <span style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>{c.code}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 16 }}>Overall Metrics</div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {level.progress.map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", borderRadius: 12, padding: "14px 20px", border: "1px solid #e2e8f0", flex: "1 1 200px" }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <ProgressRing value={item.value} color={item.color} size={72} stroke={7} />
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.raw ? item.raw.split(" ")[0] : `${item.value}%`}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{item.label}</div>
                        {item.raw && <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.raw}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {/* ══ REPORTS PAGE (nav-driven, separate from dashboard) ══ */}
        {level && navItem === "reports" && (
          <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Attendance Reports</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{level.label} · {level.year} — Group statistics and attendance breakdown</p>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Enrolled Students", value: level.students.length, color: "#3b82f6", bg: "#eff6ff", icon: Users },
                { label: "Avg. Attendance",   value: `${Math.round(level.students.reduce((a, s) => a + s.pct, 0) / level.students.length)}%`, color: "#10b981", bg: "#ecfdf5", icon: TrendingUp },
                { label: "Groups Tracked",    value: level.groups.length,   color: "#8b5cf6", bg: "#f5f3ff", icon: Layers },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} style={{ background: "white", borderRadius: 14, padding: "20px 22px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color={color} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie chart + bar chart side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              {/* Pie chart */}
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Group Attendance Distribution</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Student count per group — {level.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                  <PieChart data={groupPieData} size={200} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {groupPieData.map(g => (
                      <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{g.label}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{g.value} students · avg {g.avg}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar chart per group */}
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Average Attendance by Group</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Percentage-based comparison</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {groupPieData.map(g => (
                    <div key={g.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{g.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: g.avg >= 75 ? "#10b981" : "#ef4444" }}>{g.avg}%</span>
                      </div>
                      <div style={{ height: 10, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${g.avg}%`,
                          background: g.avg >= 75 ? `linear-gradient(90deg,${g.color},${g.color}cc)` : "linear-gradient(90deg,#ef4444,#fca5a5)",
                          borderRadius: 10, transition: "width 0.8s ease"
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>THRESHOLD</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>Groups below <strong>75%</strong> are highlighted in red and require intervention.</div>
                </div>
              </div>
            </div>

            {/* Detailed student table */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Detailed Student Attendance</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>All students · {level.label}</div>
                </div>
                <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e3a5f", color: "#60a5fa", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Download size={14} /> Export PDF
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", "Student", "Index", "Group", "Attended", "Total", "Rate", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...level.students].sort((a, b) => b.pct - a.pct).map((row, i) => (
                    <tr key={row.id} style={{ background: row.pct < 75 ? "#fff7f7" : "white", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "11px 16px", color: "#94a3b8" }}>{i + 1}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: row.pct >= 75 ? "#dbeafe" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: row.pct >= 75 ? "#1e40af" : "#991b1b", flexShrink: 0 }}>
                            {row.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{row.name}</div>
                            {row.flagged && <div style={{ fontSize: 10, color: "#b45309", fontWeight: 600 }}>⚠ Device alert</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", color: "#64748b", fontSize: 12 }}>{row.index}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{row.group}</span>
                      </td>
                      <td style={{ padding: "11px 16px", fontWeight: 600 }}>{row.attended}</td>
                      <td style={{ padding: "11px 16px", color: "#64748b" }}>{row.total}</td>
                      <td style={{ padding: "11px 16px" }}>{pctBadge(row.pct)}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          background: row.pct === 100 ? "#dbeafe" : row.pct >= 75 ? "#d1fae5" : row.pct >= 50 ? "#fef3c7" : "#fee2e2",
                          color: row.pct === 100 ? "#1e40af" : row.pct >= 75 ? "#065f46" : row.pct >= 50 ? "#b45309" : "#991b1b"
                        }}>
                          {row.pct === 100 ? "Perfect" : row.pct >= 75 ? "Good" : row.pct >= 50 ? "At Risk" : "Critical"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* ══ STUDENTS PAGE ══ */}
        {level && navItem === "students" && (
          <div style={{
            position: "fixed", inset: "56px 0 0 210px",
            background: "#f1f5f9", overflowY: "auto", zIndex: 5,
            padding: "28px 32px",
            left: sidebarOpen ? 210 : 64, transition: "left 0.3s ease"
          }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Students</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{level.label} · {level.year} — {level.students.length} enrolled students</p>
            </div>

            {flaggedList.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <AlertOctagon size={20} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, color: "#c2410c", fontSize: 14, marginBottom: 2 }}>
                    Device Security Alert — {flaggedList.length} student{flaggedList.length > 1 ? "s" : ""} flagged
                  </div>
                  <div style={{ fontSize: 13, color: "#92400e" }}>
                    Some students have logged in from multiple devices or changed their device mid-semester. Review the <strong>Device Alerts</strong> tab below for details.
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 0, background: "white", borderRadius: 12, padding: 4, marginBottom: 20, border: "1px solid #e2e8f0", width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {[
                { key: "all",     label: "All Students", icon: Users },
                { key: "flagged", label: "Device Alerts", icon: Smartphone, badge: flaggedList.length },
              ].map(({ key, label, icon: Icon, badge }) => (
                <button key={key} onClick={() => setStudentTab(key)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 20px",
                  border: "none", cursor: "pointer", borderRadius: 9,
                  background: studentTab === key ? (key === "flagged" ? "#7f1d1d" : "#1e3a5f") : "transparent",
                  color: studentTab === key ? (key === "flagged" ? "#fca5a5" : "#60a5fa") : "#64748b",
                  fontWeight: studentTab === key ? 600 : 400, fontSize: 13, transition: "all 0.2s"
                }}>
                  <Icon size={14} />{label}
                  {badge > 0 && (
                    <span style={{ background: studentTab === key ? "rgba(255,255,255,0.25)" : "#ef4444", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* All students table */}
            {studentTab === "all" && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["#", "Student Name", "Index Number", "Device", "Attended", "Total", "Attendance"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {level.students.map((row, i) => (
                      <tr key={row.id} style={{ background: row.flagged ? "#fffbeb" : row.pct < 75 ? "#fff7f7" : "white", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{i + 1}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{row.name}</span>
                            {row.flagged && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fef3c7", color: "#b45309", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                                onClick={() => setAlertModalStudent(row)}>
                                <AlertOctagon size={9} /> ALERT
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{row.index}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: row.flagged ? "#fef3c7" : "#f1f5f9", color: row.flagged ? "#b45309" : "#64748b", padding: "3px 9px", borderRadius: 20, fontSize: 12 }}>
                            {row.flagged && <AlertOctagon size={10} />}
                            <Smartphone size={10} />
                            {row.device}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>{row.attended}</td>
                        <td style={{ padding: "12px 16px" }}>{row.total}</td>
                        <td style={{ padding: "12px 16px" }}>{pctBadge(row.pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Device alerts tab */}
            {studentTab === "flagged" && (
              <div>
                {flaggedList.length === 0 ? (
                  <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    <Shield size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontWeight: 600 }}>No device alerts for {level.label}</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>All flagged alerts have been resolved</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {flaggedList.map(s => (
                      <div key={s.id} style={{ background: "white", borderRadius: 14, border: "1px solid #fed7aa", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "18px 22px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.alertType === "multi_device" ? "#fef2f2" : "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.alertType === "multi_device" ? "#fecaca" : "#fde68a"}`, flexShrink: 0 }}>
                                {s.alertType === "multi_device" ? <Smartphone size={18} color="#ef4444" /> : <RefreshCw size={18} color="#b45309" />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                                <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.index}</div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginLeft: 4, background: s.alertType === "multi_device" ? "#fef2f2" : "#fffbeb", color: s.alertType === "multi_device" ? "#991b1b" : "#b45309", border: `1px solid ${s.alertType === "multi_device" ? "#fecaca" : "#fde68a"}` }}>
                                {s.alertType === "multi_device" ? "Multiple Devices" : "Device Changed"}
                              </span>
                            </div>
                            <div style={{ background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", padding: "10px 14px", fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                              <strong>⚠ Alert:</strong> {s.flagReason}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ marginBottom: 6 }}>{pctBadge(s.pct)}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.attended}/{s.total} sessions</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                          <button onClick={() => setAlertModalStudent(s)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e3a5f", color: "#60a5fa", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <Eye size={13} /> View Details
                          </button>
                          <button onClick={() => handleDeleteRecord(s)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <XCircle size={13} /> Delete Record
                          </button>
                          <button onClick={() => handleConfirmAlert(s)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <Check size={13} /> Confirm
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ALERT DETAIL MODAL ── */}
      <AlertDetailModal
        student={alertModalStudent}
        onClose={() => setAlertModalStudent(null)}
        onConfirm={handleConfirmAlert}
        onDelete={handleDeleteRecord}
      />

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        select:focus { outline: 2px solid #3b82f6; outline-offset: 1px; }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: #f1f5f9 }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px }
      `}</style>
    </div>
  );
}