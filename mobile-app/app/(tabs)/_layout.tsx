import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Trophy, Shield, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage, USER_ROLE_KEY } from '../../lib/storage';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    storage.getItem(USER_ROLE_KEY).then(setRole);
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false, // Remove text under icons
        tabBarActiveTintColor: '#00D1FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          borderRadius: 36,
          height: 72,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.8,
          shadowRadius: 32,
          elevation: 12,
          paddingHorizontal: 12,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['rgba(11, 14, 26, 0.98)', 'rgba(7, 10, 22, 0.98)']}
            style={{ flex: 1, borderRadius: 36 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
        headerStyle: {
          backgroundColor: '#050816',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: 'bold',
        },
        headerTintColor: '#FFFFFF',
      }}>
      {/* Hidden Screens */}
      <Tabs.Screen name="index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="live" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="teams" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="two" options={{ href: null, headerShown: false }} />

      {/* Visible Tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Home size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Auctions',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Trophy size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          headerShown: true,
          href: role === 'admin' ? '/(tabs)/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Shield size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <User size={focused ? 26 : 24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
