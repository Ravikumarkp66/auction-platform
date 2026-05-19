import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Live() {
  const router = useRouter();

  // Mock checking for active live auction
  const hasLiveAuction = true;
  const liveAuctionId = '1';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {hasLiveAuction ? (
          <View style={styles.liveCard}>
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
            <Text style={styles.title}>Mega Auction 2026</Text>
            <Text style={styles.desc}>The main event is currently active. Join now to bid on players.</Text>
            
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push(`/auction/${liveAuctionId}`)}
            >
              <Play size={20} color="#0B0E14" fill="#0B0E14" />
              <Text style={styles.buttonText}>Join Auction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Live Auctions</Text>
            <Text style={styles.emptyDesc}>There are no auctions active at the moment. Check the Auctions tab for upcoming events.</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(tabs)/auctions')}
            >
              <Text style={styles.secondaryButtonText}>View All Auctions</Text>
            </TouchableOpacity>
          </View>
        )}
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
  liveCard: {
    backgroundColor: '#1F2937',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  liveTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#0B0E14',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
