import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppContainer } from '../../src/components/AppContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Zap, Trophy, Users as UsersIcon, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const mockTeams = [
  { _id: '1', name: 'Mumbai Warriors', shortName: 'MW', remainingBudget: 450000000, totalBudget: 1000000000, playerCount: 15, maxPlayers: 25, icon: Shield },
  { _id: '2', name: 'Chennai Titans', shortName: 'CT', remainingBudget: 385000000, totalBudget: 1000000000, playerCount: 18, maxPlayers: 25, icon: Zap },
  { _id: '3', name: 'Delhi Super Kings', shortName: 'DSK', remainingBudget: 500000000, totalBudget: 1000000000, playerCount: 12, maxPlayers: 25, icon: Trophy },
  { _id: '4', name: 'Bangalore Royals', shortName: 'BR', remainingBudget: 420000000, totalBudget: 1000000000, playerCount: 14, maxPlayers: 25, icon: UsersIcon },
];

export default function Teams() {
  const [teams, setTeams] = useState(mockTeams);
  const [loading, setLoading] = useState(false);

  // In real app, fetch from API
  // useEffect(() => { ... }, []);

  const renderItem = ({ item }: { item: typeof mockTeams[0] }) => {
    const pursePercentage = (item.remainingBudget / item.totalBudget) * 100;
    const playerPercentage = (item.playerCount / item.maxPlayers) * 100;

    return (
      <TouchableOpacity style={styles.cardContainer}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={styles.teamInfo}>
              <View style={styles.iconContainer}>
                <item.icon size={20} color="#00D1FF" />
              </View>
              <View>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.shortName}>{item.shortName}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Purse Left</Text>
                <Text style={styles.statValue}>₹{(item.remainingBudget / 10000000).toFixed(1)} Cr</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pursePercentage}%`, backgroundColor: '#00D1FF' }]} />
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Players</Text>
                <Text style={styles.statValue}>{item.playerCount}/{item.maxPlayers}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${playerPercentage}%`, backgroundColor: '#7B61FF' }]} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <AppContainer style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tournament Teams</Text>
        <Text style={styles.headerSubtitle}>Manage and view all connected teams</Text>
      </View>

      <FlatList
        data={teams}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  list: {
    paddingBottom: 100, // Space for bottom tab
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shortName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statsRow: {
    marginTop: 20,
    gap: 16,
  },
  statItem: {
    width: '100%',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
