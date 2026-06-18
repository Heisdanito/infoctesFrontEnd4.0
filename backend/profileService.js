// ============================================================
//  backend/profileService.js
//  Fetches student profile + full attendance history.
//  Matches mobile_server/model/stu/profile.php
//
//  Response shape expected:
//  {
//    student: { student_id, index_number, full_name, first_name,
//               last_name, initials, email, phone, level,
//               programme_name, programme_code, group_number,
//               is_course_rep },
//    period:  { period_id, label, academic_year, semester_number } | null,
//    stats:   { total_sessions, attended, missed, rejected, percentage },
//    history: [ { record_id, course_code, course_title, period_label,
//                 method, status, attended, location_valid,
//                 distance_meters, date, time, submitted_at } ]
//  }
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { API } from './routes';

async function getStudentId() {
  const raw = await SecureStore.getItemAsync('infoctess_student_id');
  return raw ? parseInt(raw, 10) : null;
}

/**
 * Fetch full profile data (bio + stats + history) for the
 * currently logged-in student.
 */
export async function fetchProfile() {
  const studentId = await getStudentId();

  if (!studentId) {
    throw new Error('User not authenticated. Please log in again.');
  }

  const url = `${API.profile.get}?student_id=${studentId}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    console.error('[profileService] network error:', err);
    throw new Error('Could not reach the server. Check your connection.');
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
  }

  if (!json.success) {
    throw new Error(json.message || 'Failed to load profile.');
  }

  // Normalise: guarantee history array exists even if backend is outdated
  const data = json.data;
  if (!Array.isArray(data.history)) {
    data.history = [];
  }

  return data;
}