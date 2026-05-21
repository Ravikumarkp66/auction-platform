import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { storage, USER_ROLE_KEY } from '../lib/storage';
import { UserRole } from '../types/user';

export default function ChooseRole() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const router = useRouter();

  const handleContinue = async () => {
    if (selectedRole) {
      await storage.setItem(USER_ROLE_KEY, selectedRole);
      router.replace('/(tabs)/home');
    }
  };

  const roles: { id: UserRole; title: string; desc: string }[] = [
    { id: 'admin', title: 'Tournament Admin', desc: 'Create tournaments, manage auctions, and oversee the platform.' },
    { id: 'owner', title: 'Team Owner', desc: 'Manage budget, buy players, and build squad.' },
    { id: 'bidder', title: 'Bidder / Manager', desc: 'Participate in bidding on behalf of owners.' },
    { id: 'viewer', title: 'Viewer', desc: 'Watch the live auction and track results.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Text style={styles.headerTitle}>Choose Your Role</Text>
        <Text style={styles.headerSubtitle}>Select how you want to participate in the arena.</Text>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id ? styles.activeRoleCard : null,
              ]}
              onPress={() => setSelectedRole(role.id)}
            >
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </View>
              <View style={[
                styles.checkbox,
                selectedRole === role.id ? styles.activeCheckbox : null,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selectedRole ? styles.disabledButton : null]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginLinkText}>Are you an Admin? Sign In with Password</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
  },
  rolesContainer: {
    gap: 16,
    marginBottom: 40,
  },
  roleCard: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeRoleCard: {
    borderColor: '#8B5CF6',
    backgroundColor: '#1E1B4B',
  },
  roleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  activeCheckbox: {
    borderColor: '#8B5CF6',
    backgroundColor: '#8B5CF6',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  loginLinkText: {
    color: '#00D1FF',
    fontSize: 14,
    fontWeight: '600',
  },
});
