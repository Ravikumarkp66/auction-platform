import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppContainer from '../src/components/AppContainer';

export default function NotificationsScreen() {
  return (
    <AppContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Notifications</Text>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
