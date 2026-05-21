import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { storage, ONBOARDING_COMPLETE_KEY, USER_ROLE_KEY } from '../lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Users, Gavel, ChevronRight, Eye } from 'lucide-react-native';
import { UserRole } from '../types/user';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 0,
    title: 'Welcome to Arena',
    subtitle: 'The ultimate live cricket auction experience. Premium, real-time, and immersive.',
    icon: Trophy,
    color: '#00D1FF',
  },
  {
    id: 1,
    title: 'Watch Live Auctions',
    subtitle: 'Experience the thrill of live bidding with real-time updates and cinematic visuals.',
    icon: Play,
    color: '#7B61FF',
  },
  {
    id: 2,
    title: 'Build Your Dream Team',
    subtitle: 'Manage budget, scout players, and outbid rivals to build a championship squad.',
    icon: Users,
    color: '#FFC857',
  },
  {
    id: 3,
    title: 'Run Professionally',
    subtitle: 'As a manager, control the auction flow, transition rounds, and manage teams.',
    icon: Gavel,
    color: '#FF4D6D',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentSlide(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = async () => {
    if (currentSlide < 4) {
      flatListRef.current?.scrollToIndex({
        index: currentSlide + 1,
        animated: true,
      });
    } else {
      if (selectedRole) {
        try {
          await storage.setItem(USER_ROLE_KEY, selectedRole);
          await storage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
          router.replace('/(tabs)/home');
        } catch (error) {
          // Fallback to home if storage fails
          router.replace('/(tabs)/home');
        }
      }
    }
  };

  const handleSkip = async () => {
    flatListRef.current?.scrollToIndex({
      index: 4,
      animated: true,
    });
  };

  const roles: { id: UserRole; title: string; desc: string; icon: any; color: string }[] = [
    { id: 'owner', title: 'Team Owner', desc: 'Manage budget & buy players', icon: Trophy, color: '#FFC857' },
    { id: 'bidder', title: 'Auction Manager', desc: 'Control the auction flow', icon: Gavel, color: '#7B61FF' },
    { id: 'viewer', title: 'Viewer / Fan', desc: 'Watch live and track results', icon: Eye, color: '#00D1FF' },
  ];

  const data = [
    ...slides.map(s => ({ ...s, type: 'slide' })),
    { id: 4, type: 'role_selection' }
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'role_selection') {
      return (
        <View style={styles.slide}>
          <View style={styles.centerContent}>
            <Text style={[styles.title, { marginBottom: 8 }]}>Choose Your Role</Text>
            <Text style={[styles.subtitle, { marginBottom: 32 }]}>Select how you want to participate in the arena.</Text>

            <View style={styles.rolesContainer}>
              {roles.map((role) => {
                const RoleIcon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      isSelected && { borderColor: role.color, backgroundColor: `${role.color}10` }
                    ]}
                    onPress={() => setSelectedRole(role.id)}
                  >
                    <View style={[styles.roleIconContainer, { backgroundColor: `${role.color}20` }]}>
                      <RoleIcon size={24} color={role.color} />
                    </View>
                    <View style={styles.roleTextContainer}>
                      <Text style={styles.roleTitle}>{role.title}</Text>
                      <Text style={styles.roleDesc}>{role.desc}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && { borderColor: role.color, backgroundColor: role.color }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      );
    }

    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        <View style={styles.centerContent}>
          <View style={[styles.iconContainer, { borderColor: `${item.color}40` }]}>
            <LinearGradient
              colors={[`${item.color}20`, 'transparent']}
              style={styles.iconGradient}
            />
            <Icon size={64} color={item.color} />
          </View>
          
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Glows */}
      <View style={styles.bgGlow1} pointerEvents="none" />
      <View style={styles.bgGlow2} pointerEvents="none" />

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>ARENA</Text>
        {currentSlide < 4 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={{ color: '#00D1FF', fontWeight: '700' }}>Admin Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.scrollView}
      />

      {/* Bottom Controls */}
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {[0, 1, 2, 3, 4].map((index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentSlide ? styles.activeIndicator : null,
                index === currentSlide && { backgroundColor: currentSlide === 4 ? '#7B61FF' : slides[currentSlide]?.color || '#00D1FF' }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            currentSlide === 4 && !selectedRole ? styles.disabledButton : null
          ]}
          onPress={handleNext}
          disabled={currentSlide === 4 && !selectedRole}
        >
          <LinearGradient
            colors={currentSlide === 4 && !selectedRole ? ['#374151', '#374151'] : ['#00D1FF', '#7B61FF']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {currentSlide === 4 ? 'Enter Arena' : 'Next'}
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  bgGlow1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    zIndex: -1,
  },
  bgGlow2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    height: height * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  iconGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F2937',
  },
  activeIndicator: {
    width: 24,
  },
  button: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  rolesContainer: {
    width: '100%',
    gap: 16,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
