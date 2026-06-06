import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { User, Settings, LogOut, Trophy, HelpCircle, Info, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { storage, AUTH_TOKEN_KEY, USER_ROLE_KEY } from '../../lib/storage';
import { AppContainer } from '../../src/components/AppContainer';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);

  React.useEffect(() => {
    storage.getItem(USER_ROLE_KEY).then(setRole);
    storage.getItem(AUTH_TOKEN_KEY).then(token => setIsAuthenticated(!!token));
  }, []);

  const handleLogout = async () => {
    await storage.removeItem(AUTH_TOKEN_KEY);
    await storage.removeItem(USER_ROLE_KEY);
    setIsAuthenticated(false);
    setRole(null);
  };

  const menuItems = [
    { icon: <Trophy size={20} color="#00D1FF" />, title: 'Watched Auctions', route: '/watched' },
    { icon: <Settings size={20} color="#00D1FF" />, title: 'Settings', route: '/settings' },
  ];

  if (!isAuthenticated) {
    return (
      <AppContainer style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <StatusBar style="light" />
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <User size={64} color="#7B61FF" style={{ marginBottom: 24 }} />
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 12 }}>Not Signed In</Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
            Sign in to track your watched auctions, manage tournaments, and sync your profile.
          </Text>
        </View>
        <TouchableOpacity 
          style={{ backgroundColor: '#7B61FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 }}
          onPress={() => router.push('/login')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Sign In with Email</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
          onPress={() => router.push('/login')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Continue with Google</Text>
        </TouchableOpacity>
      </AppContainer>
    );
  }

  return (
    <AppContainer style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={32} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.userName}>Ravikumar K P</Text>
            <Text style={styles.userRole}>
              {role === 'admin' ? 'Tournament Admin' :
               role === 'owner' ? 'Team Owner' :
               role === 'bidder' ? 'Bidder' :
               role === 'viewer' ? 'Viewer' : 'User'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {}}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF4D6D" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for bottom tab
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 12,
    color: '#00D1FF',
    fontWeight: '600',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.2)',
  },
  logoutText: {
    color: '#FF4D6D',
    fontSize: 14,
    fontWeight: '700',
  },
});
