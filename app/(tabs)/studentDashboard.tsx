// ============================================================
//  app/(tabs)/studentDashboard.tsx
// ============================================================
// Student Dashboard Screen.
// Features profile summaries, an active academic period badge,
// a 7-day calendar week strip, a custom SVG attendance tracker, 
// today's schedule, and recent check-in activities with method badges.
// Overhauled with premium glassmorphism styling.
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useAuth } from '@/backend/useAuth';
import { fetchDashboard } from '@/backend/dashboardService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────
interface DashboardData {
  student: {
    student_id: number;
    index_number: string;
    full_name: string;
    first_name: string;
    last_name: string;
    initials: string;
    email: string;
    phone: string;
    level: number;
    programme_name: string;
    programme_code: string;
    group_number: number;
    is_course_rep: boolean;
  };
  period: {
    period_id: number;
    label: string;
    academic_year: string;
    semester_number: number;
    start_date: string;
    end_date: string;
  } | null;
  stats: {
    total_sessions: number;
    attended: number;
    missed: number;
    rejected: number;
    percentage: number;
  };
  timetable: Array<{
    course_code: string;
    course_title: string;
    venue: string;
    day: string;
    start_time: string;
    end_time: string;
    lecturer: string;
  }>;
  recent: Array<{
    record_id: string;
    course_code: string;
    course_title: string;
    time: string;
    date: string;
    method: string;
    attended: boolean;
    submitted_at: string;
  }>;
}

const WEEK_DAYS = [
  { short: 'Sun', label: 'Sunday' },
  { short: 'Mon', label: 'Monday' },
  { short: 'Tue', label: 'Tuesday' },
  { short: 'Wed', label: 'Wednesday' },
  { short: 'Thu', label: 'Thursday' },
  { short: 'Fri', label: 'Friday' },
  { short: 'Sat', label: 'Saturday' },
];

// ── Circular Attendance Ring ─────────────────────────────────
const AttendanceRing: React.FC<{ value: number; size?: number; stroke?: number }> = ({
  value,
  size = 110,
  stroke = 9,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  const ringColor = value >= 75 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringTextContainer}>
        <Text style={[styles.ringValueText, { color: ringColor }]}>{value}%</Text>
        <Text style={styles.ringLabelText}>Present</Text>
      </View>
    </View>
  );
};

