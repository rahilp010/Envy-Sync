import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

const theme = {
  background: '#16161b',
  cardBg: '#24242d',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  textMain: '#ffffff',
  textSub: '#9ca3af',
  textMuted: '#6b7280',
  primary: '#daf4aa',
  primaryText: '#16161b',
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  accentBlue: '#60a5fa',
};

/**
 * Format key string to match Electron activation.html (XXXX-XXXX-XXXX-XXXX)
 */
const formatKey = (rawText) => {
  if (!rawText) {
    return { formatted: '', count: 0, max: 16, isValid: false };
  }

  const clean = rawText.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // If long 64-character API key
  if (clean.length > 20) {
    const is64 = clean.length === 64;
    return {
      formatted: clean,
      count: clean.length,
      max: 64,
      isValid: is64,
    };
  }

  // Standard 16-character license key format: XXXX-XXXX-XXXX-XXXX
  const parts = [];
  for (let i = 0; i < clean.length && i < 16; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  const formatted = parts.join('-');
  const count = Math.min(clean.length, 16);

  return {
    formatted,
    count,
    max: 16,
    isValid: count === 16,
  };
};

export const AuthScreen = ({ onAuthenticated }) => {
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const keyMeta = formatKey(activationKeyInput);

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
        useNativeDriver: true,
      }),
    ]).start();

    const loadDefaults = async () => {
      await syncService.loadSettings();
      // Ensure activation key & password fields remain completely empty on load/redirect
      setActivationKeyInput('');
      setPassword('');
      setErrorMsg('');
      setBackendUrl(syncService.backendUrl || '');
    };
    loadDefaults();
  }, [fadeAnim, slideAnim]);

  const handleKeyChange = (text) => {
    setErrorMsg('');
    const meta = formatKey(text);
    setActivationKeyInput(meta.formatted);
  };

  const handleClearKey = () => {
    setErrorMsg('');
    setActivationKeyInput('');
  };

  const handleUnlock = async () => {
    setErrorMsg('');
    if (!activationKeyInput.trim()) {
      setErrorMsg('Please enter your Activation Key.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH-SCREEN] Submitting key to syncService...');
      const result = await syncService.authenticate(activationKeyInput.trim(), password);
      if (result.success) {
        onAuthenticated();
      } else {
        console.warn('[AUTH-SCREEN] Authentication failed:', result.error);
        setErrorMsg(result.error || 'Invalid Activation Key or password.');
      }
    } catch (err) {
      console.error('[AUTH-SCREEN] Auth Exception:', err);
      setErrorMsg(err.message || 'Authentication failed due to a system error.');
    } finally {
      setLoading(false);
    }
  };

  const isLocalServer = backendUrl.includes('localhost') || 
                        backendUrl.includes('127.0.0.1') || 
                        backendUrl.includes('10.') || 
                        backendUrl.includes('192.168.');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Ambient Orbs */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Logo / Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="key-outline" size={24} color={theme.primaryText} />
            </View>
            <Text style={styles.title}>ENVY SYNC</Text>
            <Text style={styles.subtitle}>
              Enter your License Activation Key to connect
            </Text>
          </View>

          {/* Info Notice */}
          <View style={styles.noticeBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
            <Text style={styles.noticeText}>
              Validates key with <Text style={{ fontWeight: '700', color: theme.primary }}>Electron Backend</Text>. Default password is <Text style={{ fontWeight: '800', color: theme.primary }}>envy</Text>.
            </Text>
          </View>

          {/* Server Endpoint Badge */}
          <View style={styles.serverBadgeRow}>
            <Ionicons
              name={isLocalServer ? 'desktop-outline' : 'cloud-outline'}
              size={14}
              color={isLocalServer ? theme.success : theme.accentBlue}
            />
            <Text style={styles.serverBadgeText}>
              Target: <Text style={styles.serverUrlText}>{backendUrl || 'Default Backend'}</Text> ({isLocalServer ? 'Local Server' : 'Cloud Remote'})
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Inputs Form */}
          <View style={styles.form}>
            {/* Activation Key Field */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>LICENSE ACTIVATION KEY</Text>
                <Text
                  style={[
                    styles.charCount,
                    keyMeta.isValid && styles.charCountValid,
                  ]}
                >
                  {keyMeta.count} / {keyMeta.max}
                </Text>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  keyMeta.isValid && styles.inputWrapperValid,
                  errorMsg ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="hardware-chip-outline"
                  size={18}
                  color={keyMeta.isValid ? theme.success : theme.textSub}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.keyInputFont,
                    keyMeta.isValid && styles.keyInputValid,
                  ]}
                  value={activationKeyInput}
                  onChangeText={handleKeyChange}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={64}
                />
                {activationKeyInput.length > 0 && (
                  <TouchableOpacity onPress={handleClearKey} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.textSub}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter Password (default: envy)"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.textSub}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleUnlock}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.primaryText} size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Validate & Activate</Text>
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={theme.primaryText}
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-20%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#60a5fa',
    opacity: 0.05,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: theme.textMain,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textSub,
    marginTop: 4,
    textAlign: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(218, 244, 170, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218, 244, 170, 0.2)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: theme.textSub,
    lineHeight: 17,
  },
  serverBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  serverBadgeText: {
    fontSize: 11,
    color: theme.textSub,
  },
  serverUrlText: {
    color: theme.textMain,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: theme.error,
    fontWeight: '600',
    lineHeight: 17,
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSub,
    letterSpacing: 0.6,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  charCountValid: {
    color: theme.success,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperValid: {
    borderColor: 'rgba(52, 211, 153, 0.4)',
    backgroundColor: 'rgba(52, 211, 153, 0.04)',
  },
  inputWrapperError: {
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.textMain,
    fontSize: 14,
    height: '100%',
  },
  keyInputFont: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  keyInputValid: {
    color: theme.success,
  },
  clearBtn: {
    padding: 4,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.primary,
    height: 48,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: {
    color: theme.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AuthScreen;

