import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Animated,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

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

export const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    backendUrl: 'http://10.236.238.253:8001',
    apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
    autoSync: true,
    syncInterval: 5, 
    notifyOnSync: true,
    compressData: true,
    maxRetries: 3,
    timeout: 30, 
    devices: [],
    selectedDevice: null,
  });

  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [tempDeviceName, setTempDeviceName] = useState('');
  const [tempDeviceUrl, setTempDeviceUrl] = useState('');
  const [tempDeviceKey, setTempDeviceKey] = useState('');

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempUrl, setTempUrl] = useState(settings.backendUrl);
  const [tempKey, setTempKey] = useState(settings.apiKey);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Ambient Glow Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    const fetchSettings = async () => {
      await syncService.loadSettings();
      const currentSettings = {
        backendUrl: syncService.backendUrl,
        apiKey: syncService.apiKey,
        autoSync: syncService.autoSync,
        syncInterval: syncService.syncInterval,
        notifyOnSync: syncService.notifyOnSync,
        compressData: syncService.compressData,
        maxRetries: syncService.maxRetries,
        timeout: syncService.timeout,
        devices: syncService.getDevices(),
        selectedDevice: syncService.getSelectedDevice(),
      };
      setSettings(currentSettings);
      setTempUrl(syncService.backendUrl);
      setTempKey(syncService.apiKey);
    };
    fetchSettings();
  }, []);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await syncService.saveSettings(updated);
  };

  const handleSaveDevice = async (id) => {
    if (!tempDeviceName.trim() || !tempDeviceUrl.trim() || !tempDeviceKey.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    const updatedDevices = settings.devices.map(device => {
      if (device.id === id) {
        return {
          ...device,
          name: tempDeviceName.trim(),
          backendUrl: tempDeviceUrl.trim(),
          apiKey: tempDeviceKey.trim(),
        };
      }
      return device;
    });

    const activeDevice = settings.selectedDevice?.id === id 
      ? updatedDevices.find(d => d.id === id)
      : settings.selectedDevice;

    const newSettings = {
      ...settings,
      devices: updatedDevices,
      selectedDevice: activeDevice,
    };

    setSettings(newSettings);
    setEditingDeviceId(null);

    await syncService.saveSettings(newSettings);
    Alert.alert('Success', 'Device configuration updated successfully.');
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all configurations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaults = {
              backendUrl: 'http://10.236.238.253:8001',
              apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
              autoSync: true,
              syncInterval: 5,
              notifyOnSync: true,
              compressData: true,
              maxRetries: 3,
              timeout: 30,
              totalSyncs: 0,
              lastSyncTime: null,
              dataTransferredBytes: 0,
              devices: undefined, // Let loadSettings restore hardcoded defaults
              selectedDevice: undefined,
            };
            await syncService.saveSettings(defaults);
            await syncService.loadSettings();
            
            setSettings({
              backendUrl: syncService.backendUrl,
              apiKey: syncService.apiKey,
              autoSync: syncService.autoSync,
              syncInterval: syncService.syncInterval,
              notifyOnSync: syncService.notifyOnSync,
              compressData: syncService.compressData,
              maxRetries: syncService.maxRetries,
              timeout: syncService.timeout,
              devices: syncService.getDevices(),
              selectedDevice: syncService.getSelectedDevice(),
            });
            
            Alert.alert('Reset Success', 'Settings reset to factory defaults.');
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    if (!settings.selectedDevice) {
      Alert.alert('Error', 'No active device selected.');
      return;
    }
    Alert.alert('Connection Test', `Pinging ${settings.selectedDevice.name} at ${settings.selectedDevice.backendUrl}...`);
    try {
      const isOnline = await syncService.pingDevice(settings.selectedDevice);
      if (isOnline) {
        Alert.alert('Success', `Connection to ${settings.selectedDevice.name} is active and verified!`);
      } else {
        Alert.alert('Failed', `Could not reach ${settings.selectedDevice.name}. Please check the server and network configuration.`);
      }
    } catch (err) {
      Alert.alert('Connection Failed', `Unable to connect: ${err.message}`);
    }
  };

  const renderSettingItem = (title, subtitle, iconName, rightComponent, showDivider = true) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconWrapper}>
        <Ionicons name={iconName} size={22} color={theme.textSub} />
      </View>
      <View style={styles.settingLeft}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.settingRight}>{rightComponent}</View>
      {showDivider && <View style={styles.settingDivider} />}
    </View>
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Ambient Glow */}
      <Animated.View 
        style={[
          styles.topOrb, 
          { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.06] }) }
        ]} 
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Preferences</Text>
        <Text style={styles.headerSubtitle}>Configure network and behavior</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Connection Settings */}
        {renderSection(
          'Sync Devices Configuration',
          <>
            {settings.devices && settings.devices.map((device, index) => {
              const isEditing = editingDeviceId === device.id;
              const isSelected = settings.selectedDevice?.id === device.id;
              return (
                <View key={device.id} style={styles.deviceItemContainer}>
                  <View style={styles.deviceItemHeader}>
                    <View style={styles.deviceItemLeft}>
                      <Ionicons
                        name={
                          device.type === 'desktop'
                            ? 'desktop-outline'
                            : device.type === 'laptop'
                            ? 'laptop-outline'
                            : 'tablet-portrait-outline'
                        }
                        size={20}
                        color={isSelected ? theme.primary : theme.textSub}
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.deviceItemName, isSelected && styles.selectedDeviceText]}>
                          {device.name} {isSelected && '(Active)'}
                        </Text>
                        <Text style={styles.deviceItemUrl} numberOfLines={1}>
                          {device.backendUrl}
                        </Text>
                      </View>
                    </View>
                    
                    {!isEditing && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingDeviceId(device.id);
                          setTempDeviceName(device.name);
                          setTempDeviceUrl(device.backendUrl);
                          setTempDeviceKey(device.apiKey);
                        }}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {isEditing && (
                    <View style={styles.deviceEditForm}>
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Device Name</Text>
                        <TextInput
                          style={styles.formInput}
                          value={tempDeviceName}
                          onChangeText={setTempDeviceName}
                          placeholder="e.g. Work Laptop"
                          placeholderTextColor={theme.textSub}
                        />
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Backend URL</Text>
                        <TextInput
                          style={styles.formInput}
                          value={tempDeviceUrl}
                          onChangeText={setTempDeviceUrl}
                          placeholder="http://..."
                          placeholderTextColor={theme.textSub}
                          autoCapitalize="none"
                          keyboardType="url"
                        />
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>API Authentication Key</Text>
                        <TextInput
                          style={styles.formInput}
                          value={tempDeviceKey}
                          onChangeText={setTempDeviceKey}
                          placeholder="Secret Sync Key"
                          placeholderTextColor={theme.textSub}
                          autoCapitalize="none"
                          secureTextEntry
                        />
                      </View>
                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[styles.formActionButton, styles.cancelButton]}
                          onPress={() => setEditingDeviceId(null)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.formActionButton, styles.saveDeviceButton]}
                          onPress={() => handleSaveDevice(device.id)}
                        >
                          <Text style={styles.saveButtonText}>Save Device</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {index < settings.devices.length - 1 && <View style={styles.settingDivider} />}
                </View>
              );
            })}
            
            <TouchableOpacity style={styles.testButton} onPress={handleTestConnection} activeOpacity={0.7}>
              <Ionicons name="pulse" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={styles.testButtonText}>Test Active Device Connection</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Sync Settings */}
        {renderSection(
          'Sync Behavior',
          <>
            {renderSettingItem(
              'Background Sync',
              'Keep data fresh automatically',
              'sync-outline',
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => updateSetting('autoSync', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            )}

            {settings.autoSync &&
              renderSettingItem(
                'Sync Frequency',
                `${settings.syncInterval} minutes interval`,
                'time-outline',
                <View style={styles.intervalContainer}>
                  <TouchableOpacity
                    style={styles.intervalButton}
                    onPress={() => updateSetting('syncInterval', Math.max(1, settings.syncInterval - 1))}
                  >
                    <Ionicons name="remove" size={18} color={theme.textMain} />
                  </TouchableOpacity>
                  <Text style={styles.intervalText}>{settings.syncInterval}</Text>
                  <TouchableOpacity
                    style={styles.intervalButton}
                    onPress={() => updateSetting('syncInterval', settings.syncInterval + 1)}
                  >
                    <Ionicons name="add" size={18} color={theme.textMain} />
                  </TouchableOpacity>
                </View>
              )}

            {renderSettingItem(
              'Push Notifications',
              'Alerts upon sync completion',
              'notifications-outline',
              <Switch
                value={settings.notifyOnSync}
                onValueChange={(value) => updateSetting('notifyOnSync', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            )}

            {renderSettingItem(
              'Data Compression',
              'Optimize bandwidth payload',
              'file-tray-full-outline',
              <Switch
                value={settings.compressData}
                onValueChange={(value) => updateSetting('compressData', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.primary }}
                thumbColor="#FFFFFF"
              />,
              false // No divider for last item
            )}
          </>
        )}

        {/* System Diagnostics */}
        {renderSection(
          'System Limits',
          <>
            {renderSettingItem(
              'Maximum Retries',
              `${settings.maxRetries} connection attempts`,
              'repeat-outline',
              <View style={styles.intervalContainer}>
                <TouchableOpacity style={styles.intervalButton} onPress={() => updateSetting('maxRetries', Math.max(1, settings.maxRetries - 1))}>
                  <Ionicons name="remove" size={18} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.intervalText}>{settings.maxRetries}</Text>
                <TouchableOpacity style={styles.intervalButton} onPress={() => updateSetting('maxRetries', settings.maxRetries + 1)}>
                  <Ionicons name="add" size={18} color={theme.textMain} />
                </TouchableOpacity>
              </View>
            )}

            {renderSettingItem(
              'Timeout Threshold',
              `${settings.timeout} seconds wait time`,
              'hourglass-outline',
              <View style={styles.intervalContainer}>
                <TouchableOpacity style={styles.intervalButton} onPress={() => updateSetting('timeout', Math.max(5, settings.timeout - 5))}>
                  <Ionicons name="remove" size={18} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.intervalText}>{settings.timeout}</Text>
                <TouchableOpacity style={styles.intervalButton} onPress={() => updateSetting('timeout', settings.timeout + 5)}>
                  <Ionicons name="add" size={18} color={theme.textMain} />
                </TouchableOpacity>
              </View>,
              false
            )}
          </>
        )}

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleResetSettings} activeOpacity={0.7}>
            <Ionicons name="warning-outline" size={20} color={theme.error} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>Reset Factory Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>ENVY SYNC CORE v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>System Protocol Alpha</Text>
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
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
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
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 18,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textMain,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: theme.textSub,
  },
  settingRight: {
    marginLeft: 12,
  },
  settingDivider: {
    position: 'absolute',
    bottom: 0,
    left: 64, // Align with text instead of edge
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  editButtonText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    width: 140,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.textMain,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: theme.primary,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'rgba(228, 77, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(228, 77, 38, 0.3)',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 14,
    color: theme.textMain,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  dangerZone: {
    marginTop: 10,
    marginBottom: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSub,
    letterSpacing: 1,
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  deviceItemContainer: {
    padding: 16,
    paddingVertical: 18,
  },
  deviceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  deviceItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 4,
  },
  selectedDeviceText: {
    color: theme.primary,
  },
  deviceItemUrl: {
    fontSize: 12,
    color: theme.textSub,
  },
  deviceEditForm: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSub,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.textMain,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  formActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: theme.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  saveDeviceButton: {
    backgroundColor: theme.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});