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
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';
import { ERPAnalyticsCharts } from '../components/ERPAnalyticsCharts';

const { width } = Dimensions.get('window');

const theme = {
  background: '#16161b',
  cardBg: '#24242d',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  textMain: '#ffffff',
  textSub: '#9ca3af', // gray-400
  textMuted: '#6b7280', // gray-500
  primary: '#daf4aa',
  primaryText: '#16161b',
  success: '#34d399', // emerald-400
  error: '#f87171', // red-400
  info: '#60a5fa', // blue-400
  accentPurple: '#c084fc',
  accentLime: '#daf4aa',
  accentBlue: '#60a5fa',
};

const formatCurrency = val => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const HomeScreen = ({ onNavigate }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dbStats, setDbStats] = useState({
    bankBalance: 0,
    cashBalance: 0,
    totalProducts: 0,
    totalStockQuantity: 0,
    totalClients: 0,
    totalSalesAmount: 0,
    pendingSalesAmount: 0,
    totalPurchaseAmount: 0,
    pendingPurchaseAmount: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    hasData: false,
  });

  const [syncStats, setSyncStats] = useState({
    totalSyncs: 0,
    lastSyncTime: 'Never synced',
    dataTransferred: '0 KB',
    activeDevices: 0,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const loadAllData = async () => {
    await syncService.loadSettings();

    const loadedDevices = syncService.getDevices();
    setDevices(loadedDevices);
    const activeSelected = syncService.getSelectedDevice();
    setSelectedDevice(activeSelected);

    // Fetch live database statistics from SQLite
    try {
      const liveStats = await syncService.getDashboardStatistics();
      if (liveStats) {
        setDbStats(liveStats);
      }
    } catch (e) {
      console.log('Error fetching DB stats:', e);
    }

    // Parallel pings to check online devices
    const pingedDevices = await Promise.all(
      loadedDevices.map(async device => {
        const isOnline = await syncService.pingDevice(device);
        return { ...device, status: isOnline ? 'online' : 'offline' };
      }),
    );

    syncService.devices = pingedDevices;
    const connectedOnlineDevices = pingedDevices.filter(d => d.status === 'online');
    setDevices(connectedOnlineDevices);

    const currentSelected =
      connectedOnlineDevices.find(d => d.id === activeSelected?.id) || connectedOnlineDevices[0] || activeSelected || pingedDevices[0];
    setSelectedDevice(currentSelected);

    setSyncStats({
      totalSyncs: currentSelected?.totalSyncs || 0,
      lastSyncTime: syncService.formatDeviceLastSyncTime(currentSelected),
      dataTransferred: syncService.formatBytes(
        currentSelected?.dataTransferredBytes || 0,
      ),
      activeDevices: connectedOnlineDevices.length,
    });
  };

  useEffect(() => {
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

    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleDeviceSelect = async device => {
    setSelectedDevice(device);
    syncService.selectDevice(device);
    setSyncStats({
      totalSyncs: device.totalSyncs || 0,
      lastSyncTime: syncService.formatDeviceLastSyncTime(device),
      dataTransferred: syncService.formatBytes(
        device.dataTransferredBytes || 0,
      ),
      activeDevices: devices.filter(d => d.status === 'online').length,
    });

    try {
      const liveStats = await syncService.getDashboardStatistics();
      if (liveStats) {
        setDbStats(liveStats);
      } else {
        setDbStats({
          bankBalance: 0,
          cashBalance: 0,
          totalProducts: 0,
          totalStockQuantity: 0,
          totalClients: 0,
          totalSalesAmount: 0,
          pendingSalesAmount: 0,
          totalPurchaseAmount: 0,
          pendingPurchaseAmount: 0,
          totalAccounts: 0,
          totalTransactions: 0,
          hasData: false,
        });
      }
    } catch (e) {
      console.log('Error reloading DB stats on device select:', e);
    }
  };

  const handleSyncNow = () => {
    onNavigate('sync');
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
      <View
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
                      ? 'rgba(52, 211, 153, 0.1)' // emerald-500/10
                      : 'rgba(248, 113, 113, 0.1)', // red-500/10
                  borderColor:
                    device.status === 'online'
                      ? 'rgba(52, 211, 153, 0.2)'
                      : 'rgba(248, 113, 113, 0.2)',
                },
              ]}
            >
              <Ionicons
                name={getDeviceIcon(device.type)}
                size={22}
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
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        device.status === 'online'
                          ? theme.success
                          : theme.error,
                    },
                  ]}
                />
                <Text style={styles.deviceStatus}>
                  {device.status === 'online' ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={theme.primaryText}
                />
              </View>
            )}
          </View>
          <View style={styles.deviceFooter}>
            <Text style={styles.lastSyncText}>
              Last sync:{' '}
              <Text style={styles.lastSyncTime}>
                {device.lastSync || 'Never'}
              </Text>
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Ambient Glow Effects */}
      <Animated.View
        style={[
          styles.bgOrb1,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgOrb2,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.02, 0.06],
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.contentWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Main Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>ENVY</Text>
            {/* <Text style={styles.headerSubtitle}>
              {selectedDevice ? selectedDevice.name : 'Synced Device'}{' '}
              Statistics
            </Text> */}
          </View>
          <TouchableOpacity
            style={styles.syncNowButton}
            onPress={handleSyncNow}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sync"
              size={14}
              color={theme.primaryText}
              style={styles.syncBtnIcon}
            />
            <Text style={styles.syncNowButtonText}>Sync</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* 1. BANK & CASH BALANCE HERO CARD */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finance Overview</Text>
            <View style={styles.heroFinanceCard}>
              <View style={styles.heroFinanceHeader}>
                <View style={styles.heroBadge}>
                  <Ionicons
                    name="wallet-outline"
                    size={14}
                    color={theme.accentBlue}
                  />
                  <Text
                    style={[styles.heroBadgeText, { color: theme.accentBlue }]}
                  >
                    TREASURY
                  </Text>
                </View>
                <Text style={styles.heroCardSubtitle}>
                  Live Accounts Balance
                </Text>
              </View>

              <View style={styles.financeSplitRow}>
                {/* Bank Account */}
                <View style={styles.financeBox}>
                  <View style={styles.financeLabelRow}>
                    <Ionicons
                      name="card-outline"
                      size={16}
                      color={theme.accentBlue}
                    />
                    <Text style={styles.financeLabel}>Bank Balance</Text>
                  </View>
                  <Text style={styles.financeAmountText}>
                    {formatCurrency(dbStats.bankBalance)}
                  </Text>
                </View>

                <View style={styles.financeDivider} />

                {/* Cash Account */}
                <View style={styles.financeBox}>
                  <View style={styles.financeLabelRow}>
                    <Ionicons
                      name="cash-outline"
                      size={16}
                      color={theme.success}
                    />
                    <Text style={styles.financeLabel}>Cash Balance</Text>
                  </View>
                  <Text style={styles.financeAmountText}>
                    {formatCurrency(dbStats.cashBalance)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 1.5 ERP VISUAL ANALYTICS CHARTS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ERP Visual Analytics</Text>
            <ERPAnalyticsCharts stats={dbStats} />
          </View>

          {/* 2. SALES & PURCHASE STATS (ELECTRON STYLE) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transactions Summary</Text>

            {/* Sales Card */}
            <View style={[styles.dualStatCard, { marginBottom: 14 }]}>
              <View style={styles.dualCardHeader}>
                <View style={styles.dualCardTitleRow}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(52, 211, 153, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="trending-up"
                      size={18}
                      color={theme.success}
                    />
                  </View>
                  <Text style={styles.dualCardTitle}>Sales Revenue</Text>
                </View>
                <Text style={styles.dualCardTag}>REVENUE</Text>
              </View>
              <View style={styles.dualMetricsRow}>
                <View style={styles.dualMetricItem}>
                  <Text style={styles.dualMetricLabel}>Total Sales</Text>
                  <Text
                    style={[styles.dualMetricValue, { color: theme.textMain }]}
                  >
                    {formatCurrency(dbStats.totalSalesAmount)}
                  </Text>
                </View>
                <View style={styles.dualMetricItem}>
                  <Text style={styles.dualMetricLabel}>Pending Amount</Text>
                  <Text
                    style={[
                      styles.dualMetricValue,
                      { color: theme.accentLime },
                    ]}
                  >
                    {formatCurrency(dbStats.pendingSalesAmount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Purchase Card */}
            <View style={styles.dualStatCard}>
              <View style={styles.dualCardHeader}>
                <View style={styles.dualCardTitleRow}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(248, 113, 113, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={18}
                      color={theme.error}
                    />
                  </View>
                  <Text style={styles.dualCardTitle}>Purchases & Expenses</Text>
                </View>
                <Text style={styles.dualCardTag}>PROCUREMENT</Text>
              </View>
              <View style={styles.dualMetricsRow}>
                <View style={styles.dualMetricItem}>
                  <Text style={styles.dualMetricLabel}>Total Purchases</Text>
                  <Text
                    style={[styles.dualMetricValue, { color: theme.textMain }]}
                  >
                    {formatCurrency(dbStats.totalPurchaseAmount)}
                  </Text>
                </View>
                <View style={styles.dualMetricItem}>
                  <Text style={styles.dualMetricLabel}>Pending Amount</Text>
                  <Text
                    style={[styles.dualMetricValue, { color: theme.warning }]}
                  >
                    {formatCurrency(dbStats.pendingPurchaseAmount)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. INVENTORY & CRM GRID */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inventory & Master Records</Text>

            <View style={styles.statsGrid}>
              {/* Products & Stock */}
              <View style={styles.halfCard}>
                <View style={styles.gridStatCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(218, 244, 170, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={theme.accentLime}
                    />
                  </View>
                  <Text style={styles.gridStatValue}>
                    {dbStats.totalProducts}
                  </Text>
                  <Text style={styles.gridStatTitle}>Total Products</Text>
                  <Text style={styles.gridStatSubtext}>
                    Stock: {dbStats.totalStockQuantity} units
                  </Text>
                </View>
              </View>

              {/* Clients */}
              <View style={styles.halfCard}>
                <View style={styles.gridStatCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(192, 132, 252, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={theme.accentPurple}
                    />
                  </View>
                  <Text style={styles.gridStatValue}>
                    {dbStats.totalClients}
                  </Text>
                  <Text style={styles.gridStatTitle}>Clients Details</Text>
                  <Text style={styles.gridStatSubtext}>
                    Customers & Suppliers
                  </Text>
                </View>
              </View>

              {/* Accounts */}
              <View style={styles.halfCard}>
                <View style={styles.gridStatCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(96, 165, 250, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={20}
                      color={theme.accentBlue}
                    />
                  </View>
                  <Text style={styles.gridStatValue}>
                    {dbStats.totalAccounts}
                  </Text>
                  <Text style={styles.gridStatTitle}>Accounts</Text>
                  <Text style={styles.gridStatSubtext}>Active Accounts</Text>
                </View>
              </View>

              {/* Sync Activity */}
              <View style={styles.halfCard}>
                <View style={styles.gridStatCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: 'rgba(218, 244, 170, 0.1)' },
                    ]}
                  >
                    <Ionicons
                      name="sync-circle-outline"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <Text style={styles.gridStatValue}>
                    {syncStats.totalSyncs}
                  </Text>
                  <Text style={styles.gridStatTitle}>Total Syncs</Text>
                  <Text style={styles.gridStatSubtext}>
                    Transferred: {syncStats.dataTransferred}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 4. CONNECTED DEVICES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons
                    name="desktop-outline"
                    size={16}
                    color={theme.textSub}
                  />
                </View>
                <Text style={styles.sectionTitle}>Connected Devices</Text>
              </View>
            </View>
            <View style={styles.devicesList}>
              {devices.length > 0 ? (
                devices.map((device, index) => renderDeviceCard(device, index))
              ) : (
                <View style={styles.emptyDeviceCard}>
                  <Ionicons name="desktop-outline" size={24} color={theme.textSub} />
                  <Text style={styles.emptyDeviceText}>No active device currently connected</Text>
                  <Text style={styles.emptyDeviceSubtext}>
                    Ensure your Electron desktop app is running and connected to Wi-Fi/Backend server.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 5. QUICK ACTIONS */}
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={theme.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('database')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="server-outline"
                  size={22}
                  color={theme.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View Database</Text>
                <Text style={styles.actionSubtitle}>
                  Browse detailed mobile view cards of records
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textSub}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('settings')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color={theme.textMain}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Sync Settings</Text>
                <Text style={styles.actionSubtitle}>
                  Manage connection URLs and auto-sync options
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textSub}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentWrapper: {
    flex: 1,
  },
  bgOrb1: {
    position: 'absolute',
    top: '-10%',
    left: '-20%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: theme.primary,
    opacity: 0.05,
    transform: [{ scale: 1.5 }],
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-20%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#60a5fa', // Blue
    opacity: 0.05,
    transform: [{ scale: 1.5 }],
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 27, 0.8)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '300', // font-light
    color: theme.textMain,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textSub,
    marginTop: 2,
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  syncBtnIcon: {
    marginRight: 6,
  },
  syncNowButtonText: {
    color: theme.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16161b',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textMain,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Hero Finance Card
  heroFinanceCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  heroFinanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroCardSubtitle: {
    fontSize: 12,
    color: theme.textSub,
  },
  financeSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financeBox: {
    flex: 1,
  },
  financeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  financeLabel: {
    fontSize: 12,
    color: theme.textSub,
    fontWeight: '500',
  },
  financeAmountText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.textMain,
    letterSpacing: 0.2,
  },
  financeDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.cardBorder,
    marginHorizontal: 16,
  },

  // Dual Metric Cards (Sales & Purchases)
  dualStatCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  dualCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dualCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dualCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textMain,
  },
  dualCardTag: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.textSub,
    letterSpacing: 0.8,
  },
  dualMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  dualMetricItem: {
    flex: 1,
  },
  dualMetricLabel: {
    fontSize: 11,
    color: theme.textSub,
    marginBottom: 4,
  },
  dualMetricValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Grid Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  halfCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  gridStatCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  gridStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.textMain,
    marginTop: 10,
    marginBottom: 2,
  },
  gridStatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 4,
  },
  gridStatSubtext: {
    fontSize: 11,
    color: theme.textSub,
  },

  // Devices List
  devicesList: {
    gap: 10,
  },
  deviceCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  selectedDeviceCard: {
    borderColor: 'rgba(218, 244, 170, 0.4)', // border-[#daf4aa]/40
    backgroundColor: '#2a2a35', // slightly elevated background
  },
  deviceCardButton: {
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: '700',
    color: theme.textMain,
    letterSpacing: 0.2,
  },
  selectedDeviceName: {
    color: theme.primary,
  },
  defaultBadge: {
    backgroundColor: 'rgba(218, 244, 170, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(218, 244, 170, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  deviceStatus: {
    fontSize: 12,
    color: theme.textSub,
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deviceFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  lastSyncText: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
  },
  lastSyncTime: {
    color: theme.textMain,
    fontWeight: '600',
  },

  // Action Cards
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#16161b',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textMain,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.textSub,
  },
  emptyDeviceCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderStyle: 'dashed',
  },
  emptyDeviceText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMain,
    marginTop: 8,
  },
  emptyDeviceSubtext: {
    fontSize: 12,
    color: theme.textSub,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
