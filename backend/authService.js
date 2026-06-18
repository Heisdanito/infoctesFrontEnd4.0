// ============================================================
//  services/authService.js
//  Handles all auth API calls + expo-secure-store persistence.
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { API } from './routes';

// ── SecureStore keys ──────────────────────────────────────────
const KEYS = {
  user: 'infoctess_user',
  role: 'infoctess_role',
  studentId: 'infoctess_student_id',
  identifier: 'infoctess_identifier',
};

const studentRole = 'student';
const courseRepRole = 'rep';
const lecturerRole = 'lecturer';

export async function loginStudent(indexNumber) {
  return _callLogin({
    role: studentRole,
    index_number: indexNumber,
  });
}

export async function loginCourseRep(indexNumber, pin) {
  return _callLogin({
    role: courseRepRole,
    index_number: indexNumber.trim().toUpperCase(),
    pin: String(pin),
  });
}

export async function loginLecturer(email, password) {
  return _callLogin({
    role: lecturerRole,
    email: email.trim().toLowerCase(),
    password: password,
  });
}

// ── Internal fetch helper ─────────────────────────────────────
async function _callLogin(body) {
  console.log('[authService] login request payload:', body);
  
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  let url;
  if (body.role === 'student') {
    url = API.auth.studentLogin;
  } else if (body.role === 'rep') {
    url = API.auth.repLogin;
  } else {
    url = API.auth.lecturerLogin;
  }
  
  console.log('[authService] login endpoint:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    console.log('[authService] login http status:', response.status);

    const rawText = await response.text();
    const cleanText = rawText.replace(/^\uFEFF/, '').trim();
    
    let json;
    try {
      json = JSON.parse(cleanText);
    } catch (e) {
      console.error('[authService] login parse error:', e.message, 'Raw:', cleanText.slice(0, 200));
      return { success: false, message: 'Invalid response from server.' };
    }
    
    console.log('[authService] login response json:', JSON.stringify(json, null, 2));

    if (!json.success) {
      return { success: false, message: json.message || 'Login failed.' };
    }

    // Extract user data - handle both nested and flat structures
    const userData = json.data.user || json.data;
    
    // Ensure student_id is properly set
    const studentId = userData.student_id || userData.user?.student_id;
    
    const userToStore = {
      ...userData,
      student_id: studentId,
      role: body.role,
    };
    
    console.log('[authService] Storing user data:', userToStore);
    console.log('[authService] Student ID to store:', studentId);

    // Persist in SecureStore
    await Promise.all([
      SecureStore.setItemAsync(KEYS.user, JSON.stringify(userToStore)),
      SecureStore.setItemAsync(KEYS.role, body.role),
      SecureStore.setItemAsync(KEYS.studentId, String(studentId || '')),
      SecureStore.setItemAsync(KEYS.identifier, userData.index_number || userData.email || ''),
    ]);

    return { success: true, user: userToStore, message: json.message };

  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        success: false,
        message: `Login timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
      };
    }

    console.error('[authService] login error:', error);
    return {
      success: false,
      message: 'Could not reach the server. Check your connection.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── READ stored session ─────────────────────────────────────────
export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export async function getStoredRole() {
  return await SecureStore.getItemAsync(KEYS.role);
}

export async function getStoredStudentId() {
  const id = await SecureStore.getItemAsync(KEYS.studentId);
  return id ? parseInt(id, 10) : null;
}

export async function isLoggedIn() {
  const user = await getStoredUser();
  return !!user;
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logout() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.user),
    SecureStore.deleteItemAsync(KEYS.role),
    SecureStore.deleteItemAsync(KEYS.studentId),
    SecureStore.deleteItemAsync(KEYS.identifier),
  ]);
}