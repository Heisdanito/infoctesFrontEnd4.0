// ============================================================
//  app/(tabs)/ScanAttendanceFlow.tsx
// ============================================================
// Scan Attendance Tab Screen.
// Allows students to record attendance by scanning a classroom
// QR code (using Expo SDK 54 CameraView) or typing a numeric code.
// Acquires GPS location coordinates to pass the server-side
// validation checks, handling radius limits and group access boundaries.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/backend/useAuth';
import { API } from '@/backend/routes';

// ── Interfaces ───────────────────────────────────────────────
interface SuccessData {
  record_id: number;
  status: string;
  distance_meters: number | null;
  course: {
    code: string;
    name: string;
    level: number;
  };
  student: {
    name: string;
  };
  session: {
    submitted_at: string;
  };
}

interface OutOfRangeData {
  distance_meters: number;
  radius_meters: number;
  overshoot_meters: number;
  message: string;
}

export default function ScanAttendanceFlow() {
  const { user } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
  const [manualCode, setManualCode] = useState('');
  
  // Flashlight and scanning state
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Camera permissions hook (Expo SDK 54)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Location tracking state
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | null>(null);

  // Network and transaction state
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [outOfRangeData, setOutOfRangeData] = useState<OutOfRangeData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor location permissions at startup
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationStatus(status);
    })();
  }, []);

  // ── Retrieve GPS Location Coordinates ──────────────────────
  const acquireCoordinates = async (): Promise<Location.LocationObjectCoords> => {
    setLoadingStage('Acquiring GPS coordinates...');
    
    // Request permission if not already granted
    let status = locationStatus;
    if (status !== Location.PermissionStatus.GRANTED) {
      const permissionResp = await Location.requestForegroundPermissionsAsync();
      status = permissionResp.status;
      setLocationStatus(status);
    }

    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error(
        'GPS location permissions are required. ' +
        'INFOCTESS verifies you are physically inside the classroom venue.'
      );
    }

    // Check if location services are enabled
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      throw new Error('Location services are turned off. Please enable GPS in your system settings.');
    }

    // Fetch coordinates
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location.coords;
  };

  // ── Dispatch Attendance Payload ────────────────────────────
  const submitAttendance = async (code: string, method: 'qr' | 'code') => {
    if (loading) return;

    setErrorMsg(null);
    setOutOfRangeData(null);
    setSuccessData(null);
    setLoading(true);

    const studentId = user?.student_id || user?.user?.student_id;
    if (!studentId) {
      setErrorMsg('No active student session detected. Please log out and sign back in.');
      setLoading(false);
      return;
    }

    try {
      // 1. Acquire GPS position
      const coords = await acquireCoordinates();
      console.log('[ScanAttendanceFlow] Location acquired:', coords.latitude, coords.longitude);

      // 2. Dispatch payload
      setLoadingStage('Submitting attendance details...');
      const payload = {
        student_id: Number(studentId),
        session_code: code.trim(),
        method: method,
        lat: parseFloat(coords.latitude.toFixed(6)),
        lng: parseFloat(coords.longitude.toFixed(6)),
        device_build: `${Platform.OS} client (SDK 54)`,
      };

      console.log('[ScanAttendanceFlow] POST to:', API.session.submit, payload);

      const response = await fetch(API.session.submit, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[ScanAttendanceFlow] Response status:', response.status);

      const rawText = await response.text();
      const cleanText = rawText.replace(/^\uFEFF/, '').trim();

      let json;
      try {
        json = JSON.parse(cleanText);
      } catch (parseErr) {
        console.error('[ScanAttendanceFlow] JSON parse error:', cleanText.slice(0, 300));
        throw new Error(`Server returned invalid response structure (HTTP ${response.status}).`);
      }

      console.log('[ScanAttendanceFlow] JSON Response:', json);

      if (response.status === 200 && json.success) {
        setSuccessData(json.data);
      } else if (response.status === 403 && json.message && json.message.includes('away')) {
        // Location radius overshoot
        setOutOfRangeData({
          distance_meters: json.data?.distance_meters ?? 0,
          radius_meters: json.data?.radius_meters ?? 10,
          overshoot_meters: json.data?.overshoot_meters ?? 0,
          message: json.message,
        });
      } else {
        // Generic error
        throw new Error(json.message || 'Verification rejected by the server.');
      }

    } catch (err: any) {
      console.error('[ScanAttendanceFlow] Submission exception:', err);
      setErrorMsg(err.message || 'Unable to communicate with the server.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // ── QR Scanner Scan Handler ──────────────────────────────────
  const handleQRScanned = ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    
    // Play subtle haptic response if available or run alert feedback
    console.log('[ScanAttendanceFlow] Scanned QR Code:', data);
    submitAttendance(data, 'qr');
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Required Field', 'Please enter the classroom session code.');
      return;
    }
    submitAttendance(manualCode, 'code');
  };

  const handleReset = () => {
    setScanned(false);
    setManualCode('');
    setSuccessData(null);
    setOutOfRangeData(null);
    setErrorMsg(null);
  };

  // ── Render States: Loading / Success / Out of Range ─────────
  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingTitle}>Processing Attendance</Text>
        <Text style={styles.loadingSubtitle}>{loadingStage}</Text>
      </LinearGradient>
    );
  }

  // Success Card Screen
  if (successData) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.resultCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={44} color="#10B981" />
          </View>
          <Text style={styles.resultTitle}>Attendance Recorded</Text>
          <Text style={styles.resultSubtitle}>You have successfully checked into class.</Text>

          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Course Code</Text>
              <Text style={styles.receiptValue}>{successData.course?.code}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Course Name</Text>
              <Text style={styles.receiptValue} numberOfLines={1}>{successData.course?.name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Student</Text>
              <Text style={styles.receiptValue}>{successData.student?.name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Checked In</Text>
              <Text style={styles.receiptValue}>{successData.session?.submitted_at || 'Present'}</Text>
            </View>
            {successData.distance_meters !== null && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>GPS Distance</Text>
                <Text style={styles.receiptValue}>{successData.distance_meters} meters</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.dismissButton} activeOpacity={0.8} onPress={handleReset}>
            <Text style={styles.dismissButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Out Of Range Range Gate Screen
  if (outOfRangeData) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={[styles.resultCard, { borderColor: 'rgba(245,158,11,0.2)' }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="navigate-outline" size={40} color="#D97706" />
          </View>
          <Text style={styles.resultTitle}>Location Verification Failed</Text>
          <Text style={styles.resultSubtitle}>You are outside the classroom verification radius.</Text>

          <View style={styles.overshootCard}>
            <Text style={styles.overshootText}>
              You are currently <Text style={styles.boldText}>{outOfRangeData.distance_meters}m</Text> away from the lecturer.
            </Text>
            <Text style={[styles.overshootText, { marginTop: 6 }]}>
              Please move <Text style={[styles.boldText, { color: '#EF4444' }]}>{outOfRangeData.overshoot_meters}m closer</Text> to check in.
            </Text>
            <Text style={styles.overshootRadius}>
              Allowed attendance boundary radius: {outOfRangeData.radius_meters}m
            </Text>
          </View>

          <TouchableOpacity style={[styles.dismissButton, { backgroundColor: '#D97706' }]} activeOpacity={0.8} onPress={handleReset}>
            <Text style={styles.dismissButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Generic Failure Card Screen
  if (errorMsg) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={[styles.resultCard, { borderColor: 'rgba(239,68,68,0.2)' }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
          </View>
          <Text style={styles.resultTitle}>Submission Rejected</Text>
          <Text style={styles.errorMessage}>{errorMsg}</Text>

          <TouchableOpacity style={[styles.dismissButton, { backgroundColor: '#EF4444' }]} activeOpacity={0.8} onPress={handleReset}>
            <Text style={styles.dismissButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Render Scanner View / Manual View ────────────────────────
  return (
    <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Tab Segment Controls */}
      <View style={styles.tabHeader}>
        <Text style={styles.headerTitle}>Class Check-in</Text>
        <View style={styles.segmentWrapper}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'qr' && styles.segmentBtnActive]}
            onPress={() => { setActiveTab('qr'); setErrorMsg(null); }}
          >
            <Ionicons name="qr-code-outline" size={15} color={activeTab === 'qr' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, activeTab === 'qr' && styles.segmentTextActive]}>
              QR Scanner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'code' && styles.segmentBtnActive]}
            onPress={() => { setActiveTab('code'); setErrorMsg(null); }}
          >
            <Ionicons name="keypad-outline" size={15} color={activeTab === 'code' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, activeTab === 'code' && styles.segmentTextActive]}>
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Screen Content */}
      <View style={styles.contentBody}>
        {activeTab === 'qr' ? (
          // QR Camera Mode
          !cameraPermission ? (
            <View style={styles.permissionCenter}>
              <ActivityIndicator size="small" color="#1E3A8A" />
            </View>
          ) : !cameraPermission.granted ? (
            <View style={styles.permissionCenter}>
              <Ionicons name="camera-outline" size={48} color="#94A3B8" />
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionDesc}>
                We need access to your camera to scan classroom attendance codes.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
                activeOpacity={0.85}
                onPress={requestCameraPermission}
              >
                <Text style={styles.permissionBtnText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                enableTorch={torchOn}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleQRScanned}
              />
              
              {/* Camera Frame Overlay */}
              <View style={styles.overlayScanner}>
                <View style={styles.maskRow} />
                <View style={styles.maskCenterRow}>
                  <View style={styles.maskSide} />
                  <View style={styles.scanningFrame}>
                    {/* Corner Borders */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <View style={styles.maskSide} />
                </View>
                <View style={styles.maskRow}>
                  <Text style={styles.scannerInstructions}>
                    Align the QR code inside the green borders
                  </Text>
                  
                  {/* Floating Flashlight Button */}
                  <TouchableOpacity
                    style={[styles.torchButton, torchOn && styles.torchButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setTorchOn(!torchOn)}
                  >
                    <Ionicons
                      name={torchOn ? 'flash' : 'flash-outline'}
                      size={20}
                      color={torchOn ? '#0F172A' : '#FFFFFF'}
                    />
                    <Text style={[styles.torchText, torchOn && styles.torchTextActive]}>
                      {torchOn ? 'Torch On' : 'Torch Off'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        ) : (
          // Manual Code Entry Mode
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.manualScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.manualCard}>
                <View style={styles.manualIconCircle}>
                  <Ionicons name="keypad-outline" size={32} color="#1E3A8A" />
                </View>
                <Text style={styles.manualTitle}>Enter Session Code</Text>
                <Text style={styles.manualDesc}>
                  Enter the numeric session code shared by your lecturer to submit your attendance.
                </Text>

                <TextInput
                  style={styles.manualInput}
                  placeholder="e.g. 529172"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  autoCorrect={false}
                  maxLength={10}
                  value={manualCode}
                  onChangeText={setManualCode}
                />

                <TouchableOpacity
                  style={[styles.submitCodeBtn, !manualCode.trim() && styles.submitCodeBtnDisabled]}
                  disabled={!manualCode.trim()}
                  activeOpacity={0.85}
                  onPress={handleManualSubmit}
                >
                  <Text style={styles.submitCodeBtnText}>Verify & Check In</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </LinearGradient>
  );
}

// ── Stylesheets ──────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tabHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  contentBody: {
    flex: 1,
  },

  // Camera permissions
  permissionCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  permissionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 24,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // QR Scanning View & Layout Mask
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlayScanner: {
    ...StyleSheet.absoluteFillObject,
  },
  maskRow: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  maskCenterRow: {
    height: 250,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  torchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  torchButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  torchText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  torchTextActive: {
    color: '#0F172A',
  },

  // Scanning target frame corners
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },

  // Manual Code Panel
  manualScroll: {
    padding: 24,
    alignItems: 'center',
  },
  manualCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  manualIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  manualDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  manualInput: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    marginTop: 24,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitCodeBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitCodeBtnDisabled: {
    opacity: 0.45,
  },
  submitCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Processing indicators
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },

  // Results Screen (Success / Error)
  resultCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 328,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  errorMessage: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  receiptLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  dismissButton: {
    backgroundColor: '#10B981',
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Range gating overshoot
  overshootCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  overshootText: {
    fontSize: 12.5,
    color: '#FBBF24',
    textAlign: 'center',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '800',
  },
  overshootRadius: {
    fontSize: 10,
    color: '#D97706',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
});
