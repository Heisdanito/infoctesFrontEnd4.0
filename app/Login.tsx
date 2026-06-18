// ============================================================
//  app/Login.tsx
//  Login Screen — Student, Course Rep, Lecturer authentication
//  Uses SecureStore for session persistence
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { API } from '@/backend/routes';

const { width: SW } = Dimensions.get('window');

// ── Storage Keys ─────────────────────────────────────────────
const STORAGE_KEYS = {
  USER: 'infoctess_user',
  ROLE: 'infoctess_role',
  STUDENT_ID: 'infoctess_student_id',
  IDENTIFIER: 'infoctess_identifier',
};

// ── Role definitions ─────────────────────────────────────────
const ROLES = [
  { key: 'student', label: 'Student', icon: 'school-outline', pinLen: 0, requiresPin: false },
  { key: 'rep', label: 'Course Rep', icon: 'people-outline', pinLen: 6, requiresPin: true },
  { key: 'lecturer', label: 'Lecturer', icon: 'person-outline', pinLen: 0, requiresPin: false },
];

// ── PIN keypad layout ────────────────────────────────────────
const PIN_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

// ── Step constants ───────────────────────────────────────────
const STEP_ID = 'id';
const STEP_PIN = 'pin';

// ── Helper to save user session ──────────────────────────────
async function saveUserSession(userData: any, role: string) {
  try {
    // Store the complete user object
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(userData));
    await SecureStore.setItemAsync(STORAGE_KEYS.ROLE, role);
    
    // Store student_id separately for quick access
    if (userData.student_id) {
      await SecureStore.setItemAsync(STORAGE_KEYS.STUDENT_ID, String(userData.student_id));
    }
    
    if (userData.identifier) {
      await SecureStore.setItemAsync(STORAGE_KEYS.IDENTIFIER, userData.identifier);
    }
    
    console.log('[Login] User session saved:', { 
      role, 
      student_id: userData.student_id,
      full_name: userData.full_name 
    });
    return true;
  } catch (error) {
    console.error('[Login] Error saving user session:', error);
    return false;
  }
}

