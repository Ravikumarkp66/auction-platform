import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Gavel, Plus, Minus, ArrowLeft, Zap, Volume2, VolumeX, Shield, Trophy, Users } from 'lucide-react-native';
import { AppContainer } from '../../src/components/AppContainer';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, FadeInDown, FadeInRight } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const initialTeams = [
  { id: '1', name: 'Warriors', purse: 45.0, totalPurse: 100.0, active: true, icon: Shield },
  { id: '2', name: 'Titans', purse: 38.5, totalPurse: 100.0, active: false, icon: Zap },
  { id: '3', name: 'Super Kings', purse: 50.0, totalPurse: 100.0, active: false, icon: Trophy },
  { id: '4', name: 'Royals', purse: 42.0, totalPurse: 100.0, active: false, icon: Users },
];

const initialActivity = [
  { id: '1', text: 'Warriors bid ₹5.5 Cr', time: '10s ago', type: 'bid' },
  { id: '2', text: 'Titans outbid Warriors', time: '15s ago', type: 'outbid' },
  { id: '3', text: 'Warriors bid ₹5.0 Cr', time: '20s ago', type: 'bid' },
  { id: '4', text: 'Base price set at ₹2.0 Cr', time: '1m ago', type: 'info' },
];

const TeamCardItem = ({ item, isSold, highestBidder }: { item: typeof initialTeams[0]; isSold: boolean; highestBidder: string }) => {
  const animatedTeamCardStyle = useAnimatedStyle(() => {
    const isWinning = item.name === highestBidder;
    return {
      transform: [{ scale: isSold && isWinning ? withTiming(1.05, { duration: 300 }) : 1 }],
    };
  });

  return (
    <Animated.View style={[styles.teamCard, item.active && styles.activeTeamCard, animatedTeamCardStyle]}>
      <View style={styles.teamHeader}>
        <item.icon size={16} color={item.active ? '#00D1FF' : '#9CA3AF'} />
        <Text style={styles.teamName}>{item.name}</Text>
        {item.active && <View style={styles.activeDot} />}
      </View>
      <Text style={styles.teamPurse}>₹{item.purse.toFixed(1)} Cr</Text>
      
      {/* Purse Progress Bar */}
      <View style={styles.purseBar}>
        <View style={[styles.purseFill, { width: `${(item.purse / item.totalPurse) * 100}%` }]} />
      </View>
    </Animated.View>
  );
};

