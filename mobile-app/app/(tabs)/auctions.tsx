import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Tournament } from '../../types/tournament';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';

export default function Auctions() {
  const [auctions, setAuctions] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'Live' | 'Upcoming' | 'Completed'>('Live');
  const router = useRouter();

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/tournaments');
      setAuctions(data);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      // Fallback mock data if API fails
      setAuctions([
        { _id: '1', name: 'Mega Auction 2026', status: 'live', teamCount: 10, playerCount: 200 },
        { _id: '2', name: 'Mini Auction 2025', status: 'completed', teamCount: 8, playerCount: 50 },
        { _id: '3', name: 'Challengers Cup', status: 'upcoming', teamCount: 6, playerCount: 100 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter(a => {
    return a.status.toLowerCase() === filter.toLowerCase();
  });

  const renderLiveCard = (item: Tournament) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/auction/${item._id}`)}
      style={styles.liveMirrorCard}
    >
      <LinearGradient
        colors={['#1A1040', '#0D1226']}
        style={styles.liveMirrorGradient}
      >
        <View style={styles.liveHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveBadgeText}>LIVE NOW</Text>
          </View>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>

        <View style={styles.mirrorContent}>
          <Text style={styles.mirrorLabel}>CURRENT PLAYER</Text>
          <Text style={styles.mirrorPlayer}>Virat Kohli</Text>
          
          <View style={styles.mirrorBidRow}>
            <View>
              <Text style={styles.mirrorLabel}>HIGHEST BID</Text>
              <Text style={styles.mirrorBid}>₹15.0 Cr</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.mirrorLabel}>LEADING TEAM</Text>
              <Text style={styles.mirrorTeam}>Warriors</Text>
            </View>
          </View>
        </View>

        <View style={styles.watchLiveBtn}>
          <Play size={16} color="#FFFFFF" />
          <Text style={styles.watchLiveText}>ENTER LIVE ROOM</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStandardCard = (item: Tournament) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => router.push(`/auction/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[
          styles.statusTag,
          item.status === 'upcoming' ? styles.upcomingTag : styles.completedTag
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.cardDetails}>{item.teamCount || 0} Teams • {item.playerCount || 0} Players</Text>
      <View style={styles.actionButton}>
        <Text style={styles.actionButtonText}>View Details & Rosters</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Tournament }) => {
    if (item.status === 'live') {
      return renderLiveCard(item);
    }
    return renderStandardCard(item);
  };

  const filters: ('Live' | 'Upcoming' | 'Completed')[] = ['Live', 'Upcoming', 'Completed'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Top Tabs */}
      <View style={styles.topTabs}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.topTab, filter === f ? styles.activeTopTab : null]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.topTabText, filter === f ? styles.activeTopTabText : null]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00D1FF" />
        </View>
      ) : (
        <FlatList
          data={filteredAuctions}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No {filter.toLowerCase()} auctions found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  topTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTopTab: {
    borderBottomColor: '#00D1FF',
  },
  topTabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTopTabText: {
    color: '#00D1FF',
  },
  list: {
    padding: 16,
    paddingBottom: 100, // Space for bottom tab
    gap: 16,
  },
  liveMirrorCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF4D6D',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  liveMirrorGradient: {
    padding: 20,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mirrorContent: {
    marginBottom: 20,
  },
  mirrorLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mirrorPlayer: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  mirrorBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mirrorBid: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00D1FF',
  },
  mirrorTeam: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFC857',
  },
  watchLiveBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF4D6D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  watchLiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingTag: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
  },
  completedTag: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardDetails: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});
