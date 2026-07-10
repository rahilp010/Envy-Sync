import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncScreen } from './app/screens/SyncScreen';
import DatabaseViewerScreen from './app/screens/DatabaseViewerScreen';
import { HomeScreen } from './app/screens/HomeScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import FloatingDock from './app/components/FloatingDock';
import {
  SyncIcon,
  DatabaseIcon,
  HomeIcon,
  SettingsIcon,
} from './app/components/Icons';
import syncService from './REACT_NATIVE_SYNC_SERVICE';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const dockItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon size={24} /> },
    { id: 'sync', label: 'Sync', icon: <SyncIcon size={24} /> },
    { id: 'database', label: 'Data', icon: <DatabaseIcon size={24} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={24} /> },
  ];

  // Initialize sync service settings
  useEffect(() => {
    const initSync = async () => {
      await syncService.loadSettings();
      // If settings was never loaded/saved (first launch), save initial defaults
      if (!syncService.isConfigured) {
        await syncService.saveSettings({
          backendUrl: 'http://10.236.238.253:8001',
          apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
        });
      }
    };
    initSync();
  }, []);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {activeTab === 'home' && <HomeScreen onNavigate={handleNavigate} />}
        {activeTab === 'sync' && <SyncScreen />}
        {activeTab === 'database' && <DatabaseViewerScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
        
        <FloatingDock 
          items={dockItems} 
          activeItem={activeTab} 
          onItemPress={(item) => setActiveTab(item.id)} 
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});