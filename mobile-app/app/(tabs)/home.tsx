import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  bg:         '#080C18',
  surface:    '#0D1226',
  card:       '#111827',
  cardBorder: '#1E2A45',
  primary:    '#3B82F6',
  primaryGlow:'#1D4ED8',
  accent:     '#06B6D4',
  accentGlow: '#0891B2',
  gold:       '#F59E0B',
  live:       '#EF4444',
  liveGlow:   '#DC2626',
  text:       '#F1F5F9',
  textMuted:  '#64748B',
  textSub:    '#94A3B8',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────

/** Animated pulsing dot for LIVE badge */
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute',
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: COLORS.live,
        transform: [{ scale }], opacity,
      }} />
      <View style={{
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: COLORS.live,
      }} />
    </View>
  );
}

/** Stat pill used inside the hero card */
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Quick-action grid icon button */
function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: '48%' }}
    >
      <Animated.View style={[styles.quickCard, { transform: [{ scale }] }]}>
        {/* Glow ring behind icon */}
        <View style={[styles.quickIconWrap, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.quickIcon, { color }]}>{icon}</Text>
        </View>
        <Text style={styles.quickLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Horizontal auction card */
function AuctionCard({ title, status, teams, date, onPress }: { title: string; status: string; teams: number; date: string; onPress: () => void }) {
  const isLive = status === 'LIVE';
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.auctionCard} onPress={onPress}>
      <LinearGradient
        colors={isLive ? ['#1E1035', '#0D1226'] : ['#111827', '#0D1226']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.auctionCardInner}
      >
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: isLive ? COLORS.live + '22' : COLORS.textMuted + '22', borderColor: isLive ? COLORS.live : COLORS.textMuted }]}>
          {isLive && <PulseDot />}
          <Text style={[styles.statusText, { color: isLive ? COLORS.live : COLORS.textMuted, marginLeft: isLive ? 5 : 0 }]}>
            {status}
          </Text>
        </View>
        <Text style={styles.auctionTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.auctionMeta}>
          <Text style={styles.auctionMetaText}>👥 {teams} teams</Text>
          <Text style={styles.auctionMetaText}>📅 {date}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