// ── Main Login Component ─────────────────────────────────────
export default function Login() {
  const [role, setRole] = useState('student');
  const [idValue, setIdValue] = useState('');
  const [lectId, setLectId] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(STEP_ID);
  const [idError, setIdError] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);

  const currentRole = ROLES.find(r => r.key === role);
  const pinLen = currentRole?.pinLen || 0;
  const requiresPin = currentRole?.requiresPin || false;

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pinFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (step === STEP_PIN) {
      Animated.timing(pinFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setShowPinPad(true);
    } else {
      pinFade.setValue(0);
      setShowPinPad(false);
    }
  }, [step]);

  // Reset pin when role changes
  useEffect(() => {
    setPin('');
    setPinError('');
  }, [role]);

  function shake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  // ── Student Login API Call ──────────────────────────────────
  async function studentLogin(indexNumber: string) {
    try {
      const response = await fetch(`${API.auth.studentLogin}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ index_number: indexNumber }),
      });

      const data = await response.json();
      console.log('[Login] Student login response:', JSON.stringify(data, null, 2));

      if (data.success) {
        // Extract user data from the nested structure
        const userDataFromApi = data.data.user || data.data;
        
        const userData = {
          student_id: userDataFromApi.student_id,
          index_number: userDataFromApi.index_number,
          full_name: userDataFromApi.full_name,
          first_name: userDataFromApi.first_name,
          last_name: userDataFromApi.last_name,
          programme_id: userDataFromApi.programme_id,
          programme_name: userDataFromApi.programme_name,
          programme_code: userDataFromApi.programme_code,
          group_id: userDataFromApi.group_id,
          group_number: userDataFromApi.group_number,
          level: userDataFromApi.level,
          email: userDataFromApi.email,
          phone: userDataFromApi.phone,
          initials: userDataFromApi.initials,
          period_id: userDataFromApi.period_id,
          academic_year: userDataFromApi.academic_year,
          semester_number: userDataFromApi.semester_number,
          role: 'student',
        };
        
        console.log('[Login] Saving user data:', userData);
        await saveUserSession(userData, 'student');
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[Login] Student login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // ── Course Rep Login API Call ───────────────────────────────
  async function repLogin(indexNumber: string, pinCode: string) {
    try {
      const response = await fetch(API.auth.repLogin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          index_number: indexNumber, 
          pin: pinCode 
        }),
      });

      const data = await response.json();
      console.log('[Login] Rep login response:', JSON.stringify(data, null, 2));

      if (data.success) {
        // Extract user data from the nested structure
        const userDataFromApi = data.data.user || data.data;
        
        const userData = {
          student_id: userDataFromApi.student_id,
          index_number: userDataFromApi.index_number,
          full_name: userDataFromApi.full_name,
          first_name: userDataFromApi.first_name,
          last_name: userDataFromApi.last_name,
          programme_id: userDataFromApi.programme_id,
          programme_name: userDataFromApi.programme_name,
          programme_code: userDataFromApi.programme_code,
          group_id: userDataFromApi.group_id,
          group_number: userDataFromApi.group_number,
          level: userDataFromApi.level,
          email: userDataFromApi.email,
          phone: userDataFromApi.phone,
          initials: userDataFromApi.initials,
          rep_courses: data.data.courses || userDataFromApi.courses || [],
          role: 'rep',
        };
        
        console.log('[Login] Saving rep user data:', userData);
        await saveUserSession(userData, 'rep');
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[Login] Rep login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // ── Lecturer Login API Call ─────────────────────────────────
  async function lecturerLogin(email: string, password: string) {
    try {
      const response = await fetch(API.auth.lecturerLogin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('[Login] Lecturer login response:', JSON.stringify(data, null, 2));

      if (data.success) {
        // Extract user data from the nested structure
        const userDataFromApi = data.data.user || data.data;
        
        const userData = {
          lecturer_id: userDataFromApi.lecturer_id,
          staff_id: userDataFromApi.staff_id,
          full_name: userDataFromApi.full_name,
          first_name: userDataFromApi.first_name,
          last_name: userDataFromApi.last_name,
          email: userDataFromApi.email,
          role: 'lecturer',
        };
        
        console.log('[Login] Saving lecturer user data:', userData);
        await saveUserSession(userData, 'lecturer');
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[Login] Lecturer login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // ── Step 1: Validate ID and proceed to PIN or direct login ──
  async function handleContinue() {
    setIdError('');
    
    const identifier = role === 'lecturer' ? lectId.trim() : idValue.trim();

    if (!identifier) {
      setIdError('Please enter your ID.');
      shake();
      return;
    }

    if (role === 'lecturer' && identifier.length < 3) {
      setIdError('Enter a valid lecturer ID or email.');
      shake();
      return;
    }

    if (role !== 'lecturer' && identifier.length < 5) {
      setIdError('Enter a valid index number.');
      shake();
      return;
    }

    // If role doesn't require PIN (student), login directly
    if (!requiresPin) {
      setLoading(true);
      
      let result;
      if (role === 'student') {
        result = await studentLogin(identifier);
      } else if (role === 'lecturer') {
        // For lecturer, we need both email and password
        Alert.prompt('Password', 'Enter your password', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: async (password: any) => {
              if (password) {
                setLoading(true);
                const lectResult = await lecturerLogin(identifier, password);
                setLoading(false);
                if (lectResult.success) {
                  router.replace('/(tabs)/studentDashboard');
                } else {
                  setIdError(lectResult.message || 'Login failed');
                  shake();
                }
              }
            },
          },
        ]);
        setLoading(false);
        return;
      } else {
        result = { success: false, message: 'Invalid role' };
      }
      
      setLoading(false);
      
      if (result?.success) {
        router.replace('/(tabs)/studentDashboard');
      } else if (result) {
        setIdError(result.message || 'Login failed. Please try again.');
        shake();
      }
    } else {
      // For course rep, go to PIN step
      setStep(STEP_PIN);
    }
  }

  // ── PIN pad press for course rep ────────────────────────────
  function handleKey(key: string) {
    if (key === '') return;
    setPinError('');

    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }

    if (pin.length >= pinLen) return;
    const next = pin + key;
    setPin(next);

    if (next.length === pinLen) {
      setTimeout(() => handleRepLogin(next), 120);
    }
  }

  // ── Final course rep login submission ───────────────────────
  async function handleRepLogin(finalPin: string) {
    setLoading(true);
    const identifier = idValue.trim();
    
    const result = await repLogin(identifier, finalPin);
    
    setLoading(false);
    
    if (result.success) {
      router.replace('/(tabs)/studentDashboard');
    } else {
      setPinError(result.message || 'Invalid PIN. Please try again.');
      setPin('');
      shake();
    }
  }

  function handleBack() {
    if (step === STEP_PIN) {
      setStep(STEP_ID);
      setPin('');
      setPinError('');
    } else {
      router.back();
    }
  }

  return (
    <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#F5F5F5" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === STEP_PIN ? 'Enter PIN' : 'Sign In'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={25} tint="dark" style={styles.glassCard}>
            {/* STEP 1 — ID */}
            {step === STEP_ID && (
              <>
                <Text style={styles.subtitle}>
                  Select your role and enter your{'\n'}
                  {role === 'lecturer' ? 'lecturer ID or email' : 'index number'} to continue.
                </Text>

                {/* Role selector */}
                <View style={styles.roleRow}>
                  {ROLES.map(r => {
                    const active = role === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        style={[styles.roleBtn, active && styles.roleBtnActive]}
                        onPress={() => { setRole(r.key); setIdError(''); }}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={r.icon as any}
                          size={16}
                          color={active ? '#2563EB' : '#888888'}
                        />
                        <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ID input */}
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <View style={styles.inputGroup}>
                    <View style={[styles.inputWrap, idError ? styles.inputWrapError : null]}>
                      <Ionicons
                        name={(currentRole?.icon || 'person-outline') as any}
                        size={18}
                        color="#888888"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder={
                          role === 'lecturer'
                            ? 'Lecturer ID or Email'
                            : 'Student Index Number'
                        }
                        placeholderTextColor="#555555"
                        value={role === 'lecturer' ? lectId : idValue}
                        onChangeText={role === 'lecturer' ? setLectId : setIdValue}
                        autoCapitalize={role === 'lecturer' ? 'none' : 'characters'}
                        autoCorrect={false}
                        keyboardType={role === 'lecturer' ? 'email-address' : 'default'}
                        returnKeyType="next"
                        onSubmitEditing={handleContinue}
                        editable={!loading}
                      />
                    </View>
                    {idError ? <Text style={styles.errorText}>{idError}</Text> : null}
                  </View>
                </Animated.View>

                {/* Continue button */}
                <TouchableOpacity
                  style={[styles.btnPrimary, loading && styles.btnDisabled]}
                  onPress={handleContinue}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.btnPrimaryText}>Continue</Text>
                      <View style={styles.btnArrow}>
                        <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                        <Ionicons name="chevron-forward" size={14} color="#2563EB" style={{ marginLeft: -8 }} />
                        <Ionicons name="chevron-forward" size={14} color="#2563EB" style={{ marginLeft: -8 }} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2 — PIN (Course Rep only) */}
            {step === STEP_PIN && (
              <Animated.View style={{ opacity: pinFade }}>
                <Text style={styles.subtitle}>
                  Enter your {pinLen}-digit PIN to{'\n'}complete sign in.
                </Text>

                {/* PIN dots */}
                <Animated.View style={[styles.pinDotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                  {Array.from({ length: pinLen }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pinDot,
                        i < pin.length ? styles.pinDotFilled : styles.pinDotEmpty,
                        pinLen === 6 && styles.pinDotSm,
                      ]}
                    />
                  ))}
                </Animated.View>

                {pinError ? (
                  <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>
                    {pinError}
                  </Text>
                ) : null}

                {/* PIN pad */}
                {showPinPad && (
                  <View style={styles.pad}>
                    {PIN_KEYS.map((row, ri) => (
                      <View key={ri} style={styles.padRow}>
                        {row.map((key, ki) => {
                          const empty = key === '';
                          const isBack = key === '⌫';
                          return (
                            <TouchableOpacity
                              key={ki}
                              style={[styles.padKey, empty && styles.padKeyInvisible]}
                              onPress={() => handleKey(key)}
                              activeOpacity={empty ? 1 : 0.6}
                              disabled={empty || loading}
                            >
                              {isBack ? (
                                <Ionicons name="backspace-outline" size={22} color="#F5F5F5" />
                              ) : (
                                <Text style={styles.padKeyText}>{key}</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}

                {/* Bottom action row */}
                <View style={styles.pinActions}>
                  <TouchableOpacity
                    style={[styles.btnPrimary, styles.btnPinSubmit, (pin.length < pinLen || loading) && styles.btnDisabled]}
                    onPress={() => handleRepLogin(pin)}
                    activeOpacity={0.85}
                    disabled={pin.length < pinLen || loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Sign In</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.btnArrowOnly} 
                    onPress={() => setPin('')}
                    disabled={loading}
                  >
                    <View style={styles.btnArrow}>
                      <Ionicons name="chevron-forward" size={14} color="#888888" />
                      <Ionicons name="chevron-forward" size={14} color="#888888" style={{ marginLeft: -8 }} />
                      <Ionicons name="chevron-forward" size={14} color="#888888" style={{ marginLeft: -8 }} />
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
             )}
             </BlurView>
            </Animated.View>
          </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────
const PAD_KEY_SIZE = (SW - 48 - 24) / 3;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5F5F5',
    letterSpacing: -0.3,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Role selector
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.10)',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888888',
  },
  roleBtnTextActive: {
    color: '#2563EB',
  },

  // Input
  inputGroup: {
    marginBottom: 32,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#F5F5F5',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },

  // Primary button
  btnPrimary: {
    height: 54,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(37,99,235,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  btnArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },

  // PIN dots
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  pinDot: {
    borderRadius: 999,
  },
  pinDotFilled: {
    width: 14,
    height: 14,
    backgroundColor: '#2563EB',
  },
  pinDotEmpty: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pinDotSm: {
    width: 12,
    height: 12,
  },

  // PIN pad
  pad: {
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    gap: 12,
  },
  padKey: {
    width: PAD_KEY_SIZE,
    height: PAD_KEY_SIZE * 0.65,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  padKeyInvisible: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  padKeyText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#F5F5F5',
    letterSpacing: 1,
  },

  // PIN step actions
  pinActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  btnPinSubmit: {
    flex: 1,
  },
  btnArrowOnly: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    overflow: 'hidden',
  },
});