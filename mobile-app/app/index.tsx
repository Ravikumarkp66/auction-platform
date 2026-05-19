import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { storage, ONBOARDING_COMPLETE_KEY } from '../lib/storage';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkState = async () => {
      try {
        const onboardingComplete = await storage.getItem(ONBOARDING_COMPLETE_KEY);
        
        if (onboardingComplete === 'true') {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        // Fallback to home if storage fails (makes onboarding optional/stable)
        router.replace('/(tabs)/home');
      }
    };

    checkState();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>AUCTION</Text>
        <Text style={styles.subtitle}>ARENA</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
        </View>
        <Text style={styles.loadingText}>Loading Arena...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14', // Dark near black/navy
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6', // Purple/violet accent
    letterSpacing: 8,
    marginTop: -10,
    marginBottom: 40,
  },
  progressContainer: {
    width: width * 0.6,
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    width: '40%', // Initial progress or animated
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