import { api } from '../../lib/api';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Fade-in on mount
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Real active tournament states
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();

    // Fetch active tournament and tournament list from backend
    const loadHomeData = async () => {
      try {
        const activeData = await api.get('/api/tournaments/status/active');
        if (activeData && activeData.tournament) {
          setActiveTournament(activeData.tournament);
          setActiveTeams(activeData.teams || []);
          setActivePlayers(activeData.players || []);
        }

        const listData = await api.get('/api/tournaments');
        if (Array.isArray(listData)) {
          setAllTournaments(listData);
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    };
    loadHomeData();
  }, []);

  // Header blur on scroll
  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(8,12,24,0)', 'rgba(8,12,24,0.98)'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Sticky header ── */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <View>
          <Text style={styles.headerLogo}>ARENA</Text>
          <Text style={styles.headerSub}>CRICKET AUCTION</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Scrollable body ── */}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero Card ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity 
            activeOpacity={0.92} 
            style={styles.heroWrapper} 
            onPress={() => activeTournament ? router.push(`/auction/${activeTournament._id}`) : router.push('/(tabs)/auctions')}
          >
            <LinearGradient
              colors={['#1A1040', '#0D1226', '#080C18']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Top row: labels */}
              <View style={styles.heroTopRow}>
                <Text style={styles.heroCornerLabel}>ACTIVE ARENA</Text>
                {activeTournament ? (
                  <View style={styles.liveBadge}>
                    <PulseDot />
                    <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                  </View>
                ) : (
                  <View style={[styles.liveBadge, { backgroundColor: '#374151' }]}>
                    <Text style={[styles.liveBadgeText, { color: '#9CA3AF' }]}>OFFLINE</Text>
                  </View>
                )}
                <Text style={styles.heroCornerLabel}>OCTAVE / WATCHERS</Text>
              </View>

              {/* Main content */}
              <Text style={styles.heroTitle}>{activeTournament ? activeTournament.name : 'No Active Auction'}</Text>

              <View style={styles.heroPlayerRow}>
                <Text style={styles.heroPlayerLabel}>{activeTournament ? 'ORGANIZER' : 'SYSTEM STATUS'}</Text>
                <Text style={styles.heroPlayerName}>
                  {activeTournament ? (activeTournament.organizerName || 'Organized') : 'Waiting for Auction'}
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatPill label="TEAMS"      value={String(activeTournament ? activeTeams.length : 0)}      />
                <View style={styles.statDivider} />
                <StatPill label="PLAYERS"    value={String(activeTournament ? activePlayers.filter(p => !p.isIcon).length : 0)}    />
                <View style={styles.statDivider} />
                <StatPill label="BASE BUDGET" value={activeTournament ? `₹${activeTournament.baseBudget} Cr` : 'N/A'} />
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={() => activeTournament ? router.push(`/auction/${activeTournament._id}`) : router.push('/(tabs)/auctions')}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={[COLORS.accent, COLORS.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.enterBtn}
                >
                  <Text style={styles.enterBtnIcon}>▶</Text>
                  <Text style={styles.enterBtnText}>{activeTournament ? 'Enter Arena' : 'View Auctions'}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Decorative glow orbs */}
              <View style={[styles.glowOrb, { top: -40, right: -40, backgroundColor: COLORS.primary + '30', width: 160, height: 160 }]} />
              <View style={[styles.glowOrb, { bottom: 10, left: -20, backgroundColor: COLORS.accent + '20', width: 100, height: 100 }]} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Quick Actions grid ── */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.gridWrap}>
            <QuickAction
              icon="🏆"  label="Auctions"
              color={COLORS.gold}
              onPress={() => router.push('/(tabs)/auctions')}
            />
            <QuickAction
              icon="👤"  label="Players"
              color={COLORS.accent}
              onPress={() => router.push('/players')}
            />
            <QuickAction
              icon="🏏"  label="Teams"
              color={COLORS.primary}
              onPress={() => router.push('/(tabs)/teams')}
            />
            <QuickAction
              icon="📅"  label="Fixtures"
              color="#A78BFA"
              onPress={() => {}}
            />
          </View>
        </Animated.View>

        {/* ── Active Auctions ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Auctions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/auctions')}>
            <Text style={styles.sectionViewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {allTournaments.slice(0, 5).map(t => {
            const isLive = t.status === 'active';
            const isCompleted = t.status === 'completed';
            const statusText = isLive ? 'LIVE' : isCompleted ? 'COMPLETED' : 'UPCOMING';
            
            return (
              <AuctionCard 
                key={t._id} 
                title={t.name}
                status={statusText}
                teams={t.numTeams || 0}
                date={new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                onPress={() => router.push(`/auction/${t._id}`)} 
              />
            );
          })}
        </ScrollView>

        {/* ── Services section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Services</Text>
        </View>

        <View style={styles.servicesRow}>
          {/* Service card 1 */}
          <TouchableOpacity activeOpacity={0.85} style={styles.serviceCard}>
            <LinearGradient
              colors={['#1E2A45', '#0D1226']}
              style={styles.serviceCardInner}
            >
              <Text style={styles.serviceIcon}>⚖️</Text>
              <Text style={styles.serviceTitle}>Auction{'\n'}Management</Text>
              <Text style={styles.servicePrice}>₹5,000<Text style={styles.servicePriceSub}>/day</Text></Text>
              <View style={styles.serviceBtn}>
                <Text style={styles.serviceBtnText}>Book Now</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Service card 2 */}
          <TouchableOpacity activeOpacity={0.85} style={styles.serviceCard}>
            <LinearGradient
              colors={['#1E2A45', '#0D1226']}
              style={styles.serviceCardInner}
            >
              <Text style={styles.serviceIcon}>🎙️</Text>
              <Text style={styles.serviceTitle}>Live{'\n'}Commentary</Text>
              <Text style={styles.servicePrice}>₹2,000<Text style={styles.servicePriceSub}>/match</Text></Text>
              <View style={styles.serviceBtn}>
                <Text style={styles.serviceBtnText}>Book Now</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 90, paddingBottom: 20 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerLogo: { fontSize: 22, fontWeight: '900', letterSpacing: 4, color: COLORS.text },
  headerSub:  { fontSize: 9, letterSpacing: 3, color: COLORS.textMuted, marginTop: 1 },
  bellBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  bellIcon: { fontSize: 18 },
  bellDot:  { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.live, borderWidth: 1.5, borderColor: COLORS.bg },

  // Hero
  heroWrapper: { marginHorizontal: 16, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  heroCard: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroCornerLabel: { fontSize: 8, letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.live + '22', borderWidth: 1, borderColor: COLORS.live, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.live },
  heroTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5, lineHeight: 34, marginBottom: 12 },
  heroPlayerRow: { marginBottom: 16 },
  heroPlayerLabel: { fontSize: 9, letterSpacing: 2, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  heroPlayerName:  { fontSize: 20, fontWeight: '700', color: COLORS.accent },

  // Stats
  statsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.cardBorder, marginHorizontal: 12 },
  statPill:    { alignItems: 'flex-start' },
  statValue:   { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel:   { fontSize: 9, letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 1 },

  // Enter button
  enterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  enterBtnIcon: { fontSize: 14, color: '#fff' },
  enterBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  // Glow orbs
  glowOrb: { position: 'absolute', borderRadius: 999 },

  // Quick actions grid
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12, marginBottom: 28 },
  quickCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 18, padding: 18, alignItems: 'center', gap: 10, flex: 1 },
  quickIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quickIcon:  { fontSize: 24 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, letterSpacing: 0.3 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  sectionViewAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Horizontal auction cards
  horizontalScroll: { paddingLeft: 16, paddingRight: 8, gap: 12, marginBottom: 28 },
  auctionCard:      { width: width * 0.68, borderRadius: 16, overflow: 'hidden', marginRight: 4 },
  auctionCardInner: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  statusText:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  auctionTitle:     { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  auctionMeta:      { flexDirection: 'row', gap: 14 },
  auctionMetaText:  { fontSize: 12, color: COLORS.textSub },

  // Services
  servicesRow:      { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  serviceCard:      { flex: 1, borderRadius: 18, overflow: 'hidden' },
  serviceCardInner: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'flex-start', gap: 10 },
  serviceIcon:      { fontSize: 28 },
  serviceTitle:     { fontSize: 14, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  servicePrice:     { fontSize: 18, fontWeight: '900', color: COLORS.gold },
  servicePriceSub:  { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  serviceBtn:       { backgroundColor: COLORS.primary + '22', borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  serviceBtnText:   { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});
