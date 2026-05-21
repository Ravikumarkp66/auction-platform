import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppContainer } from '../../src/components/AppContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Shield, Play, Settings, Plus, UserPlus, RefreshCw, Trash2, ChevronRight, Bell, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { storage, USER_ROLE_KEY } from '../../lib/storage';
import { api } from '../../lib/api';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real backend states
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const tournamentsData = await api.get('/api/tournaments');
      if (Array.isArray(tournamentsData)) {
        setAllTournaments(tournamentsData);
      }

      const activeData = await api.get('/api/tournaments/status/active');
      if (activeData && activeData.tournament) {
        setActiveTournament(activeData.tournament);
        setActiveTeams(activeData.teams || []);
        setActivePlayers(activeData.players || []);
      } else {
        setActiveTournament(null);
        setActiveTeams([]);
        setActivePlayers([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    storage.getItem(USER_ROLE_KEY).then(async (r) => {
      setRole(r);
      if (r === 'admin') {
        await fetchDashboardData();
      }
      setLoading(false);
    });
  }, []);

  // Compute actual stats from backend
  const stats = [
    { id: 1, label: 'Tournaments', value: String(allTournaments.length), icon: Trophy, color: '#00D1FF' },
    { id: 2, label: 'Teams', value: String(activeTournament ? activeTeams.length : 0), icon: Shield, color: '#7B61FF' },
    { id: 3, label: 'Players', value: String(activeTournament ? activePlayers.filter((p: any) => !p.isIcon).length : 0), icon: Users, color: '#FF4D6D' },
    { id: 4, label: 'Live Now', value: String(allTournaments.filter((t: any) => t.status === 'active').length), icon: Play, color: '#10B981' },
  ];

  // Mock data for activity
  const activities = [
    { id: '1', text: 'Virat Kohli sold to Warriors for ₹15.0 Cr', time: '2m ago' },
    { id: '2', text: 'New tournament "Corporate Cup" created', time: '1h ago' },
    { id: '3', text: 'Bidder "John Doe" authorized for Titans', time: '2h ago' },
  ];

  const handleGoLive = async (id: string) => {
    try {
      setRefreshing(true);
      await api.post(`/api/tournaments/${id}/go-live`, {});
      Alert.alert('Success', 'Tournament is now LIVE!');
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to start tournament');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetAuction = () => {
    if (!activeTournament) {
      Alert.alert('Info', 'No active tournament to reset');
      return;
    }
    Alert.alert(
      'Reset Auction',
      `Are you sure you want to reset the current auction for "${activeTournament.name}"? This will clear all bids and reset the timer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          try {
            setRefreshing(true);
            await api.post(`/api/tournaments/${activeTournament._id}/reset`, {});
            Alert.alert('Success', 'Auction reset successfully');
            await fetchDashboardData();
          } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to reset auction');
          } finally {
            setRefreshing(false);
          }
        }},
      ]
    );
  };

  const handleResetAllData = () => {
    if (!activeTournament) {
      Alert.alert('Info', 'No active tournament to delete');
      return;
    }
    Alert.alert(
      '🚨 CRITICAL ACTION 🚨',
      `This will permanently delete the active tournament "${activeTournament.name}". This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'DELETE', style: 'destructive', onPress: () => {
          Alert.alert('Confirm Deletion', 'Are you absolutely sure you want to delete this tournament?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Delete', style: 'destructive', onPress: async () => {
              try {
                setRefreshing(true);
                // Directly call the endpoint using a raw fetch to include password body
                const token = await storage.getItem('auth_token');
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050'}/api/tournaments/${activeTournament._id}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ password: 'admin' }) // Using default admin password config
                });
                const result = await response.json();
                if (response.ok) {
                  Alert.alert('Deleted', 'Tournament deleted successfully');
                  await fetchDashboardData();
                } else {
                  Alert.alert('Error', result.message || 'Failed to delete tournament');
                }
              } catch (err) {
                console.error(err);
                Alert.alert('Error', 'Could not communicate with server');
              } finally {
                setRefreshing(false);
              }
            }}
          ]);
        }},
      ]
    );
  };

  if (loading) {
    return (
      <AppContainer style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00D1FF" />
      </AppContainer>
    );
  }

  if (role !== 'admin') {
    return (
      <AppContainer style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Lock size={64} color="#FF4D6D" style={{ marginBottom: 24 }} />
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 12 }}>Access Denied</Text>
        <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 32 }}>
          This area is restricted to Tournament Admins only. Your current role is '{role}'.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: 'rgba(0, 209, 255, 0.1)', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 209, 255, 0.2)' }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#00D1FF', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </AppContainer>
    );
  }

  return (
    <AppContainer style={styles.container}>
      <StatusBar style="light" />
      
      {/* Live Banner */}
      {activeTournament ? (
        <TouchableOpacity style={styles.liveBanner} onPress={() => router.push(`/auction/${activeTournament._id}`)}>
          <LinearGradient
            colors={['#FF4D6D', '#EF4444']}
            style={styles.liveBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.liveBannerContent}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveBannerText}>{activeTournament.name} is LIVE — Tap to control</Text>
            </View>
            <ChevronRight size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage tournaments and live auctions</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color="#FFFFFF" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          {stats.map(stat => (
            <View key={stat.id} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                <stat.icon size={18} color={stat.color} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => {}}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(0, 209, 255, 0.1)' }]}>
              <Plus size={20} color="#00D1FF" />
            </View>
            <Text style={styles.actionLabel}>New Tournament</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/players')}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(123, 97, 255, 0.1)' }]}>
              <UserPlus size={20} color="#7B61FF" />
            </View>
            <Text style={styles.actionLabel}>Add Players</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/teams')}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255, 77, 109, 0.1)' }]}>
              <Users size={20} color="#FF4D6D" />
            </View>
            <Text style={styles.actionLabel}>Add Teams</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleResetAuction}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255, 200, 87, 0.1)' }]}>
              <RefreshCw size={20} color="#FFC857" />
            </View>
            <Text style={styles.actionLabel}>Reset Auction</Text>
          </TouchableOpacity>
        </View>

        {/* Tournaments List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage Tournaments</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/auctions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {allTournaments.slice(0, 3).map(tournament => {
          const isLive = tournament.status === 'active';
          const isCompleted = tournament.status === 'completed';
          const statusText = isLive ? 'LIVE' : isCompleted ? 'COMPLETED' : 'UPCOMING';
          const statusColor = isLive ? '#EF4444' : isCompleted ? '#9CA3AF' : '#FFC857';

          return (
            <View key={tournament._id} style={styles.tournamentCard}>
              <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <View style={styles.tournamentMeta}>
                  <Text style={styles.tournamentMetaText}>
                    {tournament.numTeams || 0} Teams · {tournament.playerCount || 0} Players
                  </Text>
                  <Text style={styles.tournamentMetaText}>{tournament.organizerName || 'Organized'}</Text>
                </View>
              </View>
              <View style={styles.tournamentActions}>
                {isLive ? (
                  <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/auction/${tournament._id}`)}>
                    <Text style={styles.startBtnText}>MANAGE</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.startBtn, { backgroundColor: 'rgba(0, 209, 255, 0.1)', borderColor: 'rgba(0, 209, 255, 0.2)' }]} 
                    onPress={() => handleGoLive(tournament._id)}
                  >
                    <Text style={[styles.startBtnText, { color: '#00D1FF' }]}>START</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityContainer}>
          {activities.map(activity => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityTextContainer}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetAllData}>
          <Trash2 size={16} color="#FF4D6D" />
          <Text style={styles.dangerButtonText}>Reset All Auction Data</Text>
        </TouchableOpacity>

        {/* Padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  liveBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  liveBannerGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  liveBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D6D',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    color: '#00D1FF',
    fontWeight: '600',
  },
  tournamentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusStrip: {
    width: 4,
    height: '100%',
  },
  tournamentInfo: {
    flex: 1,
    padding: 16,
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tournamentMeta: {
    marginTop: 4,
    gap: 2,
  },
  tournamentMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  tournamentActions: {
    padding: 16,
  },
  startBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  startBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  activityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D1FF',
  },
  activityTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.2)',
    marginBottom: 20,
  },
  dangerButtonText: {
    color: '#FF4D6D',
    fontSize: 12,
    fontWeight: '700',
  },
});
