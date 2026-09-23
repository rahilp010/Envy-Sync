import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SyncScreen } from './app/screens/SyncScreen';
import DatabaseViewerScreen from './app/screens/DatabaseViewerScreen';
import { HomeScreen } from './app/screens/HomeScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { AuthScreen } from './app/screens/AuthScreen';
import FloatingDock from './app/components/FloatingDock';
import {
  SyncIcon,
  DatabaseIcon,
  HomeIcon,
  SettingsIcon,
} from './app/components/Icons';
import syncService from './REACT_NATIVE_SYNC_SERVICE';
import updateService from './app/services/updateService';
import UpdateModal from './app/components/UpdateModal';

import ToastProvider from './app/components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isActivated, setIsActivated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [pendingUpdateInfo, setPendingUpdateInfo] = useState(null);

  const dockItems = useMemo(
    () => [
      { id: 'home', label: 'Home', icon: <HomeIcon size={24} /> },
      { id: 'sync', label: 'Sync', icon: <SyncIcon size={24} /> },
      { id: 'database', label: 'Data', icon: <DatabaseIcon size={24} /> },
      { id: 'settings', label: 'Settings', icon: <SettingsIcon size={24} /> },
    ],
    [],
  );

  // Initialize sync service settings
  useEffect(() => {
    const initSync = async () => {
      try {
        await syncService.loadSettings();
        setIsActivated(syncService.isActivated);
      } catch (err) {
        // Soft error handling
      } finally {
        setInitializing(false);
      }
    };
    initSync();
  }, []);

  // Background update check on launch
  useEffect(() => {
    if (!isActivated) return;
    const checkAppUpdate = async () => {
      try {
        const res = await updateService.checkForUpdates(false);
        if (res.hasUpdate && res.updateInfo) {
          setPendingUpdateInfo(res.updateInfo);
          setUpdateModalVisible(true);
        }
      } catch (e) {
        // Soft ignore update check error on launch
      }
    };
    checkAppUpdate();
  }, [isActivated]);

  const handleNavigate = useCallback(tab => {
    setActiveTab(tab);
  }, []);

  const handleDockPress = useCallback(item => {
    setActiveTab(item.id);
  }, []);

  const handleManualCheckResult = useCallback(info => {
    setPendingUpdateInfo(info);
    setUpdateModalVisible(true);
  }, []);

  if (initializing) {
    return (
      <ToastProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#16161b" />
          <View style={[styles.container, styles.centerLoading]}>
            <ActivityIndicator size="large" color="#daf4aa" />
          </View>
        </SafeAreaProvider>
      </ToastProvider>
    );
  }

  if (!isActivated) {
    return (
      <ToastProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#16161b" />
          <AuthScreen onAuthenticated={() => setIsActivated(true)} />
        </SafeAreaProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#16161b" />
        <View style={styles.container}>
          {activeTab === 'home' && <HomeScreen onNavigate={handleNavigate} />}
          {activeTab === 'sync' && <SyncScreen />}
          {activeTab === 'database' && <DatabaseViewerScreen />}
          {activeTab === 'settings' && (
            <SettingsScreen
              onLogout={() => setIsActivated(false)}
              onCheckUpdate={handleManualCheckResult}
            />
          )}

          <FloatingDock
            items={dockItems}
            activeItem={activeTab}
            onItemPress={handleDockPress}
          />

          <UpdateModal
            visible={updateModalVisible}
            updateInfo={pendingUpdateInfo}
            onClose={() => setUpdateModalVisible(false)}
          />
        </View>
      </SafeAreaProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16161b',
  },
  centerLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
