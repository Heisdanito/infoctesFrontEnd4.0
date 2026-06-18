/**
 * ============================================================
 *  backend/dashboardService.js
 * ============================================================
 * Service to manage student and course representative dashboard operations.
 * Resolves local session information, initiates authenticated HTTP request 
 * with the backend PHP endpoint, handles JSON decoding (stripping BOM),
 * and structures a robust fallback data model for UI rendering.
 */

import * as SecureStore from 'expo-secure-store';
import { API } from './routes';

// Storage keys aligned with authService.js
const STORAGE_KEYS = {
  user:      'infoctess_user',
  role:      'infoctess_role',
  studentId: 'infoctess_student_id',
};

/**
 * Fetch and parse a stored string item from SecureStore.
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
async function getStoredJSON(key) {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a stored string item from SecureStore.
 * @param {string} key 
 * @returns {Promise<string|null>}
 */
async function getStoredString(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * Resolves the student ID and role from storage, queries the backend PHP dashboard model,
 * cleans any Byte Order Mark (BOM) patterns, and returns a normalized dashboard data object.
 * 
 * @returns {Promise<Object>} The normalized Dashboard Data.
 * @throws {Error} Clear, user-friendly descriptive errors.
 */
export async function fetchDashboard() {
  // 1. Resolve credentials from SecureStore
  const [storedUser, storedRole, storedStudentId] = await Promise.all([
    getStoredJSON(STORAGE_KEYS.user),
    getStoredString(STORAGE_KEYS.role),
    getStoredString(STORAGE_KEYS.studentId),
  ]);

  // Priority queue for resolving Student ID
  const studentId =
    (storedStudentId ? parseInt(storedStudentId, 10) : null) ||
    storedUser?.student_id ||
    storedUser?.user?.student_id ||
    null;

  const role = storedRole || storedUser?.role || 'student';

  if (!studentId) {
    console.warn('[dashboardService] No student_id found in active session:', storedUser);
    throw new Error('Your session has expired. Please log in again to restore access.');
  }

  // 2. Formulate target endpoint URL
  const url = `${API.dashboard.index}?student_id=${studentId}&role=${encodeURIComponent(role)}`;
  console.log('[dashboardService] Fetching dashboard data from:', url);

  // 3. Initiate fetch operation with timeout abort signal
  const controller = new AbortController();
  const TIMEOUT_MS = 15000;
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('The request timed out. Please check your local network connection.');
    }
    throw new Error(`Connection error: ${err.message || 'Unable to connect to the server.'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  console.log('[dashboardService] Server response HTTP status:', response.status);

  // 4. Extract raw response text
  const rawResponseText = await response.text();
  
  // Critical fix: Strip UTF-8 BOM if present (\uFEFF) which crashes React Native Hermes parser.
  const cleanResponseText = rawResponseText.replace(/^\uFEFF/, '').trim();

  // 5. Inspect response signature
  if (!cleanResponseText.startsWith('{') && !cleanResponseText.startsWith('[')) {
    // Attempt to extract helpful details from PHP fatal errors/notices
    const plainErrorContext = cleanResponseText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
      
    console.error('[dashboardService] Non-JSON payload received:', rawResponseText);
    throw new Error(
      `Invalid server response (HTTP ${response.status}). ` +
      `Context: "${plainErrorContext || 'No details returned'}"`
    );
  }

  // 6. Decode JSON payload
  let payload;
  try {
    payload = JSON.parse(cleanResponseText);
  } catch (parseError) {
    console.error('[dashboardService] JSON parsing exception:', parseError.message);
    throw new Error('Unable to parse server data. Please try again later.');
  }

  // 7. Check operation outcome
  if (!payload.success) {
    throw new Error(payload.message || 'An error occurred while loading dashboard data.');
  }

  const data = payload.data || {};
  if (!data.student) {
    throw new Error('Dashboard payload is incomplete. Student record is missing.');
  }

  // 8. Normalize response with default fallbacks
  return {
    student: {
      student_id:     Number(data.student.student_id),
      index_number:   data.student.index_number || '',
      full_name:      data.student.full_name || `${data.student.first_name || ''} ${data.student.last_name || ''}`.trim(),
      first_name:     data.student.first_name || '',
      last_name:      data.student.last_name || '',
      initials:       data.student.initials || _extractInitials(data.student.first_name, data.student.last_name),
      email:          data.student.email || '',
      phone:          data.student.phone || '',
      level:          Number(data.student.level || 100),
      programme_name: data.student.programme_name || 'Not Assigned',
      programme_code: data.student.programme_code || 'N/A',
      group_number:   Number(data.student.group_number || 1),
      is_course_rep:  Boolean(data.student.is_course_rep),
    },
    period: data.period ? {
      period_id:       Number(data.period.period_id),
      label:           data.period.label || 'Active Semester',
      academic_year:   data.period.academic_year || '',
      semester_number: Number(data.period.semester_number || 1),
      start_date:      data.period.start_date || '',
      end_date:        data.period.end_date || '',
    } : null,
    stats: {
      total_sessions: Number(data.stats?.total_sessions ?? 0),
      attended:       Number(data.stats?.attended ?? 0),
      missed:         Number(data.stats?.missed ?? 0),
      rejected:       Number(data.stats?.rejected ?? 0),
      percentage:     Number(data.stats?.percentage ?? 0),
    },
    timetable: Array.isArray(data.timetable) ? data.timetable.map(classItem => ({
      course_code:  classItem.course_code || '',
      course_title: classItem.course_title || 'Untitled Course',
      venue:        classItem.venue || 'No location set',
      day:          classItem.day || '',
      start_time:   classItem.start_time || '00:00:00',
      end_time:     classItem.end_time || '00:00:00',
      lecturer:     classItem.lecturer || 'Staff Member',
    })) : [],
    recent: Array.isArray(data.recent) ? data.recent.map(record => ({
      record_id:    String(record.record_id),
      course_code:  record.course_code || '',
      course_title: record.course_title || 'Untitled Course',
      time:         record.time || '',
      date:         record.date || '',
      method:       record.method || 'Unknown',
      attended:     Boolean(record.attended),
      submitted_at: record.submitted_at || '',
    })) : [],
  };
}

/**
 * Extracts initials from first and last names.
 * @param {string} first 
 * @param {string} last 
 * @returns {string}
 */
function _extractInitials(first = '', last = '') {
  const f = first.trim().charAt(0).toUpperCase();
  const l = last.trim().charAt(0).toUpperCase();
  return `${f}${l}` || 'ST';
}