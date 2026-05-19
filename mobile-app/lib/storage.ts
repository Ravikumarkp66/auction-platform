import * as SecureStore from 'expo-secure-store';

export const storage = {
  async setItem(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in SecureStore', error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore', error);
      return null;
    }
  },

  async removeItem(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore', error);
    }
  }
};

export const AUTH_TOKEN_KEY = 'auth_token';
export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';
export const USER_ROLE_KEY = 'user_role';
