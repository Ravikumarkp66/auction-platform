import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Play, Trophy, Users, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00D1FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 6,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          borderRadius: 28,
          height: 80,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.05)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
          elevation: 10,
          paddingTop: 8,
          paddingBottom: 4,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['rgba(11, 14, 26, 0.95)', 'rgba(7, 10, 22, 0.95)']}
            style={{ flex: 1, borderRadius: 24 }}
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
      {/* Hide index since it redirects */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Home size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Play size={22} color={color} fill={focused ? '#00D1FF' : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Tournaments',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Trophy size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.iconContainer}>
              <Users size={22} color={color} />
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
              <User size={22} color={color} />
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
    padding: 8,
    borderRadius: 12,
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
