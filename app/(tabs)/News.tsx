// ============================================================
//  app/(tabs)/News.tsx
// ============================================================
// Announcement Feed Screen designed like X (formerly Twitter).
// Shows postings/notices from verified lecturers.
// Students can search/filter, toggle likes, reposts, and add
// comments in a sliding detail sheet.
// Overhauled with premium glassmorphic dark theme.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/backend/useAuth';

// ── Interfaces ───────────────────────────────────────────────
interface Comment {
  comment_id: string;
  author_name: string;
  author_handle: string;
  author_initials: string;
  author_role: 'student' | 'rep' | 'lecturer';
  text: string;
  time_ago: string;
}

interface Post {
  id: string;
  lecturer_name: string;
  lecturer_title: string;
  lecturer_handle: string;
  lecturer_initials: string;
  lecturer_avatar_color: string;
  content: string;
  timestamp: string;
  likes: number;
  reposts: number;
  views: number;
  comments: Comment[];
  is_liked: boolean;
  is_reposted: boolean;
  image?: string;
}

// ── Mock Data ────────────────────────────────────────────────
const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    lecturer_name: 'Emmanuel Mensah',
    lecturer_title: 'Dr.',
    lecturer_handle: '@e_mensah',
    lecturer_initials: 'EM',
    lecturer_avatar_color: '#1E3A8A', // Deep Blue
    content: 'Attention Level 300 Students: The examination for ICT 352 (Mobile Application Development) has been rescheduled to Tuesday, 23rd June at 8:30 AM in the ICT Lab 1. Please ensure your project repository link is submitted before Monday midnight. #Rescheduled #Exam',
    timestamp: '2h',
    likes: 42,
    reposts: 12,
    views: 890,
    is_liked: false,
    is_reposted: false,
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
    comments: [
      {
        comment_id: 'c-1',
        author_name: 'David Osei',
        author_handle: '@d_osei',
        author_initials: 'DO',
        author_role: 'student',
        text: 'Thank you, Dr. Mensah. Will the exam cover Unit 5 as well?',
        time_ago: '1h',
      },
      {
        comment_id: 'c-2',
        author_name: 'Sarah Cobbina',
        author_handle: '@sarah_c',
        author_initials: 'SC',
        author_role: 'rep',
        text: 'Noted, Sir. I will share the update on our main department page as well.',
        time_ago: '45m',
      }
    ],
  },
  {
    id: 'post-2',
    lecturer_name: 'Faustina Appiah',
    lecturer_title: 'Dr.',
    lecturer_handle: '@fausty_appiah',
    lecturer_initials: 'FA',
    lecturer_avatar_color: '#7C3AED', // Purple
    content: 'Reminder: Guest lecture on Cloud Architectures by a Google Cloud Engineer tomorrow at 10:00 AM in the Main Auditorium. Attendance is compulsory for all Level 400 students. Sign-in sheets will be verified. #GuestLecture #Cloud',
    timestamp: '5h',
    likes: 56,
    reposts: 28,
    views: 1205,
    is_liked: false,
    is_reposted: false,
    comments: [],
  },
  {
    id: 'post-3',
    lecturer_name: 'Prince Boateng',
    lecturer_title: 'Mr.',
    lecturer_handle: '@p_boateng',
    lecturer_initials: 'PB',
    lecturer_avatar_color: '#0D9488', // Teal
    content: 'Course Representatives: Please collect the assignment sheets for INF 351 from my office today by 4:00 PM. Ensure they are distributed to your respective groups. Late submissions will attract a 10% penalty. #Assignment #Alert',
    timestamp: '1d',
    likes: 24,
    reposts: 7,
    views: 450,
    is_liked: false,
    is_reposted: false,
    comments: [
      {
        comment_id: 'c-3',
        author_name: 'John Dumelo',
        author_handle: '@jd_rep',
        author_initials: 'JD',
        author_role: 'rep',
        text: 'Understood, Mr. Boateng. I will pick them up in 10 minutes.',
        time_ago: '18h',
      }
    ],
  },
  {
    id: 'post-4',
    lecturer_name: 'Gertrude Addo',
    lecturer_title: 'Prof.',
    lecturer_handle: '@prof_gertrude',
    lecturer_initials: 'GA',
    lecturer_avatar_color: '#B45309', // Amber
    content: 'Great job to everyone who participated in the hackathon yesterday! The department is proud of your innovations. The winners will be announced during the general meeting this Friday at 2:00 PM. See you all there! 🏆✨ #Hackathon #INFOCTESS',
    timestamp: '2d',
    likes: 88,
    reposts: 19,
    views: 1840,
    is_liked: false,
    is_reposted: false,
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
    comments: [],
  },
];

