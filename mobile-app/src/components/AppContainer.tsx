import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from './ScreenBackground';
import { spacing } from '../theme/spacing';

interface AppContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export const AppContainer: React.FC<AppContainerProps> = ({ children, style, noPadding = false }) => {
  return (
    <ScreenBackground>
      <SafeAreaView style={[styles.container, !noPadding && styles.padding, style]}>
        {children}
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: spacing.md,
  },
});
