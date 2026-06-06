// ============================================================
//  web-routes.js — Web App API Endpoint Registry
//  Same BASE_URL as mobile — different path (/web/ vs /api/)
// ============================================================

export const WEB_BASE_URL = 'https://infoctes40-production.up.railway.app'; // ← same server

export const WEB_API = {

  // ── Auth ─────────────────────────────────────────────────
  auth: {
    login:   `${WEB_BASE_URL}/web/Login.php`,    // POST
    logout:  `${WEB_BASE_URL}/web/Logout.php`,   // POST
    me:      `${WEB_BASE_URL}/web/Me.php`,        // GET  (to be built)
  },

  // ── Students — to be built ────────────────────────────────
  students: {
    list:    `${WEB_BASE_URL}/web/students/list.php`,   // GET
    create:  `${WEB_BASE_URL}/web/students/create.php`, // POST
    update:  `${WEB_BASE_URL}/web/students/update.php`, // POST
    delete:  `${WEB_BASE_URL}/web/students/delete.php`, // POST
  },

  // ── Lecturers — to be built ───────────────────────────────
  lecturers: {
    list:    `${WEB_BASE_URL}/web/lecturers/list.php`,
    create:  `${WEB_BASE_URL}/web/lecturers/create.php`,
    update:  `${WEB_BASE_URL}/web/lecturers/update.php`,
    delete:  `${WEB_BASE_URL}/web/lecturers/delete.php`,
  },

  // ── Courses — to be built ─────────────────────────────────
  courses: {
    list:    `${WEB_BASE_URL}/web/courses/list.php`,
    create:  `${WEB_BASE_URL}/web/courses/create.php`,
    update:  `${WEB_BASE_URL}/web/courses/update.php`,
    delete:  `${WEB_BASE_URL}/web/courses/delete.php`,
  },

  // ── Groups — to be built ──────────────────────────────────
  groups: {
    list:    `${WEB_BASE_URL}/web/groups/list.php`,
    create:  `${WEB_BASE_URL}/web/groups/create.php`,
  },

  // ── Timetable — to be built ───────────────────────────────
  timetable: {
    list:    `${WEB_BASE_URL}/web/timetable/list.php`,
    create:  `${WEB_BASE_URL}/web/timetable/create.php`,
    update:  `${WEB_BASE_URL}/web/timetable/update.php`,
    delete:  `${WEB_BASE_URL}/web/timetable/delete.php`,
  },

  // ── Academic Periods — to be built ───────────────────────
  periods: {
    list:    `${WEB_BASE_URL}/web/periods/list.php`,
    create:  `${WEB_BASE_URL}/web/periods/create.php`,
    activate:`${WEB_BASE_URL}/web/periods/activate.php`,
  },

  // ── Course Reps — to be built ─────────────────────────────
  courseReps: {
    list:    `${WEB_BASE_URL}/web/course-reps/list.php`,
    assign:  `${WEB_BASE_URL}/web/course-reps/assign.php`,
    remove:  `${WEB_BASE_URL}/web/course-reps/remove.php`,
  },

  // ── Attendance Reports — to be built ─────────────────────
  attendance: {
    summary:  `${WEB_BASE_URL}/web/attendance/summary.php`,
    byCourse: `${WEB_BASE_URL}/web/attendance/by_course.php`,
    byStudent:`${WEB_BASE_URL}/web/attendance/by_student.php`,
    export:   `${WEB_BASE_URL}/web/attendance/export.php`,
  },
};
