/**
 * Centralized API configuration for Android App
 */
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android Emulator to access host machine's localhost
// Use local IP for physical device
const LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:8001' : 'http://localhost:8001';

export const API_BASE_URL = LOCALHOST;

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
  },
  dashboard: {
    stats: '/api/dashboard/stats',
    recentActivities: '/api/dashboard/recent-activities',
  },
  // Add other modules as we port them
};
