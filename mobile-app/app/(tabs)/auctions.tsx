import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Tournament } from '../../types/tournament';

export default function Auctions() {
  const [auctions, setAuctions] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Live' | 'Upcoming' | 'Completed'>('All');
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
    if (filter === 'All') return true;
    return a.status.toLowerCase() === filter.toLowerCase();
  });

  const renderItem = ({ item }: { item: Tournament }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[
          styles.statusTag,
          item.status === 'live' ? styles.liveTag : 
          item.status === 'upcoming' ? styles.upcomingTag : styles.completedTag
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.cardDetails}>{item.teamCount || 0} Teams • {item.playerCount || 0} Players</Text>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push(`/auction/${item._id}`)}
      >
        <Text style={styles.actionButtonText}>
          {item.status === 'live' ? 'Join Now' : 'View Details'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const filters: ('All' | 'Live' | 'Upcoming' | 'Completed')[] = ['All', 'Live', 'Upcoming', 'Completed'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f ? styles.activeFilterTab : null]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f ? styles.activeFilterTabText : null]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={filteredAuctions}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No auctions found</Text>
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
    backgroundColor: '#0B0E14',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1F2937',
  },
  activeFilterTab: {
    backgroundColor: '#8B5CF6',
  },
  filterTabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
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
  liveTag: {
    backgroundColor: '#EF4444',
  },
  upcomingTag: {
    backgroundColor: '#3B82F6',
  },
  completedTag: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cardDetails: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
