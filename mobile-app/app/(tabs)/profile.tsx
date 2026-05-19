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

  const handleLogout = async () => {
    await storage.removeItem(AUTH_TOKEN_KEY);
    await storage.removeItem(USER_ROLE_KEY);
    router.replace('/');
  };

  const menuItems = [
    { icon: <Trophy size={20} color="#00D1FF" />, title: 'Hosted Tournaments', route: '/hosted-tournaments' },
    { icon: <Settings size={20} color="#00D1FF" />, title: 'Settings', route: '/settings' },
    { icon: <HelpCircle size={20} color="#00D1FF" />, title: 'Support', route: '/support' },
    { icon: <Info size={20} color="#00D1FF" />, title: 'App Intro', route: '/onboarding' },
  ];

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
            <Text style={styles.userRole}>Tournament Organizer</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
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
