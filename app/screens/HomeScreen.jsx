import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

const { width } = Dimensions.get('window');

const theme = {
  background: '#000000',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBorder: 'rgba(255, 255, 255, 0.05)',
  textMain: '#FFFFFF',
  textSub: '#888888',
  primary: '#E44D26', // Copper/Red
  success: '#30D158',
  error: '#FF453A',
};

export const HomeScreen = ({ onNavigate }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [syncStats, setSyncStats] = useState({
    totalSyncs: 0,
    lastSyncTime: 'Never synced',
    dataTransferred: '0 KB',
    activeDevices: 0,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Ambient Glow Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const checkConnection = async () => {
      await syncService.loadSettings();

      const loadedDevices = syncService.getDevices();
      setDevices(loadedDevices);
      const activeSelected = syncService.getSelectedDevice();
      setSelectedDevice(activeSelected);

      // Perform parallel pings to verify which devices are online
      const pingedDevices = await Promise.all(
        loadedDevices.map(async (device) => {
          const isOnline = await syncService.pingDevice(device);
          return { ...device, status: isOnline ? 'online' : 'offline' };
        })
      );

      // Cache the ping results back into syncService
      syncService.devices = pingedDevices;
      setDevices(pingedDevices);

      const currentSelected = pingedDevices.find(d => d.id === activeSelected?.id) || pingedDevices[0];
      setSelectedDevice(currentSelected);

      setSyncStats({
        totalSyncs: currentSelected.totalSyncs || 0,
        lastSyncTime: syncService.formatDeviceLastSyncTime(currentSelected),
        dataTransferred: syncService.formatBytes(currentSelected.dataTransferredBytes || 0),
        activeDevices: pingedDevices.filter(d => d.status === 'online').length,
      });
    };
    checkConnection();
  }, []);

  const handleDeviceSelect = device => {
    setSelectedDevice(device);
    syncService.selectDevice(device);
    setSyncStats({
      totalSyncs: device.totalSyncs || 0,
      lastSyncTime: syncService.formatDeviceLastSyncTime(device),
      dataTransferred: syncService.formatBytes(device.dataTransferredBytes || 0),
      activeDevices: devices.filter(d => d.status === 'online').length,
    });
  };

  const handleSyncNow = () => {
    if (selectedDevice) {
      onNavigate('sync');
    }
  };

  const getDeviceIcon = type => {
    switch (type) {
      case 'desktop':
        return 'desktop-outline';
      case 'laptop':
        return 'laptop-outline';
      case 'mobile':
        return 'phone-portrait-outline';
      default:
        return 'hardware-chip-outline';
    }
  };

  const renderDeviceCard = (device, index) => {
    const isSelected = selectedDevice?.id === device.id;

    return (
      <Animated.View
        key={device.id}
        style={[styles.deviceCard, isSelected && styles.selectedDeviceCard]}
      >
        <TouchableOpacity
          onPress={() => handleDeviceSelect(device)}
          style={styles.deviceCardButton}
          activeOpacity={0.7}
        >
          <View style={styles.deviceHeader}>
            <View
              style={[
                styles.deviceIcon,
                {
                  backgroundColor:
                    device.status === 'online'
                      ? 'rgba(48, 209, 88, 0.1)'
                      : 'rgba(255, 69, 58, 0.1)',
                },
              ]}
            >
              <Ionicons
                name={getDeviceIcon(device.type)}
                size={24}
                color={device.status === 'online' ? theme.success : theme.error}
              />
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceNameRow}>
                <Text
                  style={[
                    styles.deviceName,
                    isSelected && styles.selectedDeviceName,
                  ]}
                >
                  {device.name}
                </Text>
                {device.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.deviceStatus}>
                <Ionicons
                  name="ellipse"
                  size={8}
                  color={
                    device.status === 'online' ? theme.success : theme.error
                  }
                />{' '}
                {device.status === 'online' ? 'Online' : 'Offline'}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.deviceFooter}>
            <Text style={styles.lastSyncText}>
              Last sync: {device.lastSync}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStatCard = (title, value, iconName, iconColor) => (
    <View style={styles.statCard}>
      <View
        style={[styles.statIconWrapper, { backgroundColor: `${iconColor}15` }]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Ambient Glow */}
      <Animated.View
        style={[
          styles.topOrb,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
          },
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back</Text>
        <Text style={styles.headerSubtitle}>Manage your sync ecosystem</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.halfCard}>
              {renderStatCard(
                'Total Syncs',
                syncStats.totalSyncs,
                'sync-circle-outline',
                theme.primary,
              )}
            </View>

            <View style={styles.halfCard}>
              {renderStatCard(
                'Active Devices',
                syncStats.activeDevices,
                'hardware-chip-outline',
                theme.success,
              )}
            </View>

            <View style={styles.fullCard}>
              {renderStatCard(
                'Transferred',
                syncStats.dataTransferred,
                'swap-vertical-outline',
                '#4DA8DA',
              )}
            </View>
          </View>
        </View>

        {/* Device Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connected Devices</Text>
            <TouchableOpacity
              style={styles.syncNowButton}
              onPress={handleSyncNow}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sync"
                size={14}
                color="#FFFFFF"
                style={styles.syncBtnIcon}
              />
              <Text style={styles.syncNowButtonText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devicesList}>
            {devices.map((device, index) => renderDeviceCard(device, index))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigate('database')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="server-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Database</Text>
              <Text style={styles.actionSubtitle}>
                Browse synchronized records
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigate('settings')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.textSub}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Preferences</Text>
              <Text style={styles.actionSubtitle}>
                Configure sync and connection rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  topOrb: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: theme.primary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textMain,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSub,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMain,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  halfCard: {
    width: '48.5%',
    marginBottom: 12,
  },

  fullCard: {
    width: '100%',
  },

  statCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textMain,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    color: theme.textSub,
    fontWeight: '500',
  },
  devicesList: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  selectedDeviceCard: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(228, 77, 38, 0.08)',
  },
  deviceCardButton: {
    padding: 20,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMain,
  },
  selectedDeviceName: {
    color: theme.primary,
  },
  defaultBadge: {
    backgroundColor: 'rgba(228, 77, 38, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.primary,
  },
  deviceStatus: {
    fontSize: 13,
    color: theme.textSub,
    alignItems: 'center',
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  deviceFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  lastSyncText: {
    fontSize: 12,
    color: theme.textSub,
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  syncBtnIcon: {
    marginRight: 6,
  },
  syncNowButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.textSub,
  },
});
