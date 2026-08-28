import { Platform } from 'react-native';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

// Configure the sync service
// For Android emulator, use 10.0.2.2 to connect to host's localhost.
// For iOS simulator/web, localhost works.
const API_URL = Platform.select({
  android: 'https://electron-by-envy.vercel.app/',
  default: 'https://electron-by-envy.vercel.app/',
});

// React Native doesn't support process.env directly, use the actual API key
const API_KEY = '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff';
syncService.configure(API_URL, API_KEY);

/**
 * Perform complete sync workflow and return success
 */
export const syncDatabase = async () => {
  try {
    const result = await syncService.performSync();
    console.log('Sync succeeded, database loaded:', result);
    return result.success;
  } catch (error) {
    console.error('Database sync failed:', error);
    throw error;
  }
};
