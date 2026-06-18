// ============================================================
//  backend/routes.js — API Endpoint Registry
// ============================================================

// Change this to your actual server IP/domain
export const BASE_URL = 'http://10.102.208.220/infoctes';

// ── Mobile server base ────────────────────────────────────────
const MOB = `${BASE_URL}/mobile_server`;

export const API = {
  // ── Auth ─────────────────────────────────────────────────
  auth: {
    studentLogin: `${MOB}/model/stu/authLogin.php`,
    lecturerLogin: `${MOB}/model/auth/lec/authLogin.php`,
    repLogin: `${MOB}/model/auth/rep/authLogin.php`,
    logout: `${MOB}/model/auth/logout.php`,
  },

  // ── Dashboard ─────────────────────────────────────────────
  dashboard: {
    index: `${MOB}/model/stu/dashboard.php`,
  },

  // ── Session (attendance) ──────────────────────────────────
  session: {
    start: `${MOB}/model/rep/startSession.php`,
    close: `${MOB}/model/rep/closeSession.php`,
    submit: `${MOB}/model/stu/submitAttendance.php`,
    list: `${MOB}/model/rep/sessionList.php`,
    validate: `${MOB}/model/stu/getSessionInfo.php`,
  },

  // ── Timetable ─────────────────────────────────────────────
  timetable: {
    current: `${MOB}/model/stu/timetable.php`,
    byGroup: `${MOB}/model/stu/timetableGroup.php`,
  },

  // ── Blog ──────────────────────────────────────────────────
  blog: {
    list: `${MOB}/model/stu/blogList.php`,
    single: `${MOB}/model/stu/blogSingle.php`,
  },

  // ── Profile ───────────────────────────────────────────────
  profile: {
    get: `${MOB}/model/stu/profile.php`,
    attendance: `${MOB}/model/stu/attendance.php`,
  },

  // ── Lecturer (mobile) ─────────────────────────────────────
  lecturer: {
    dashboard: `${MOB}/model/lec/dashboard.php`,
    attendance: `${MOB}/model/lec/attendance.php`,
  },
};