import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator, TextInput, Image, FlatList, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppContainer } from '../../src/components/AppContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Shield, Play, Settings, Plus, UserPlus, RefreshCw, Trash2, ChevronRight, Lock, ChevronDown, CheckCircle, LayoutDashboard, Flag, User, Zap, Eye, Send, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { storage, USER_ROLE_KEY } from '../../lib/storage';
import { api } from '../../lib/api';

const { width } = Dimensions.get('window');

const THEME_COLORS = ['#A855F7', '#F59E0B', '#3B82F6', '#10B981', '#EF4444'];

export default function AdminDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState('Branding');
  const [selectedThemeColor, setSelectedThemeColor] = useState(THEME_COLORS[0]);
  const [playerFilter, setPlayerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [newPlayer, setNewPlayer] = useState({ name: '', role: 'All-Rounder', basePrice: '100', mobile: '', village: '' });
  const [manageForm, setManageForm] = useState({ role: '', village: '', basePrice: '0', soldPrice: '0', status: 'available' });

  // Branding State
  const [platformName, setPlatformName] = useState('Lakshmish Cricket Events');
  const [tagline, setTagline] = useState('Professional Auctioneer & Commentator');
  const [contactNumber, setContactNumber] = useState('+91 81470 89330');
  const [instagram, setInstagram] = useState('@lakshmish_virat');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Real backend states
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [kabaddiMatches, setKabaddiMatches] = useState<any[]>([]);

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

      const sportsData = await api.get('/api/sports-match');
      if (Array.isArray(sportsData)) {
        setKabaddiMatches(sportsData.filter((m: any) => m.sport === 'kabaddi'));
      }

      const settingsData = await api.get('/api/settings');
      if (settingsData && !settingsData.success) {
         // success false means error usually, but let's just check keys
         if (settingsData.platformName) setPlatformName(settingsData.platformName);
         if (settingsData.tagline) setTagline(settingsData.tagline);
         if (settingsData.contactNumber) setContactNumber(settingsData.contactNumber);
         if (settingsData.instagram) setInstagram(settingsData.instagram);
         if (settingsData.themeColor) setSelectedThemeColor(settingsData.themeColor);
      } else if (settingsData) {
         if (settingsData.platformName) setPlatformName(settingsData.platformName);
         if (settingsData.tagline) setTagline(settingsData.tagline);
         if (settingsData.contactNumber) setContactNumber(settingsData.contactNumber);
         if (settingsData.instagram) setInstagram(settingsData.instagram);
         if (settingsData.themeColor) setSelectedThemeColor(settingsData.themeColor);
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

  const stats = [
    { id: 1, label: 'Tournaments', value: String(allTournaments.length), icon: Trophy, color: '#00D1FF' },
    { id: 2, label: 'Teams', value: String(activeTournament ? activeTeams.length : 0), icon: Shield, color: '#7B61FF' },
    { id: 3, label: 'Players', value: String(activeTournament ? activePlayers.filter((p: any) => !p.isIcon).length : 0), icon: Users, color: '#FF4D6D' },
    { id: 4, label: 'Live Now', value: String(allTournaments.filter((t: any) => t.status === 'active').length), icon: Play, color: '#10B981' },
  ];

  const handleDeletePlayer = async (id: string) => {
    Alert.alert('Delete Player', 'Are you sure you want to delete this player?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/players/${id}`);
          Alert.alert('Success', 'Player deleted');
          fetchDashboardData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.name || !newPlayer.mobile) return Alert.alert('Error', 'Name and mobile are required');
    try {
      await api.post('/api/players', {
        ...newPlayer,
        basePrice: Number(newPlayer.basePrice) || 100,
        tournamentId: activeTournament?._id,
        status: 'available'
      });
      setIsAddModalOpen(false);
      setNewPlayer({ name: '', role: 'All-Rounder', basePrice: '100', mobile: '', village: '' });
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', 'Failed to add player');
    }
  };

  const handleUpdatePlayer = async () => {
    try {
      await api.patch(`/api/players/${editingPlayer._id}`, {
        ...manageForm,
        basePrice: Number(manageForm.basePrice),
        soldPrice: Number(manageForm.soldPrice)
      });
      setIsManageModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update player');
    }
  };

  const handleGoLive = async (id?: string) => {
    const targetId = id || activeTournament?._id;
    if (!targetId) return Alert.alert('Error', 'No tournament selected to go live');
    
    try {
      setRefreshing(true);
      await api.post(`/api/tournaments/${targetId}/go-live`, {});
      Alert.alert('Success', 'Tournament is now LIVE!');
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to start tournament');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await api.post('/api/settings', { key: 'platformName', value: platformName });
      await api.post('/api/settings', { key: 'tagline', value: tagline });
      await api.post('/api/settings', { key: 'contactNumber', value: contactNumber });
      await api.post('/api/settings', { key: 'instagram', value: instagram });
      await api.post('/api/settings', { key: 'themeColor', value: selectedThemeColor });
      Alert.alert('Success', 'Branding settings updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
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
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>This area is restricted to Tournament Admins only. Your current role is '{role}'.</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </AppContainer>
    );
  }

  const renderDashboardTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
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
      
      <Text style={styles.sectionTitle}>Manage Tournaments</Text>
      {allTournaments.slice(0, 3).map(tournament => {
        const isLive = tournament.status === 'active';
        return (
          <View key={tournament._id} style={styles.tournamentCard}>
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={styles.tournamentMetaText}>
                {tournament.numTeams || 0} Teams · {tournament.playerCount || 0} Players
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.manageBtn, isLive ? styles.manageBtnLive : null]} 
              onPress={() => isLive ? router.push(`/auction/${tournament._id}`) : handleGoLive(tournament._id)}
            >
              <Text style={[styles.manageBtnText, isLive ? {color: '#EF4444'} : null]}>
                {isLive ? 'MANAGE' : 'GO LIVE'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderAuctionsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Auctions</Text>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/create-tournament')}>
          <Text style={styles.quickActionBtnText}>+ CREATE</Text>
        </TouchableOpacity>
      </View>
      {allTournaments.map(tournament => {
        const isLive = tournament.status === 'active';
        return (
          <View key={tournament._id} style={styles.tournamentCard}>
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={styles.tournamentMetaText}>
                {tournament.numTeams || 0} Teams · {tournament.playerCount || 0} Players
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.manageBtn, isLive ? styles.manageBtnLive : null]} 
              onPress={() => isLive ? router.push(`/auction/${tournament._id}`) : handleGoLive(tournament._id)}
            >
              <Text style={[styles.manageBtnText, isLive ? {color: '#EF4444'} : null]}>
                {isLive ? 'MANAGE' : 'GO LIVE'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderKabaddiTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kabaddi Matches</Text>
        <TouchableOpacity style={styles.quickActionBtn}>
          <Text style={styles.quickActionBtnText}>+ NEW MATCH</Text>
        </TouchableOpacity>
      </View>
      {kabaddiMatches.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No Kabaddi matches found.</Text>
        </View>
      ) : (
        kabaddiMatches.map(match => (
          <View key={match._id} style={styles.tournamentCard}>
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{match.name}</Text>
              <Text style={styles.tournamentMetaText}>
                {match.teamA?.name || 'Team A'} vs {match.teamB?.name || 'Team B'}
              </Text>
              <Text style={[styles.tournamentMetaText, { color: match.status === 'live' ? '#EF4444' : '#F59E0B' }]}>
                {match.status ? match.status.toUpperCase() : 'SCHEDULED'}
              </Text>
            </View>
            <TouchableOpacity style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>MANAGE</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderPlayersTab = () => {
    const filters = ['ALL', 'PENDING', 'AVAILABLE', 'SOLD', 'UNSOLD'];
    const filteredPlayers = activePlayers.filter((p: any) => {
      const status = p.status ? p.status.toLowerCase() : 'available';
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(p.applicationId || '').includes(searchQuery);
      if (!matchesSearch) return false;
      
      if (playerFilter === 'ALL') return true;
      if (playerFilter === 'SOLD') return status === 'sold';
      if (playerFilter === 'UNSOLD') return status === 'unsold';
      if (playerFilter === 'AVAILABLE') return status === 'available';
      if (playerFilter === 'PENDING') return status === 'pending';
      return true;
    });

    const renderPlayerRow = ({ item: player, index }: { item: any, index: number }) => {
      const imageUrl = getImageUrl(player.photo?.drive || player.imageUrl || player.photo?.s3);
      const isSold = player.status === 'sold';
      return (
        <View style={styles.tableRow}>
          <View style={[styles.tdCell, { width: 60 }]}>
            <View style={styles.indexCircle}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
          </View>
          <View style={[styles.tdCell, { width: 180, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.rowAvatar} />
            ) : (
              <View style={[styles.rowAvatar, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                <User size={16} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.playerNameRow} numberOfLines={1}>{player.name}</Text>
          </View>
          <View style={[styles.tdCell, { width: 100 }]}>
            <Text style={styles.tdTextSub}>{player.role || player.iconRole || 'ALL-ROUNDER'}</Text>
          </View>
          <View style={[styles.tdCell, { width: 140 }]}>
            <Text style={styles.tdTextSub} numberOfLines={1}>{player.village || 'N/A'}</Text>
          </View>
          <View style={[styles.tdCell, { width: 80 }]}>
            <View style={[styles.statusPill, isSold ? styles.statusPillSold : styles.statusPillAvailable]}>
              <Text style={[styles.statusPillText, isSold ? styles.statusPillTextSold : styles.statusPillTextAvailable]}>
                {isSold ? 'SOLD' : 'AVAILABLE'}
              </Text>
            </View>
          </View>
          <View style={[styles.tdCell, { width: 80 }]}>
            <Text style={styles.priceText}>₹{player.soldPrice || player.basePrice || 0}</Text>
          </View>
          <View style={[styles.tdCell, { width: 140 }]}>
            <Text style={styles.tdTextSub} numberOfLines={1}>{player.soldTo || '---'}</Text>
          </View>
          <View style={[styles.tdCell, { width: 60 }]}>
            <Text style={styles.tdTextSub}>—</Text>
          </View>
          <View style={[styles.tdCell, { width: 140, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => router.push(`/live-auction?id=${activeTournament?._id}&player=${player.applicationId}`)}>
              <Zap size={14} color="#A855F7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => { setSelectedPlayer(player); setIsViewModalOpen(true); }}>
              <Eye size={14} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => {
              setEditingPlayer(player);
              setManageForm({
                role: player.role || 'All-Rounder',
                village: player.village || '',
                basePrice: String(player.basePrice || 0),
                soldPrice: String(player.soldPrice || 0),
                status: player.status || 'available'
              });
              setIsManageModalOpen(true);
            }}>
              <Send size={14} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDeletePlayer(player._id)}>
              <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    return (
      <View style={[styles.tabContent, { flex: 1 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Player Bidding List</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{activePlayers.length} Total</Text>
        </View>

        {/* Search & Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <View style={styles.searchBar}>
            <Search size={16} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search by name or ID..." 
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setIsAddModalOpen(true)}>
            <Text style={styles.quickActionBtnText}>+ ADD PLAYER</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {filters.map(f => (
              <TouchableOpacity 
                key={f} 
                style={[styles.filterPill, playerFilter === f && styles.filterPillActive]}
                onPress={() => setPlayerFilter(f)}
              >
                <Text style={[styles.filterPillText, playerFilter === f && styles.filterPillTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filteredPlayers.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No players match this filter.</Text>
          </View>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: 900 }}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { width: 60 }]}>SL NO</Text>
              <Text style={[styles.thText, { width: 180 }]}>PLAYER</Text>
              <Text style={[styles.thText, { width: 100 }]}>ROLE</Text>
              <Text style={[styles.thText, { width: 140 }]}>VILLAGE</Text>
              <Text style={[styles.thText, { width: 80 }]}>STATUS</Text>
              <Text style={[styles.thText, { width: 80 }]}>PRICE</Text>
              <Text style={[styles.thText, { width: 140 }]}>TEAM</Text>
              <Text style={[styles.thText, { width: 60 }]}>SLOT</Text>
              <Text style={[styles.thText, { width: 140, textAlign: 'center' }]}>ACTIONS</Text>
            </View>
            
            {/* Table Rows */}
            <FlatList
              data={filteredPlayers}
              keyExtractor={(item) => item._id}
              renderItem={renderPlayerRow}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
  };

  const renderBrandingTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Logo Display */}
      <View style={styles.brandingHeader}>
        <View style={styles.brandingLogoCircle}>
          <Text style={styles.brandingLogoIcon}>🏏</Text>
        </View>
        <Text style={styles.brandingTitle}>{platformName}</Text>
        <Text style={styles.brandingSubtitle}>{tagline}</Text>
      </View>

      {/* Form Fields */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>PLATFORM NAME</Text>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.input} 
            value={platformName}
            onChangeText={setPlatformName}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>TAGLINE</Text>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.input} 
            value={tagline}
            onChangeText={setTagline}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>CONTACT NUMBER</Text>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.input} 
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>INSTAGRAM</Text>
        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.input} 
            value={instagram}
            onChangeText={setInstagram}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>THEME COLOR</Text>
        <View style={styles.colorsRow}>
          {THEME_COLORS.map(color => (
            <TouchableOpacity 
              key={color} 
              style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedThemeColor === color ? 2 : 0, borderColor: '#FFFFFF' }]}
              onPress={() => setSelectedThemeColor(color)}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.saveBtn} 
        onPress={handleSaveBranding}
        disabled={isSavingBranding}
      >
        {isSavingBranding ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <AppContainer style={styles.container}>
      <StatusBar style="light" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={{ fontSize: 16 }}>🏏</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>{platformName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.serverStatusPill}>
            <View style={styles.serverStatusDot} />
            <Text style={styles.serverStatusText}>SERVER ONLINE</Text>
          </View>
          <TouchableOpacity style={styles.goLiveHeaderBtn} onPress={() => handleGoLive()}>
            <Text style={styles.goLiveHeaderBtnText}>GO LIVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.scrollContent, { flex: 1, paddingBottom: 0 }]}>
        
        {/* Auction Selector */}
        <View style={styles.auctionSelector}>
          <View>
            <Text style={styles.auctionSelectorLabel}>SELECTED AUCTION</Text>
            <Text style={styles.auctionSelectorValue}>{activeTournament ? activeTournament.name : 'Kolala Premiere League'}</Text>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </View>

        {/* Horizontal Navigation Tabs */}
        <View style={{ height: 50, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll} contentContainerStyle={styles.navScrollContent}>
            {[
              { id: 'Dashboard', icon: LayoutDashboard },
              { id: 'Players', icon: Users, badge: activePlayers.length > 0 ? String(activePlayers.length) : undefined },
              { id: 'Auctions', icon: Trophy },
              { id: 'Kabaddi', icon: Flag },
              { id: 'Branding', icon: Settings },
              { id: 'Settings', icon: Settings }
            ].map(tab => (
              <TouchableOpacity 
                key={tab.id} 
              style={[styles.navTab, activeTab === tab.id && styles.navTabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} color={activeTab === tab.id ? '#A855F7' : '#9CA3AF'} />
              <Text style={[styles.navTabText, activeTab === tab.id && styles.navTabTextActive]}>{tab.id}</Text>
              {tab.badge && (
                <View style={styles.navTabBadge}>
                  <Text style={styles.navTabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>

        <View style={styles.mainContentBox}>
          {activeTab === 'Branding' && renderBrandingTab()}
          {activeTab === 'Dashboard' && renderDashboardTab()}
          {activeTab === 'Players' && renderPlayersTab()}
          {activeTab === 'Auctions' && renderAuctionsTab()}
          {activeTab === 'Kabaddi' && renderKabaddiTab()}
          {['Settings'].includes(activeTab) && (
            <View style={[styles.tabContent, { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }]}>
              <Text style={{ color: '#9CA3AF', fontSize: 16 }}>{activeTab} Module Coming Soon</Text>
            </View>
          )}
        </View>

      </View>

      {/* View Player Modal */}
      <Modal visible={isViewModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Player Verification Details</Text>
            {selectedPlayer && (
              <View style={{ gap: 12 }}>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  {getImageUrl(selectedPlayer.photo?.drive || selectedPlayer.imageUrl || selectedPlayer.photo?.s3) ? (
                    <Image source={{ uri: getImageUrl(selectedPlayer.photo?.drive || selectedPlayer.imageUrl || selectedPlayer.photo?.s3) as string }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                  ) : (
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
                      <User size={32} color="#9CA3AF" />
                    </View>
                  )}
                </View>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{selectedPlayer.name}</Text>
                <Text style={{ color: '#A855F7', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>ID #{selectedPlayer.applicationId}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#9CA3AF' }}>Role</Text>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedPlayer.role || 'All-Rounder'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#9CA3AF' }}>Village</Text>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedPlayer.village || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#9CA3AF' }}>Mobile</Text>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedPlayer.mobile || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#9CA3AF' }}>Base Price</Text>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>₹{selectedPlayer.basePrice}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsViewModalOpen(false)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Player Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Player Entry</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>NAME</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={newPlayer.name} onChangeText={t => setNewPlayer({...newPlayer, name: t})} placeholder="Player Name" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>MOBILE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={newPlayer.mobile} onChangeText={t => setNewPlayer({...newPlayer, mobile: t})} placeholder="10-digit number" keyboardType="phone-pad" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>VILLAGE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={newPlayer.village} onChangeText={t => setNewPlayer({...newPlayer, village: t})} placeholder="Village / Town" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ROLE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={newPlayer.role} onChangeText={t => setNewPlayer({...newPlayer, role: t})} placeholder="All-Rounder" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>BASE PRICE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={newPlayer.basePrice} onChangeText={t => setNewPlayer({...newPlayer, basePrice: t})} placeholder="100" keyboardType="numeric" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#333' }]} onPress={() => setIsAddModalOpen(false)}><Text style={styles.saveBtnText}>CANCEL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleAddPlayer}><Text style={styles.saveBtnText}>ADD PLAYER</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Player Modal */}
      <Modal visible={isManageModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Player</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ROLE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={manageForm.role} onChangeText={t => setManageForm({...manageForm, role: t})} placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>VILLAGE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={manageForm.village} onChangeText={t => setManageForm({...manageForm, village: t})} placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>BASE PRICE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={manageForm.basePrice} onChangeText={t => setManageForm({...manageForm, basePrice: t})} keyboardType="numeric" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>SOLD PRICE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={manageForm.soldPrice} onChangeText={t => setManageForm({...manageForm, soldPrice: t})} keyboardType="numeric" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>STATUS</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} value={manageForm.status} onChangeText={t => setManageForm({...manageForm, status: t})} placeholder="available / sold / unsold" placeholderTextColor="#64748B" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#333' }]} onPress={() => setIsManageModalOpen(false)}><Text style={styles.saveBtnText}>CANCEL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleUpdatePlayer}><Text style={styles.saveBtnText}>SAVE CHANGES</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serverStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  serverStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  serverStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  goLiveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  goLiveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  auctionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  auctionSelectorLabel: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  auctionSelectorValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navScroll: {
    marginBottom: 20,
  },
  navScrollContent: {
    gap: 8,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  navTabActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  navTabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#A855F7',
  },
  navTabBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  mainContentBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabContent: {
    padding: 24,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandingLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandingLogoIcon: {
    fontSize: 32,
  },
  brandingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  input: {
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  saveBtn: {
    backgroundColor: '#7B61FF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickActionBtn: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  quickActionBtnText: {
    color: '#00D1FF',
    fontSize: 10,
    fontWeight: '800',
  },
  tournamentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tournamentMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  manageBtn: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  manageBtnLive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  manageBtnText: {
    color: '#00D1FF',
    fontSize: 10,
    fontWeight: '800',
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  goBackBtn: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  goBackBtnText: {
    color: '#00D1FF',
    fontWeight: '700',
  },

  // Players Table View
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterPillActive: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  filterPillText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  thText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  tdCell: {
    justifyContent: 'center',
  },
  indexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '800',
  },
  rowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  playerNameRow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  tdTextSub: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusPillSold: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillAvailable: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPillTextSold: {
    color: '#10B981',
  },
  statusPillTextAvailable: {
    color: '#9CA3AF',
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
