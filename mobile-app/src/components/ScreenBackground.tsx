import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={[colors.background.dark, colors.background.medium, colors.background.light]}
      style={[styles.background, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
