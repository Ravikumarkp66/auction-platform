import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Search, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { Player, PlayerRole } from '../types/player';

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'All' | PlayerRole>('All');
  const router = useRouter();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/players');
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      // Fallback mock data
      setPlayers([
        { _id: '1', name: 'Virat Kohli', role: 'Batsman', basePrice: 20000000, status: 'available' },
        { _id: '2', name: 'Jasprit Bumrah', role: 'Bowler', basePrice: 20000000, status: 'available' },
        { _id: '3', name: 'Hardik Pandya', role: 'All-Rounder', basePrice: 15000000, status: 'available' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'All' || p.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roles: ('All' | PlayerRole)[] = ['All', 'Batsman', 'Bowler', 'All-Rounder', 'WK'];

  const renderItem = ({ item }: { item: Player }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerRole}>{item.role}</Text>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Base Price</Text>
        <Text style={styles.priceValue}>₹{(item.basePrice / 10000000).toFixed(1)} Cr</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Players</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          data={roles}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, selectedRole === item ? styles.activeFilterTab : null]}
              onPress={() => setSelectedRole(item)}
            >
              <Text style={[styles.filterTabText, selectedRole === item ? styles.activeFilterTabText : null]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={filteredPlayers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No players found</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    top: 28,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 44,
    borderRadius: 12,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    marginRight: 8,
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
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playerRole: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
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