// ── Main Component ──────────────────────────────────────────
export default function StudentDashboard() {
  const { logout } = useAuth() as any;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation drivers
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Current day index
  const todayIndex = new Date().getDay();

  // Pulsing skeleton effect
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading, pulseAnim]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setError(null);
      const result = await fetchDashboard() as any;
      setData(result);
      
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('[StudentDashboard] Error loading dashboard data:', err);
      
      const errMsg = err.message || '';
      if (
        errMsg.toLowerCase().includes('session') ||
        errMsg.toLowerCase().includes('expired') ||
        errMsg.toLowerCase().includes('log in again')
      ) {
        Alert.alert('Session Expired', 'Please log in again to access the application.', [
          { text: 'OK', onPress: () => logout() }
        ]);
      } else {
        setError(errMsg || 'Failed to sync with the server.');
      }
    }
  }, [contentFadeAnim, logout]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const handleLogoutPress = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of INFOCTESS?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() }
    ]);
  };

  // ── Render Skeleton Loader ──────────────────────────────────
  const renderSkeleton = () => {
    const animatedStyle = { opacity: pulseAnim };

    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.skeletonHeaderContainer}>
          <View style={styles.skeletonHeaderRow}>
            <View>
              <Animated.View style={[styles.skeletonTextLg, animatedStyle]} />
              <Animated.View style={[styles.skeletonTextSm, { marginTop: 8 }, animatedStyle]} />
            </View>
            <Animated.View style={[styles.skeletonAvatar, animatedStyle]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Skeleton Stats Card */}
          <Animated.View style={[styles.skeletonCardLarge, animatedStyle]} />

          {/* Skeleton Class Card */}
          <View style={{ marginTop: 24 }}>
            <Animated.View style={[styles.skeletonTextMd, { width: 120 }, animatedStyle]} />
            <Animated.View style={[styles.skeletonCardSmall, { marginTop: 12 }, animatedStyle]} />
            <Animated.View style={[styles.skeletonCardSmall, { marginTop: 10 }, animatedStyle]} />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  };

  // ── Render Error Screen ─────────────────────────────────────
  if (error && !data && !loading) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Synchronization Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            activeOpacity={0.8} 
            onPress={async () => {
              setLoading(true);
              await loadData();
              setLoading(false);
            }}
          >
            <Ionicons name="refresh-outline" size={16} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (loading) return renderSkeleton();
  if (!data) return null;

  const { student, period, stats, timetable, recent } = data;

  return (
    <LinearGradient 
      colors={['#0F172A', '#0B132B', '#020617']} 
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.profileTextWrapper}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {student.first_name || student.full_name}
            </Text>
            <Text style={styles.metaText}>
              {student.index_number} · Level {student.level}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.logoutIconButton} 
              activeOpacity={0.8}
              onPress={handleLogoutPress}
            >
              <Ionicons name="log-out-outline" size={20} color="#93C5FD" />
            </TouchableOpacity>
            <View style={styles.avatarWrapper}>
              <Text style={styles.avatarText}>{student.initials}</Text>
            </View>
          </View>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: contentFadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" colors={['#60A5FA']} />
          }
        >
          {/* ── 7-Day Calendar Strip ──────────────────────────── */}
          <BlurView intensity={25} tint="dark" style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Academic Calendar Strip</Text>
              <Text style={styles.calendarActiveDayText}>
                {WEEK_DAYS[todayIndex]?.label || ''}
              </Text>
            </View>
            <View style={styles.calendarDaysRow}>
              {WEEK_DAYS.map((day, index) => {
                const isActive = index === todayIndex;
                return (
                  <View 
                    key={day.short} 
                    style={[
                      styles.calendarDayCell, 
                      isActive && styles.calendarDayCellActive
                    ]}
                  >
                    <Text 
                      style={[
                        styles.calendarDayShortText,
                        isActive && styles.calendarDayShortTextActive
                      ]}
                    >
                      {day.short}
                    </Text>
                    <View style={[styles.calendarDot, isActive && styles.calendarDotActive]} />
                  </View>
                );
              })}
            </View>
          </BlurView>

          {/* ── Badges Row ────────────────────────────────────── */}
          <View style={styles.badgesRow}>
            {student.is_course_rep && (
              <BlurView intensity={20} tint="dark" style={styles.badgeRep}>
                <Ionicons name="shield-checkmark" size={11} color="#60A5FA" />
                <Text style={styles.badgeRepText}>Course Rep</Text>
              </BlurView>
            )}
            <BlurView intensity={20} tint="dark" style={styles.badgeProgramme}>
              <Ionicons name="school-outline" size={11} color="#94A3B8" />
              <Text style={styles.badgeProgrammeText} numberOfLines={1}>
                {student.programme_code} · Group {student.group_number}
              </Text>
            </BlurView>
          </View>

          {/* ── Active Academic Period ────────────────────────── */}
          {period && (
            <BlurView intensity={15} tint="dark" style={styles.periodCard}>
              <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
              <Text style={styles.periodText}>
                {period.label} ({period.academic_year}) · Sem {period.semester_number}
              </Text>
            </BlurView>
          )}

          {/* ── Attendance Overview Card ──────────────────────── */}
          <BlurView intensity={20} tint="dark" style={styles.statsCard}>
            <View style={styles.statsCardHeader}>
              <Text style={styles.cardTitle}>Attendance Performance</Text>
              <Ionicons name="trending-up-outline" size={15} color="#94A3B8" />
            </View>
            <View style={styles.statsLayout}>
              <AttendanceRing value={stats.percentage} />
              
              <View style={styles.statsBreakdown}>
                <View style={styles.statsGridRow}>
                  <View style={styles.statsItem}>
                    <View style={styles.indicatorRow}>
                      <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.statsItemLabel}>Attended</Text>
                    </View>
                    <Text style={styles.statsItemVal}>{stats.attended}</Text>
                  </View>
                  <View style={styles.statsItem}>
                    <View style={styles.indicatorRow}>
                      <View style={[styles.dotIndicator, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.statsItemLabel}>Missed</Text>
                    </View>
                    <Text style={styles.statsItemVal}>{stats.missed}</Text>
                  </View>
                </View>

                <View style={[styles.statsGridRow, { marginTop: 12 }]}>
                  {stats.rejected > 0 && (
                    <View style={styles.statsItem}>
                      <View style={styles.indicatorRow}>
                        <View style={[styles.dotIndicator, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.statsItemLabel}>Rejected</Text>
                      </View>
                      <Text style={styles.statsItemVal}>{stats.rejected}</Text>
                    </View>
                  )}
                  <View style={styles.statsItem}>
                    <View style={styles.indicatorRow}>
                      <View style={[styles.dotIndicator, { backgroundColor: '#94A3B8' }]} />
                      <Text style={styles.statsItemLabel}>Total Classes</Text>
                    </View>
                    <Text style={styles.statsItemVal}>{stats.total_sessions}</Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>

          {/* ── Today's Classes ───────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <View style={styles.sectionCounter}>
              <Text style={styles.sectionCounterText}>{timetable.length}</Text>
            </View>
          </View>

          {timetable.length === 0 ? (
            <BlurView intensity={15} tint="dark" style={styles.emptyContainer}>
              <Ionicons name="happy-outline" size={28} color="#64748B" />
              <Text style={styles.emptyTitle}>No classes today</Text>
              <Text style={styles.emptySubtitle}>Enjoy your day! Rest or study at your own pace.</Text>
            </BlurView>
          ) : (
            timetable.map((item, index) => (
              <BlurView key={`${item.course_code}-${index}`} intensity={20} tint="dark" style={styles.timetableCard}>
                <View style={styles.timelineColumn}>
                  <Text style={styles.timelineTimeStart}>{formatTime(item.start_time)}</Text>
                  <Text style={styles.timelineTimeEnd}>{formatTime(item.end_time)}</Text>
                </View>
                <View style={styles.verticalTimelineSeparator} />
                <View style={styles.timetableDetails}>
                  <Text style={styles.timetableCourseCode}>{item.course_code}</Text>
                  <Text style={styles.timetableCourseTitle} numberOfLines={1}>
                    {item.course_title}
                  </Text>
                  <View style={styles.timetableMetaRow}>
                    <View style={styles.metaPill}>
                      <Ionicons name="location-outline" size={10} color="#94A3B8" />
                      <Text style={styles.metaPillText} numberOfLines={1}>{item.venue}</Text>
                    </View>
                    <View style={[styles.metaPill, { marginLeft: 6 }]}>
                      <Ionicons name="person-outline" size={10} color="#94A3B8" />
                      <Text style={styles.metaPillText} numberOfLines={1}>{item.lecturer}</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            ))
          )}

          {/* ── Recent Attendance logs ────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
          </View>

          {recent.length === 0 ? (
            <BlurView intensity={15} tint="dark" style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={28} color="#64748B" />
              <Text style={styles.emptyTitle}>No activities recorded</Text>
              <Text style={styles.emptySubtitle}>Your recent check-in activities will show up here.</Text>
            </BlurView>
          ) : (
            recent.map((record) => {
              const statusBg = record.attended ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
              const statusTextColor = record.attended ? '#10B981' : '#EF4444';
              const indicatorIcon = record.attended ? 'checkmark-circle' : 'close-circle';
              const indicatorColor = record.attended ? '#10B981' : '#EF4444';

              // Determine verification method label and icon
              const isQR = record.method?.toUpperCase() === 'QR';
              const checkInLabel = isQR ? 'QR Code' : 'Session Code';
              const checkInIcon = isQR ? 'qr-code-outline' : 'keypad-outline';

              return (
                <BlurView key={record.record_id} intensity={20} tint="dark" style={styles.activityCard}>
                  <View style={styles.activityLeft}>
                    <View style={styles.activityIcon}>
                      <Ionicons name={indicatorIcon} size={20} color={indicatorColor} />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {record.course_code} — {record.course_title}
                      </Text>
                      
                      {/* Check-In Meta with verification method */}
                      <View style={styles.activityMetaRow}>
                        <Text style={styles.activitySub}>
                          {record.date} at {record.time}
                        </Text>
                        <View style={styles.methodInlineBadge}>
                          <Ionicons name={checkInIcon} size={10} color="#94A3B8" style={{ marginRight: 2 }} />
                          <Text style={styles.methodInlineBadgeText}>{checkInLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.activityBadgeText, { color: statusTextColor }]}>
                      {record.attended ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </BlurView>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

// ── Time Helpers ─────────────────────────────────────────────
function formatTime(timeString: string): string {
  if (!timeString) return '—';
  const parts = timeString.split(':');
  const hrStr = parts[0] || '00';
  const minStr = parts[1] || '00';
  let hour = parseInt(hrStr, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minStr} ${suffix}`;
}

// ── Styled Layouts ───────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },

  // Profile Header
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileTextWrapper: {
    flex: 1,
    paddingRight: 16,
  },
  greetingText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  metaText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Calendar Weekdays Ribbon
  calendarContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarActiveDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarDayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: (SCREEN_WIDTH - 68) / 7,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calendarDayCellActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  calendarDayShortText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  calendarDayShortTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDot: {
    width: 3,
    height: 3,
    borderRadius: 9,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  calendarDotActive: {
    backgroundColor: '#60A5FA',
  },

  // Badges & Period Card
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  badgeRep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  badgeRepText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#60A5FA',
  },
  badgeProgramme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flex: 1,
    overflow: 'hidden',
  },
  badgeProgrammeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },

  // Glass stats card
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ringTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValueText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ringLabelText: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  statsBreakdown: {
    flex: 1,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsItem: {
    flex: 1,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  statsItemLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statsItemVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  sectionCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCounterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Timetable
  timetableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  timelineColumn: {
    width: 64,
    alignItems: 'flex-start',
  },
  timelineTimeStart: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineTimeEnd: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  verticalTimelineSeparator: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  timetableDetails: {
    flex: 1,
  },
  timetableCourseCode: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#60A5FA',
    textTransform: 'uppercase',
  },
  timetableCourseTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  timetableMetaRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    maxWidth: '50%',
  },
  metaPillText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Recent logs
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  activityIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
    gap: 6,
  },
  activitySub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  methodInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  methodInlineBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty View
  emptyContainer: {
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  // Error Card
  errorCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Skeleton
  skeletonHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonTextLg: {
    width: 140,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonTextMd: {
    width: 100,
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonTextSm: {
    width: 80,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonCardLarge: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 16,
  },
  skeletonCardSmall: {
    width: '100%',
    height: 68,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});