export default function AuctionDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [currentBid, setCurrentBid] = useState(550000000); // 5.5 Cr
  const [highestBidder, setHighestBidder] = useState('Warriors');
  const [timeLeft, setTimeLeft] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [activity, setActivity] = useState(initialActivity);
  const [teams, setTeams] = useState(initialTeams);
  
  const pulse = useSharedValue(1);
  const floating = useSharedValue(0);
  const scale = useSharedValue(1);
  const bidFlash = useSharedValue(0);
  const bgGlowY = useSharedValue(0);
  const timerScale = useSharedValue(1);
  const bidScale = useSharedValue(1);
  const shake = useSharedValue(0);
  const hammerRotation = useSharedValue(0);
  const soldScale = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1000 }), -1, true);
    floating.value = withRepeat(withTiming(5, { duration: 2000 }), -1, true);
    bgGlowY.value = withRepeat(withTiming(height * 0.3, { duration: 5000 }), -1, true);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 1 && !isSold) {
          setIsSold(true);
          soldScale.value = withTiming(1, { duration: 500 });
          hammerRotation.value = withSequence(
            withTiming(-45, { duration: 100 }),
            withTiming(0, { duration: 100 }),
            withTiming(-20, { duration: 100 }),
            withTiming(0, { duration: 100 })
          );
          return 0;
        }
        if (prev <= 5 && prev > 1) {
          timerScale.value = withSequence(withTiming(1.4, { duration: 150 }), withTiming(1, { duration: 150 }));
          shake.value = withSequence(
            withTiming(5, { duration: 50 }),
            withTiming(-5, { duration: 50 }),
            withTiming(3, { duration: 50 }),
            withTiming(-3, { duration: 50 }),
            withTiming(0, { duration: 50 })
          );
        }
        return prev > 0 ? prev - 1 : 15;
      });
    }, 1000);
    
    // Simulate bids
    const bidSimulator = setInterval(() => {
      if (!isSold && timeLeft > 5) {
        const otherBidders = ['Titans', 'Super Kings', 'Royals'];
        const randomBidder = otherBidders[Math.floor(Math.random() * otherBidders.length)];
        
        setCurrentBid((prev) => {
          const newBid = prev + 50000000; // Add 50L
          
          setHighestBidder(randomBidder);
          setActivity((prevAct) => [
            { id: Date.now().toString(), text: `${randomBidder} outbid Warriors`, time: 'Just now', type: 'outbid' },
            ...prevAct.slice(0, 3),
          ]);
          
          setTeams((prevTeams) => 
            prevTeams.map((t) => ({
              ...t,
              active: t.name === randomBidder,
              purse: t.name === randomBidder ? t.purse - 5.0 : t.purse,
            }))
          );
          
          return newBid;
        });
        
        setTimeLeft(15); // Reset timer
        bidFlash.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 }));
        bidScale.value = withSequence(withTiming(1.3, { duration: 100 }), withTiming(1, { duration: 200 }));
      }
    }, 4000);
    
    return () => {
      clearInterval(timer);
      clearInterval(bidSimulator);
    };
  }, [isSold, timeLeft]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const animatedFloatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floating.value }],
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: bidFlash.value,
  }));

  const animatedBgGlowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bgGlowY.value }],
  }));

  const animatedTimerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: timerScale.value },
      { translateX: shake.value }
    ],
    borderColor: timeLeft <= 5 ? '#FF4D6D' : '#00D1FF',
    backgroundColor: timeLeft <= 5 ? 'rgba(255, 77, 109, 0.2)' : 'rgba(0, 209, 255, 0.1)',
    shadowColor: timeLeft <= 5 ? '#FF4D6D' : '#00D1FF',
    shadowOpacity: timeLeft <= 5 ? 0.5 : 0,
    shadowRadius: 10,
  }));

  const animatedBidStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bidScale.value }],
  }));

  const animatedHammerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${hammerRotation.value}deg` }],
  }));

  const animatedSoldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: soldScale.value }],
    opacity: soldScale.value,
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
  };

  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const handleBid = () => {
    if (isSold) return;
    const newBid = currentBid + 100000000; // Add 1 Cr
    setCurrentBid(newBid);
    setHighestBidder('Warriors');
    
    setActivity((prevAct) => [
      { id: Date.now().toString(), text: `Warriors outbid ${highestBidder}`, time: 'Just now', type: 'bid' },
      ...prevAct.slice(0, 3),
    ]);
    
    setTeams((prevTeams) => 
      prevTeams.map((t) => ({
        ...t,
        active: t.name === 'Warriors',
        purse: t.name === 'Warriors' ? t.purse - 10.0 : t.purse,
      }))
    );
    
    setTimeLeft(15);
    bidFlash.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 }));
    bidScale.value = withSequence(withTiming(1.3, { duration: 100 }), withTiming(1, { duration: 200 }));
  };

  return (
    <AppContainer noPadding={true} style={styles.container}>
      <StatusBar style="light" />
      
      {/* Moving Background Glow */}
      <Animated.View style={[styles.bgGlow, animatedBgGlowStyle]}>
        <LinearGradient
          colors={['rgba(123, 97, 255, 0.15)', 'rgba(0, 209, 255, 0.05)', 'transparent']}
          style={{ flex: 1, borderRadius: width }}
        />
      </Animated.View>

      {/* Top Section */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(11, 16, 32, 0.95)', 'rgba(7, 10, 22, 0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mega Auction 2026</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDotContainer}>
              <View style={styles.pulseDot} />
              <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
            </View>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.soundButton}>
          {isMuted ? <VolumeX size={20} color="#9CA3AF" /> : <Volume2 size={20} color="#00D1FF" />}
        </TouchableOpacity>

        <Animated.View style={[styles.timerContainer, animatedTimerStyle]}>
          <Text style={[styles.timerText, timeLeft <= 5 && { color: '#FF4D6D' }]}>{timeLeft}s</Text>
        </Animated.View>
        
        {/* Progress Indicator */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(timeLeft / 15) * 100}%`, backgroundColor: timeLeft <= 5 ? '#FF4D6D' : '#00D1FF' }]} />
        </View>
      </View>

      <FlatList
        data={['content']}
        renderItem={() => (
          <View style={styles.mainContent}>
            {/* Player Card */}
            <Animated.View style={[styles.playerCard, animatedFloatingStyle, isSold && styles.soldPlayerCard]}>
              <LinearGradient
                colors={['rgba(11, 16, 32, 0.8)', 'rgba(7, 10, 22, 0.8)']}
                style={styles.playerCardGradient}
              >
                <Image
                  source={require('../../assets/images/stadium_bg.png')}
                  style={styles.cardBgImage}
                  resizeMode="cover"
                />
                
                {/* Darker Overlay */}
                <LinearGradient
                  colors={['rgba(5, 8, 22, 0.1)', 'rgba(5, 8, 22, 0.7)']}
                  style={StyleSheet.absoluteFillObject}
                />
                
                {/* Spotlight Effect */}
                <LinearGradient
                  colors={['rgba(0, 209, 255, 0.15)', 'transparent']}
                  style={styles.spotlight}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                
                <View style={styles.cardHeader}>
                  <View style={[styles.roleBadge, styles.roleAllRounder]}>
                    <Text style={styles.roleText}>ALL-ROUNDER</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Zap size={12} color="#FFC857" fill="#FFC857" />
                    <Text style={styles.ratingText}>95</Text>
                  </View>
                </View>
                
                <View style={styles.playerDetails}>
                  <Text style={styles.playerName}>Ben Stokes</Text>
                  <Text style={styles.nationalityText}>England • Base: ₹2.0 Cr</Text>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Matches</Text>
                      <Text style={styles.statValue}>120</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Runs</Text>
                      <Text style={styles.statValue}>3200</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Wickets</Text>
                      <Text style={styles.statValue}>95</Text>
                    </View>
                  </View>
                </View>

                {/* SOLD Overlay (Glassmorphism) */}
                {isSold && (
                  <Animated.View style={[styles.soldOverlay, animatedSoldStyle]}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
                      style={styles.soldGlassPanel}
                    >
                      <Animated.View style={[animatedHammerStyle, { marginBottom: 15 }]}>
                        <Gavel size={40} color="#FFC857" fill="#FFC857" />
                      </Animated.View>
                      <View style={styles.stampBorder}>
                        <Text style={styles.soldText}>SOLD</Text>
                      </View>
                      <Text style={styles.soldBidder}>{highestBidder}</Text>
                      <Text style={styles.soldAmount}>₹{(currentBid / 10000000).toFixed(2)} Cr</Text>
                      
                      {/* Fake Particles */}
                      <View style={[styles.particle, { top: 20, left: 30 }]} />
                      <View style={[styles.particle, { top: 50, right: 40 }]} />
                      <View style={[styles.particle, { bottom: 30, left: 50 }]} />
                      <View style={[styles.particle, { bottom: 60, right: 60 }]} />
                    </LinearGradient>
                  </Animated.View>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Bidding Section */}
            <View style={styles.biddingSection}>
              {/* Flash Effect */}
              <Animated.View style={[styles.bidFlashOverlay, animatedFlashStyle]} />
              
              <View style={styles.bidHeader}>
                <View>
                  <Text style={styles.currentBidLabel}>CURRENT BID</Text>
                  <View style={styles.newBidBadge}>
                    <Text style={styles.newBidText}>NEW BID</Text>
                  </View>
                </View>
                <Text style={styles.bidderName}>{highestBidder} in lead</Text>
              </View>
              
              <Animated.Text style={[styles.bidValue, animatedBidStyle]}>
                ₹{(currentBid / 10000000).toFixed(2)} <Text style={{ fontSize: 24 }}>Cr</Text>
              </Animated.Text>
              
              <View style={styles.bidControls}>
                <TouchableOpacity style={styles.stepButton} onPress={() => setCurrentBid(currentBid - 10000000)}>
                  <Minus size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                <Pressable
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  onPress={handleBid}
                  style={{ flex: 1, marginHorizontal: 16 }}
                  disabled={isSold}
                >
                  <Animated.View style={[styles.placeBidButton, animatedScaleStyle, isSold && styles.disabledButton]}>
                    <LinearGradient
                      colors={isSold ? ['#4B5563', '#374151'] : ['#00D1FF', '#7B61FF']}
                      style={styles.bidButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Gavel size={20} color="#FFFFFF" />
                      <Text style={styles.placeBidText}>{isSold ? 'AUCTION ENDED' : 'PLACE BID'}</Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>

                <TouchableOpacity style={styles.stepButton} onPress={() => setCurrentBid(currentBid + 10000000)}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Teams Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected Teams</Text>
              <FlatList
                data={teams}
                renderItem={({ item }) => (
                  <TeamCardItem item={item} isSold={isSold} highestBidder={highestBidder} />
                )}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.teamsList}
              />
            </View>

            {/* Activity Feed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Live Activity</Text>
              <FlatList
                data={activity}
                renderItem={({ item, index }) => (
                  <Animated.View
                    entering={FadeInRight.delay(index * 100)}
                    style={[
                      styles.activityItem,
                      item.type === 'bid' && styles.activityBid,
                      item.type === 'outbid' && styles.activityOutbid,
                    ]}
                  >
                    <View style={[
                      styles.activityIndicator,
                      item.type === 'bid' && { backgroundColor: '#00FF9D' },
                      item.type === 'outbid' && { backgroundColor: '#FF4D6D' },
                    ]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityText}>{item.text}</Text>
                      <Text style={styles.activityTime}>{item.time}</Text>
                    </View>
                  </Animated.View>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          </View>
        )}
        keyExtractor={() => 'main'}
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
  bgGlow: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.1,
    width: width * 1.2,
    height: width * 1.2,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pulseDotContainer: {
    position: 'relative',
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D6D',
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF4D6D',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF4D6D',
    marginLeft: 5,
  },
  soundButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#00D1FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00D1FF',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D1FF',
  },
  mainContent: {
    padding: 16,
  },
  playerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 20,
    position: 'relative',
  },
  soldPlayerCard: {
    borderColor: 'rgba(255, 200, 87, 0.5)',
    shadowColor: '#FFC857',
    shadowOpacity: 0.3,
  },
  playerCardGradient: {
    padding: 20,
    height: 240,
    justifyContent: 'space-between',
  },
  cardBgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  spotlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleAllRounder: {
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    borderColor: 'rgba(123, 97, 255, 0.4)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7B61FF',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.4)',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFC857',
  },
  playerDetails: {
    zIndex: 1,
  },
  playerName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nationalityText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(5, 8, 22, 0.4)',
  },
  soldGlassPanel: {
    width: '85%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  stampBorder: {
    borderWidth: 3,
    borderColor: '#FFC857',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 10,
    transform: [{ rotate: '-10deg' }],
    marginBottom: 10,
  },
  soldText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFC857',
    letterSpacing: 3,
  },
  soldBidder: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 5,
  },
  soldAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFC857',
    opacity: 0.6,
  },
  biddingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  bidFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    zIndex: 0,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBidLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  newBidBadge: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  newBidText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#00FF9D',
  },
  bidderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00D1FF',
  },
  bidValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 1,
  },
  bidControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  placeBidButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bidButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  placeBidText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  teamsList: {
    paddingLeft: 0,
  },
  teamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    width: 130,
    position: 'relative',
  },
  activeTeamCard: {
    borderColor: 'rgba(0, 209, 255, 0.3)',
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00D1FF',
    marginLeft: 'auto',
  },
  teamPurse: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 4,
  },
  purseBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  purseFill: {
    height: '100%',
    backgroundColor: '#00D1FF',
    borderRadius: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  activityBid: {
    borderColor: 'rgba(0, 255, 157, 0.05)',
    backgroundColor: 'rgba(0, 255, 157, 0.01)',
  },
  activityOutbid: {
    borderColor: 'rgba(255, 77, 109, 0.05)',
    backgroundColor: 'rgba(255, 77, 109, 0.01)',
  },
  activityIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#9CA3AF',
    marginRight: 10,
  },
  activityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
