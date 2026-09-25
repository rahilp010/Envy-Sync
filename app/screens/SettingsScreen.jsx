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
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';
import updateService, {
  CURRENT_APP_VERSION,
  CURRENT_VERSION_CODE,
} from '../services/updateService';
import { useToast } from '../components/Toast';

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
  dangerBg: 'rgba(248, 113, 113, 0.1)',
  dangerBorder: 'rgba(248, 113, 113, 0.2)',
};

export const SettingsScreen = ({ onLogout, onCheckUpdate }) => {
  const { showToast } = useToast();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [settings, setSettings] = useState({
    backendUrl: 'https://envy-erp.vercel.app',
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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleChangePassword = async () => {
    setPassError('');
    setPassSuccess('');
    if (!currentPassInput || !newPassInput) {
      const msg = 'Please fill out all password fields.';
      setPassError(msg);
      showToast(msg, 'warning');
      return;
    }
    const res = await syncService.changePassword(currentPassInput, newPassInput);
    if (res.success) {
      setPassSuccess('Password changed successfully!');
      showToast('Password changed successfully!', 'success');
      setCurrentPassInput('');
      setNewPassInput('');
      setTimeout(() => setShowPasswordModal(false), 1200);
    } else {
      const msg = res.error || 'Failed to change password.';
      setPassError(msg);
      showToast(msg, 'error');
    }
  };

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    showToast('Checking server for updates...', 'info');
    try {
      const result = await updateService.checkForUpdates(true);
      setCheckingUpdate(false);
      if (result.hasUpdate && result.updateInfo) {
        if (onCheckUpdate) {
          onCheckUpdate(result.updateInfo);
        } else {
          showToast(`Update v${result.updateInfo.version} is available!`, 'success');
        }
      } else {
        showToast(`You are using the latest version (v${CURRENT_APP_VERSION}).`, 'success');
      }
    } catch (err) {
      setCheckingUpdate(false);
      showToast('Could not reach update server.', 'error');
    }
  };

  const handleLockApp = async () => {
    await syncService.logout();
    if (onLogout) onLogout();
  };

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
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await syncService.saveSettings(updated);
  };

  const handleSaveDevice = async id => {
    if (
      !tempDeviceName.trim() ||
      !tempDeviceUrl.trim() ||
      !tempDeviceKey.trim()
    ) {
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

    const activeDevice =
      settings.selectedDevice?.id === id
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
              backendUrl: 'https://electron-by-envy.vercel.app/',
              apiKey:
                '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
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
      ],
    );
  };

  const handleTestConnection = async () => {
    if (!settings.selectedDevice) {
      Alert.alert('Error', 'No active device selected.');
      return;
    }
    Alert.alert(
      'Connection Test',
      `Pinging ${settings.selectedDevice.name} at ${settings.selectedDevice.backendUrl}...`,
    );
    try {
      const isOnline = await syncService.pingDevice(settings.selectedDevice);
      if (isOnline) {
        Alert.alert(
          'Success',
          `Connection to ${settings.selectedDevice.name} is active and verified!`,
        );
      } else {
        Alert.alert(
          'Failed',
          `Could not reach ${settings.selectedDevice.name}. Please check the server and network configuration.`,
        );
      }
    } catch (err) {
      Alert.alert('Connection Failed', `Unable to connect: ${err.message}`);
    }
  };

  const renderSettingItem = (
    title,
    subtitle,
    iconName,
    rightComponent,
    showDivider = true,
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconWrapper}>
        <Ionicons name={iconName} size={20} color={theme.textSub} />
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
      {/* Background Ambient Glow */}
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Preferences</Text>
        <Text style={styles.headerSubtitle}>
          Configure network and behavior
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Settings */}
        {renderSection(
          'Sync Devices Configuration',
          <>
            {settings.devices &&
              settings.devices.map((device, index) => {
                const isEditing = editingDeviceId === device.id;
                const isSelected = settings.selectedDevice?.id === device.id;
                return (
                  <View key={device.id} style={styles.deviceItemContainer}>
                    <View style={styles.deviceItemHeader}>
                      <View style={styles.deviceItemLeft}>
                        <View
                          style={[
                            styles.deviceIconBadge,
                            isSelected && {
                              backgroundColor: 'rgba(218, 244, 170, 0.1)',
                              borderColor: 'rgba(218, 244, 170, 0.2)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              device.type === 'desktop'
                                ? 'desktop-outline'
                                : device.type === 'laptop'
                                ? 'laptop-outline'
                                : 'tablet-portrait-outline'
                            }
                            size={18}
                            color={isSelected ? theme.primary : theme.textSub}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.deviceItemName,
                              isSelected && styles.selectedDeviceText,
                            ]}
                          >
                            {device.name} {isSelected && '(Active)'}
                          </Text>
                          <Text style={styles.deviceItemUrl} numberOfLines={1}>
                            {device.backendUrl}
                          </Text>
                        </View>
                      </View>

                      {!isEditing && (
                        <TouchableOpacity
                          style={styles.editBtn}
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
                            placeholderTextColor={theme.textMuted}
                          />
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>Backend URL</Text>
                          <TextInput
                            style={styles.formInput}
                            value={tempDeviceUrl}
                            onChangeText={setTempDeviceUrl}
                            placeholder="http://..."
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                            keyboardType="url"
                          />
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>
                            API Authentication Key
                          </Text>
                          <TextInput
                            style={styles.formInput}
                            value={tempDeviceKey}
                            onChangeText={setTempDeviceKey}
                            placeholder="Secret Sync Key"
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                            secureTextEntry
                          />
                        </View>
                        <View style={styles.formActions}>
                          <TouchableOpacity
                            style={[
                              styles.formActionButton,
                              styles.cancelButton,
                            ]}
                            onPress={() => setEditingDeviceId(null)}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.formActionButton,
                              styles.saveDeviceButton,
                            ]}
                            onPress={() => handleSaveDevice(device.id)}
                          >
                            <Text style={styles.saveButtonText}>
                              Save Device
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {index < settings.devices.length - 1 && (
                      <View style={styles.settingDivider} />
                    )}
                  </View>
                );
              })}

            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestConnection}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pulse"
                size={18}
                color={theme.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.testButtonText}>Test Active Connection</Text>
            </TouchableOpacity>
          </>,
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
                onValueChange={value => updateSetting('autoSync', value)}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: theme.primary,
                }}
                thumbColor="#16161b"
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />,
            )}

            {settings.autoSync &&
              renderSettingItem(
                'Sync Frequency',
                `${settings.syncInterval} min interval`,
                'time-outline',
                <View style={styles.intervalContainer}>
                  <TouchableOpacity
                    style={styles.intervalButton}
                    onPress={() =>
                      updateSetting(
                        'syncInterval',
                        Math.max(1, settings.syncInterval - 1),
                      )
                    }
                  >
                    <Ionicons name="remove" size={16} color={theme.textMain} />
                  </TouchableOpacity>
                  <Text style={styles.intervalText}>
                    {settings.syncInterval}
                  </Text>
                  <TouchableOpacity
                    style={styles.intervalButton}
                    onPress={() =>
                      updateSetting('syncInterval', settings.syncInterval + 1)
                    }
                  >
                    <Ionicons name="add" size={16} color={theme.textMain} />
                  </TouchableOpacity>
                </View>,
              )}

            {renderSettingItem(
              'Push Notifications',
              'Alerts upon completion',
              'notifications-outline',
              <Switch
                value={settings.notifyOnSync}
                onValueChange={value => updateSetting('notifyOnSync', value)}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: theme.primary,
                }}
                thumbColor="#16161b"
              />,
            )}

            {renderSettingItem(
              'Data Compression',
              'Optimize bandwidth payload',
              'file-tray-full-outline',
              <Switch
                value={settings.compressData}
                onValueChange={value => updateSetting('compressData', value)}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: theme.primary,
                }}
                thumbColor="#16161b"
              />,
              false, // No divider for last item
            )}
          </>,
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
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() =>
                    updateSetting(
                      'maxRetries',
                      Math.max(1, settings.maxRetries - 1),
                    )
                  }
                >
                  <Ionicons name="remove" size={16} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.intervalText}>{settings.maxRetries}</Text>
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() =>
                    updateSetting('maxRetries', settings.maxRetries + 1)
                  }
                >
                  <Ionicons name="add" size={16} color={theme.textMain} />
                </TouchableOpacity>
              </View>,
            )}

            {renderSettingItem(
              'Timeout Threshold',
              `${settings.timeout} seconds wait time`,
              'hourglass-outline',
              <View style={styles.intervalContainer}>
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() =>
                    updateSetting('timeout', Math.max(5, settings.timeout - 5))
                  }
                >
                  <Ionicons name="remove" size={16} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.intervalText}>{settings.timeout}</Text>
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() => updateSetting('timeout', settings.timeout + 5)}
                >
                  <Ionicons name="add" size={16} color={theme.textMain} />
                </TouchableOpacity>
              </View>,
              false,
            )}
          </>,
        )}

        {/* Security & Access */}
        {renderSection(
          'Security & Key Access',
          <>
            {renderSettingItem(
              'Active Key',
              `${settings.apiKey ? settings.apiKey.substring(0, 16) + '...' : 'Not Set'}`,
              'key-outline',
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>ISOLATED</Text>
              </View>,
            )}
            {renderSettingItem(
              'Change Password',
              'Update app access password (default: envy)',
              'lock-closed-outline',
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setPassError('');
                  setPassSuccess('');
                  setShowPasswordModal(!showPasswordModal);
                }}
              >
                <Text style={styles.editButtonText}>
                  {showPasswordModal ? 'Close' : 'Change'}
                </Text>
              </TouchableOpacity>,
            )}

            {showPasswordModal && (
              <View style={styles.deviceEditForm}>
                {passError ? (
                  <Text style={styles.errorTextInline}>{passError}</Text>
                ) : null}
                {passSuccess ? (
                  <Text style={styles.successTextInline}>{passSuccess}</Text>
                ) : null}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Current Password</Text>
                  <TextInput
                    style={styles.formInput}
                    value={currentPassInput}
                    onChangeText={setCurrentPassInput}
                    placeholder="Current password (default: envy)"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>New Password</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPassInput}
                    onChangeText={setNewPassInput}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formActionButton, styles.saveDeviceButton]}
                    onPress={handleChangePassword}
                  >
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {renderSettingItem(
              'Lock App Session',
              'Requires Activation Key & Password at startup',
              'log-out-outline',
              <TouchableOpacity style={styles.editBtn} onPress={handleLockApp}>
                <Text style={[styles.editButtonText, { color: theme.error }]}>
                  Lock App
                </Text>
              </TouchableOpacity>,
              false,
            )}
          </>,
        )}

        {/* Application Updates */}
        {renderSection(
          'Application Updates',
          <>
            {renderSettingItem(
              'Current Installed Version',
              `v${CURRENT_APP_VERSION} (Build ${CURRENT_VERSION_CODE})`,
              'information-circle-outline',
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>UP TO DATE</Text>
              </View>,
            )}
            {renderSettingItem(
              'Check for Updates',
              'Connect to server and search for new release',
              'cloud-download-outline',
              <TouchableOpacity
                style={styles.editBtn}
                onPress={handleManualCheckUpdate}
                disabled={checkingUpdate}
              >
                {checkingUpdate ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={styles.editButtonText}>Check Now</Text>
                )}
              </TouchableOpacity>,
              false,
            )}
          </>,
        )}

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetSettings}
            activeOpacity={0.7}
          >
            <Ionicons
              name="warning-outline"
              size={18}
              color={theme.error}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.dangerButtonText}>Reset Factory Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>ENVY SYNC CORE v{CURRENT_APP_VERSION}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textMain,
    marginBottom: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#16161b',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 4,
    letterSpacing: 0.2,
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
    left: 70, // Align with text
    right: 16,
    height: 1,
    backgroundColor: theme.cardBorder,
  },

  // Custom button overrides
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#16161b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  editButtonText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
  },

  testButton: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'rgba(218, 244, 170, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(218, 244, 170, 0.2)',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 2,
  },
  intervalButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 13,
    color: theme.textMain,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  dangerZone: {
    marginTop: 8,
    marginBottom: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: theme.dangerBg,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: '700',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSub,
    letterSpacing: 1,
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 10,
    color: theme.textMuted,
    textTransform: 'uppercase',
  },

  // Device Edit Section overrides
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
  deviceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#16161b',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textMain,
    marginBottom: 4,
    letterSpacing: 0.2,
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
    padding: 16,
    backgroundColor: '#16161b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSub,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    height: 44,
    backgroundColor: theme.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: theme.textMain,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  formActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
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
    color: theme.primaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  errorTextInline: {
    color: theme.error,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  successTextInline: {
    color: theme.success,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
});
