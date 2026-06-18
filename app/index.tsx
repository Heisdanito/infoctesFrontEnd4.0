// ============================================================
//  app/index.tsx (GetStarted)
// ============================================================
// Onboarding Carousel Screen.
// Introduces INFOCTESS features through 3 slides.
// Styled with deep dark gradients and floating glassmorphic panels.
// ============================================================

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: W } = Dimensions.get('window');

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'qr-code-outline',
    iconColor: '#60A5FA', // Premium Light Blue
    iconBg: 'rgba(59, 130, 246, 0.1)',
    title: 'Scan & Mark Attendance',
    description:
      'Quickly mark your attendance by scanning a QR code or entering the session code shared by your lecturer.',
  },
  {
    icon: 'location-outline',
    iconColor: '#34D399', // Premium Emerald Green
    iconBg: 'rgba(52, 211, 153, 0.1)',
    title: 'GPS Verified Sessions',
    description:
      'Your location is checked against the session venue to confirm you are actually present in class.',
  },
  {
    icon: 'bar-chart-outline',
    iconColor: '#A78BFA', // Premium Lavender
    iconBg: 'rgba(167, 139, 250, 0.1)',
    title: 'Track Your Progress',
    description:
      'View your attendance rate, timetable, and history all in one place — stay on top of your academic record.',
  },
];

export default function GetStarted() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(index);
  };

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * W, animated: true });
    } else {
      goToLogin();
    }
  };

  const goToLogin = () => {
    router.replace('/Login');
  };

  const isLastSlide = activeIndex === SLIDES.length - 1;

  return (
    <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Skip Button ──────────────────────────────────────── */}
      <TouchableOpacity style={styles.skipBtn} onPress={goToLogin}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* ── Slides Carousel ──────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: W }]}>
            <BlurView intensity={20} tint="dark" style={styles.glassSlide}>
              <View style={[styles.iconBox, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon} size={48} color={slide.iconColor} />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDescription}>{slide.description}</Text>
            </BlurView>
          </View>
        ))}
      </ScrollView>

      {/* ── Bottom Controls ──────────────────────────────────── */}
      <View style={styles.bottom}>
        {/* Indicators Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.nextBtn} onPress={goToNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Stylesheets ──────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  glassSlide: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: 'center',
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 9,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#3B82F6',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
