// ============================================================
//  app/(tabs)/Profile.tsx
//  Student profile — bio info, overall stats, and full
//  attendance history. Pulls from profileService.fetchProfile()
//  which matches mobile_server/model/stu/profile.php
//  Redesigned with premium glassmorphism styling.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { fetchProfile } from '@/backend/profileService';
import { useAuth } from '@/backend/useAuth';

// ── Types ────────────────────────────────────────────────────
interface ProfileData {
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
  } | null;
  stats: {
    total_sessions: number;
    attended: number;
    missed: number;
    rejected: number;
    percentage: number;
  };
  history: Array<{
    record_id: string;
    course_code: string;
    course_title: string;
    period_label: string;
    method: string;
    status: string;
    attended: boolean;
    location_valid: boolean;
    distance_meters: number | null;
    date: string;
    time: string;
    submitted_at: string;
  }>;
}

export default function Profile() {
  const { logout } = useAuth() as any;
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchProfile();
      setData(result as any);
    } catch (err: any) {
      console.error('[Profile] load error:', err);
      setError(err.message || 'Failed to sync profile.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Syncing profile...</Text>
      </LinearGradient>
    );
  }

  if (error && !data) {
    return (
      <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.centerScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
          <Text style={styles.errorTitle}>Could Not Sync Profile</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={loadData}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (!data) return null;

  const { student, period, stats, history } = data;

  return (
    <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" colors={['#60A5FA']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name Header ───────────────────────────────── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{student.initials}</Text>
          </View>
          <Text style={styles.fullName}>{student.full_name}</Text>
          <Text style={styles.indexNumber}>{student.index_number}</Text>

          {student.is_course_rep && (
            <BlurView intensity={20} tint="dark" style={styles.repBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#60A5FA" />
              <Text style={styles.repBadgeText}>Course Representative</Text>
            </BlurView>
          )}
        </View>

        {/* ── Bio Info Card ───────────────────────────────── */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <Text style={styles.cardTitle}>Bio Information</Text>

          <InfoRow icon="mail-outline" label="Email" value={student.email} />
          <InfoRow icon="call-outline" label="Phone" value={student.phone || '—'} />
          <InfoRow icon="school-outline" label="Programme" value={`${student.programme_code} — ${student.programme_name}`} />
          <InfoRow icon="layers-outline" label="Level" value={String(student.level)} />
          <InfoRow icon="people-outline" label="Group" value={`Group ${student.group_number}`} last />
        </BlurView>

        {/* ── Academic Period Card ────────────────────────── */}
        {period && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Current Period</Text>
            <InfoRow icon="calendar-outline" label="Period" value={period.label} />
            <InfoRow icon="time-outline" label="Academic Year" value={period.academic_year} />
            <InfoRow icon="bookmark-outline" label="Semester" value={String(period.semester_number)} last />
          </BlurView>
        )}

        {/* ── Stats Card ──────────────────────────────────── */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <Text style={styles.cardTitle}>Attendance Summary</Text>
          <View style={styles.statsRow}>
            <StatBox value={stats.total_sessions} label="Total" color="#94A3B8" />
            <StatBox value={stats.attended} label="Attended" color="#10B981" />
            <StatBox value={stats.missed} label="Missed" color="#EF4444" />
            <StatBox value={`${stats.percentage}%`} label="Rate" color="#60A5FA" />
          </View>
        </BlurView>

        {/* ── Attendance History ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          <View style={styles.sectionCountContainer}>
            <Text style={styles.sectionCount}>{history.length}</Text>
          </View>
        </View>

        {history.length === 0 ? (
          <BlurView intensity={15} tint="dark" style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </BlurView>
        ) : (
          history.map((item) => {
            const statusBg = item.attended ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
            const statusTextColor = item.attended ? '#10B981' : '#EF4444';
            const indicatorIcon = item.attended ? 'checkmark-circle' : 'close-circle';
            const indicatorColor = item.attended ? '#10B981' : '#EF4444';

            return (
              <BlurView key={item.record_id} intensity={20} tint="dark" style={styles.recordCard}>
                <View style={styles.recordIcon}>
                  <Ionicons name={indicatorIcon as any} size={18} color={indicatorColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordCourse}>
                    {item.course_code} — {item.course_title}
                  </Text>
                  <Text style={styles.recordMeta}>
                    {item.date} · {item.time} · {item.method}
                  </Text>
                  <Text style={styles.recordPeriod}>{item.period_label}</Text>
                  {item.distance_meters !== null && (
                    <Text style={styles.recordDistance}>
                      {item.distance_meters}m from session location
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
                    {item.attended ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </BlurView>
            );
          })
        )}

        {/* ── Sign Out Button ──────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ── Helper Components ───────────────────────────────────────
const InfoRow: React.FC<{ icon: any; label: string; value: string; last?: boolean }> = ({
  icon,
  label,
  value,
  last,
}) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIconBox}>
      <Ionicons name={icon} size={14} color="#94A3B8" />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const StatBox: React.FC<{ value: string | number; label: string; color: string }> = ({
  value,
  label,
  color,
}) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 56,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 2,
    borderColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 28,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  indexNumber: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Rep badge
  repBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  repBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  infoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionCountContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Empty
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Record card
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 10,
    gap: 12,
    overflow: 'hidden',
  },
  recordIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCourse: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recordMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  recordPeriod: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  recordDistance: {
    fontSize: 10,
    color: '#60A5FA',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  signOutIcon: {
    marginRight: 2,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