export default function News() {
  const { user } = useAuth() as any;
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Comment Thread Modal State
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Search & Filter Logic
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.lecturer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.lecturer_handle.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Rescheduled') return matchesSearch && post.content.toLowerCase().includes('reschedule');
    if (activeFilter === 'Exams') return matchesSearch && post.content.toLowerCase().includes('exam');
    if (activeFilter === 'Assignments') return matchesSearch && post.content.toLowerCase().includes('assignment');
    return matchesSearch;
  });

  // Toggle Like Action
  const handleLike = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const isLiked = !post.is_liked;
          return {
            ...post,
            is_liked: isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );

    // Sync active post details modal if open
    if (activePost && activePost.id === postId) {
      setActivePost(prev => {
        if (!prev) return null;
        const isLiked = !prev.is_liked;
        return {
          ...prev,
          is_liked: isLiked,
          likes: isLiked ? prev.likes + 1 : prev.likes - 1,
        };
      });
    }
  };

  // Toggle Repost Action
  const handleRepost = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const isReposted = !post.is_reposted;
          return {
            ...post,
            is_reposted: isReposted,
            reposts: isReposted ? post.reposts + 1 : post.reposts - 1,
          };
        }
        return post;
      })
    );

    // Sync active post details modal if open
    if (activePost && activePost.id === postId) {
      setActivePost(prev => {
        if (!prev) return null;
        const isReposted = !prev.is_reposted;
        return {
          ...prev,
          is_reposted: isReposted,
          reposts: isReposted ? prev.reposts + 1 : prev.reposts - 1,
        };
      });
    }
  };

  // Open Comments Detail View
  const handleOpenComments = (post: Post) => {
    setActivePost(post);
    setModalVisible(true);
  };

  // Submit student comment
  const handleSubmitComment = () => {
    if (!commentText.trim() || !activePost) return;

    const newComment: Comment = {
      comment_id: `c-student-${Date.now()}`,
      author_name: user?.full_name || 'Student User',
      author_handle: `@${user?.first_name?.toLowerCase() || 'student'}_info`,
      author_initials: user?.initials || 'ST',
      author_role: user?.is_course_rep ? 'rep' : 'student',
      text: commentText.trim(),
      time_ago: 'Just now',
    };

    // Update posts state
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === activePost.id) {
          return {
            ...post,
            comments: [newComment, ...post.comments],
          };
        }
        return post;
      })
    );

    // Update active post modal state
    setActivePost(prev => {
      if (!prev) return null;
      return {
        ...prev,
        comments: [newComment, ...prev.comments],
      };
    });

    setCommentText('');
  };

  // Render Single Feed Item
  const renderPostItem = ({ item }: { item: Post }) => {
    return (
      <View style={styles.postCard}>
        {/* Avatar */}
        <View style={[styles.avatarCircle, { backgroundColor: item.lecturer_avatar_color }]}>
          <Text style={styles.avatarText}>{item.lecturer_initials}</Text>
        </View>

        {/* Content Column */}
        <View style={styles.postContentColumn}>
          {/* Header Row */}
          <View style={styles.postHeaderRow}>
            <Text style={styles.lecturerNameText} numberOfLines={1}>
              {item.lecturer_title} {item.lecturer_name}
            </Text>
            <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={styles.verifiedIcon} />
            <Text style={styles.handleText} numberOfLines={1}>
              {item.lecturer_handle}
            </Text>
            <Text style={styles.bulletSeparator}>·</Text>
            <Text style={styles.timeAgoText}>{item.timestamp}</Text>
          </View>

          {/* Announcement content */}
          <Text style={styles.postBodyText}>{item.content}</Text>

          {/* Image attachment */}
          {item.image && (
            <Image 
              source={{ uri: item.image }} 
              style={styles.postAttachmentImage} 
              resizeMode="cover" 
            />
          )}

          {/* Stats bar */}
          <View style={styles.engagementBar}>
            {/* Comment Button */}
            <TouchableOpacity 
              style={styles.engagementBtn} 
              activeOpacity={0.6}
              onPress={() => handleOpenComments(item)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#94A3B8" />
              <Text style={styles.engagementCountText}>{item.comments.length}</Text>
            </TouchableOpacity>

            {/* Repost Button */}
            <TouchableOpacity 
              style={styles.engagementBtn} 
              activeOpacity={0.6}
              onPress={() => handleRepost(item.id)}
            >
              <Ionicons 
                name="repeat-outline" 
                size={18} 
                color={item.is_reposted ? '#10B981' : '#94A3B8'} 
              />
              <Text style={[
                styles.engagementCountText, 
                item.is_reposted && { color: '#10B981' }
              ]}>
                {item.reposts}
              </Text>
            </TouchableOpacity>

            {/* Like Button */}
            <TouchableOpacity 
              style={styles.engagementBtn} 
              activeOpacity={0.6}
              onPress={() => handleLike(item.id)}
            >
              <Ionicons 
                name={item.is_liked ? "heart" : "heart-outline"} 
                size={18} 
                color={item.is_liked ? '#F91880' : '#94A3B8'} 
              />
              <Text style={[
                styles.engagementCountText, 
                item.is_liked && { color: '#F91880' }
              ]}>
                {item.likes}
              </Text>
            </TouchableOpacity>

            {/* Views Badge */}
            <View style={styles.engagementBtn}>
              <Ionicons name="bar-chart-outline" size={16} color="#94A3B8" />
              <Text style={styles.engagementCountText}>{item.views}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        
        {/* ── Screen Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>INFOCTESS Feed</Text>
          <Text style={styles.headerSub}>Official announcements from faculty</Text>
        </View>

        {/* ── Search Bar ────────────────────────────────────────── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search updates, tags, lecturers..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Quick Filter Tabs ─────────────────────────────────── */}
        <View style={styles.filterTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
            {['All', 'Exams', 'Assignments', 'Rescheduled'].map((filterName) => {
              const isActive = activeFilter === filterName;
              return (
                <TouchableOpacity
                  key={filterName}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter(filterName)}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {filterName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Posting restrictions tip ──────────────────────────── */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={15} color="#60A5FA" />
          <Text style={styles.tipText}>
            Posting is locked for students. You can read, like, and comment on notices.
          </Text>
        </View>

        {/* ── Feed List ─────────────────────────────────────────── */}
        <FlatList
          data={filteredPosts}
          keyExtractor={item => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.feedScrollContent}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No matching updates found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your keywords or selected category filters.</Text>
            </View>
          }
        />

        {/* ── Comments Modal ── */}
        {activePost && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <LinearGradient colors={['#0F172A', '#0B132B', '#020617']} style={{ flex: 1 }}>
              <SafeAreaView style={styles.modalSafe}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={{ flex: 1 }}
                >
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <TouchableOpacity 
                      style={styles.closeBtn} 
                      activeOpacity={0.7} 
                      onPress={() => setModalVisible(false)}
                    >
                      <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Thread</Text>
                    <View style={{ width: 44 }} />
                  </View>

                  {/* Scrollable details and replies list */}
                  <FlatList
                    ListHeaderComponent={
                      <View style={styles.modalOriginalPostWrapper}>
                        <View style={styles.modalProfileRow}>
                          <View style={[styles.avatarCircle, { backgroundColor: activePost.lecturer_avatar_color }]}>
                            <Text style={styles.avatarText}>{activePost.lecturer_initials}</Text>
                          </View>
                          <View style={styles.modalProfileText}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.modalLecturerName}>
                                {activePost.lecturer_title} {activePost.lecturer_name}
                              </Text>
                              <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={{ marginLeft: 4 }} />
                            </View>
                            <Text style={styles.modalLecturerHandle}>{activePost.lecturer_handle}</Text>
                          </View>
                        </View>

                        <Text style={styles.modalPostBody}>{activePost.content}</Text>
                        
                        {/* Image attachment in details modal */}
                        {activePost.image && (
                          <Image 
                            source={{ uri: activePost.image }} 
                            style={styles.modalAttachmentImage} 
                            resizeMode="cover" 
                          />
                        )}

                        <Text style={styles.modalTimestamp}>
                          Posted · {activePost.timestamp} ago · {activePost.views} Views
                        </Text>

                        <View style={styles.modalMetricDivider} />

                        <View style={styles.modalMetricsRow}>
                          <Text style={styles.modalMetricText}>
                            <Text style={styles.modalMetricBold}>{activePost.reposts}</Text> Reposts
                          </Text>
                          <Text style={[styles.modalMetricText, { marginLeft: 16 }]}>
                            <Text style={styles.modalMetricBold}>{activePost.likes}</Text> Likes
                          </Text>
                        </View>

                        <View style={styles.modalMetricDivider} />

                        {/* Quick interactions row in modal */}
                        <View style={styles.modalInteractionsRow}>
                          <TouchableOpacity 
                            style={styles.modalIntBtn}
                            onPress={() => handleRepost(activePost.id)}
                          >
                            <Ionicons 
                              name="repeat-outline" 
                              size={22} 
                              color={activePost.is_reposted ? '#10B981' : '#64748B'} 
                            />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.modalIntBtn}
                            onPress={() => handleLike(activePost.id)}
                          >
                            <Ionicons 
                              name={activePost.is_liked ? "heart" : "heart-outline"} 
                              size={22} 
                              color={activePost.is_liked ? '#F91880' : '#64748B'} 
                            />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalMetricDivider} />
                        
                        <Text style={styles.repliesSectionHeader}>Replies</Text>
                      </View>
                    }
                    data={activePost.comments}
                    keyExtractor={item => item.comment_id}
                    ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
                    contentContainerStyle={styles.repliesListContent}
                    renderItem={({ item }) => (
                      <View style={styles.commentCard}>
                        <View style={styles.commentAvatarCircle}>
                          <Text style={styles.commentAvatarText}>{item.author_initials}</Text>
                        </View>
                        <View style={styles.commentBodyWrapper}>
                          <View style={styles.commentHeaderRow}>
                            <Text style={styles.commentAuthorName}>{item.author_name}</Text>
                            {item.author_role === 'rep' && (
                              <View style={styles.commentRepBadge}>
                                <Text style={styles.commentRepBadgeText}>REP</Text>
                              </View>
                            )}
                            <Text style={styles.commentAuthorHandle}>{item.author_handle}</Text>
                            <Text style={styles.commentBullet}>·</Text>
                            <Text style={styles.commentTimeAgo}>{item.time_ago}</Text>
                          </View>
                          <Text style={styles.commentTextBody}>{item.text}</Text>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={
                      <View style={styles.emptyRepliesContainer}>
                        <Ionicons name="chatbubbles-outline" size={36} color="#CBD5E1" />
                        <Text style={styles.emptyRepliesTitle}>No replies yet</Text>
                        <Text style={styles.emptyRepliesSubtitle}>Be the first to reply to this faculty update.</Text>
                      </View>
                    }
                  />

                  {/* Bottom Comment Input bar */}
                  <View style={styles.replyInputSection}>
                    <TextInput
                      style={styles.replyTextInput}
                      placeholder={`Reply to ${activePost.lecturer_title} ${activePost.lecturer_name.split(' ')[1] || activePost.lecturer_name}...`}
                      placeholderTextColor="#94A3B8"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={250}
                    />
                    <TouchableOpacity 
                      style={[styles.replySubmitBtn, !commentText.trim() && styles.replySubmitBtnDisabled]}
                      disabled={!commentText.trim()}
                      activeOpacity={0.8}
                      onPress={handleSubmitComment}
                    >
                      <Text style={styles.replySubmitBtnText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </SafeAreaView>
            </LinearGradient>
          </Modal>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── X-Style Aesthetic Styles ─────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },

  // Search section
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    height: '100%',
  },

  // Filters
  filterTabsWrapper: {
    marginBottom: 6,
  },
  filterTabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    borderColor: 'rgba(96,165,250,0.25)',
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Restriction Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 8,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  tipText: {
    fontSize: 10.5,
    color: '#93C5FD',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },

  // Feed Item Card
  feedScrollContent: {
    paddingBottom: 24,
  },
  postCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  postContentColumn: {
    flex: 1,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  lecturerNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: '45%',
  },
  verifiedIcon: {
    marginLeft: 3,
    marginRight: 4,
  },
  handleText: {
    fontSize: 12,
    color: '#64748B',
    maxWidth: '30%',
  },
  bulletSeparator: {
    marginHorizontal: 4,
    color: '#94A3B8',
    fontSize: 12,
  },
  timeAgoText: {
    fontSize: 12,
    color: '#64748B',
  },
  postBodyText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginTop: 4,
    fontWeight: '400',
  },
  postAttachmentImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAttachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Engagement stats bar
  engagementBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingRight: 12,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  engagementCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Empty view
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  // Comments/Thread Modal
  modalSafe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOriginalPostWrapper: {
    padding: 16,
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalProfileText: {
    justifyContent: 'center',
  },
  modalLecturerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalLecturerHandle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  modalPostBody: {
    fontSize: 17,
    color: '#FFFFFF',
    lineHeight: 25,
    marginTop: 14,
    fontWeight: '400',
  },
  modalTimestamp: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '500',
  },
  modalMetricDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  modalMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalMetricText: {
    fontSize: 13,
    color: '#64748B',
  },
  modalMetricBold: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalInteractionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  modalIntBtn: {
    padding: 8,
    borderRadius: 99,
  },
  repliesSectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  repliesListContent: {
    paddingBottom: 24,
  },
  commentCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  commentAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 11,
  },
  commentBodyWrapper: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commentRepBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  commentRepBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '800',
  },
  commentAuthorHandle: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  commentBullet: {
    color: '#64748B',
    marginHorizontal: 4,
    fontSize: 12,
  },
  commentTimeAgo: {
    fontSize: 12,
    color: '#64748B',
  },
  commentTextBody: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    marginTop: 3,
  },

  // Modal empty replies
  emptyRepliesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRepliesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptyRepliesSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },

  // Reply Input Bar
  replyInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  replySubmitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
    alignSelf: 'flex-end',
  },
  replySubmitBtnDisabled: {
    opacity: 0.4,
  },
  replySubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});