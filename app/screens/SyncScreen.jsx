import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

const theme = {
  background: '#16161b',
  textMain: '#ffffff',
  textSub: '#9ca3af',
  primary: '#daf4aa',
  primaryDark: '#cbe699',
  buttonText: '#16161b',
  shadowPrimary: '#daf4aa',
};

export const SyncScreen = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to securely sync');
  const [lastSyncTime, setLastSyncTime] = useState('Never synced');
  const [dbVersion, setDbVersion] = useState(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const orbScale1 = useRef(new Animated.Value(1)).current;
  const orbScale2 = useRef(new Animated.Value(1)).current;
  const orbScale3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial Fade In
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const loadStats = async () => {
      await syncService.loadSettings();
      setLastSyncTime(syncService.formatLastSyncTime());
    };
    loadStats();

    startIdleBreathing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startIdleBreathing = () => {
    // Staggered breathing loops for the different orb layers to make it look organic
    const createBreathingLoop = (animValue, scaleTo, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: scaleTo,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createBreathingLoop(orbScale1, 1.15, 2500).start();
    createBreathingLoop(orbScale2, 1.25, 3000).start();
    createBreathingLoop(orbScale3, 1.08, 2000).start();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMessage('Establishing link...');

    // Speed up animations for syncing state
    orbScale1.stopAnimation();
    orbScale2.stopAnimation();
    orbScale3.stopAnimation();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale1, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale1, {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale2, {
          toValue: 1.5,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale2, {
          toValue: 1,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    try {
      await syncService.loadSettings();
      const result = await syncService.performSync(status => {
        setStatusMessage(status);
      });
      if (result.success) {
        setStatusMessage('Sync Complete');
        setLastSyncTime('Just now');
        if (result.version !== undefined) {
          setDbVersion(result.version);
        }
      } else {
        setStatusMessage('Sync Failed');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(`Sync Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);

      // Reset to idle breathing
      orbScale1.stopAnimation();
      orbScale2.stopAnimation();
      orbScale1.setValue(1);
      orbScale2.setValue(1);
      startIdleBreathing();
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.85,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

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
        <Text style={styles.titleText}>ENVY SYNC</Text>
        <Text style={styles.subtitleText}>
          An intelligent system that aligns your time, tasks, and cognitive
          load.
        </Text>
      </View>

      <View style={styles.centerContainer}>
        <TouchableOpacity
          onPress={handleSync}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isSyncing}
          activeOpacity={1}
          style={styles.touchableWrapper}
        >
          <Animated.View
            style={[
              styles.orbContainer,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            {/* Outer Glow Layer */}
            <Animated.View
              style={[
                styles.orbLayer,
                styles.orbOuter,
                { transform: [{ scale: orbScale2 }] },
              ]}
            />

            {/* Middle Glow Layer */}
            <Animated.View
              style={[
                styles.orbLayer,
                styles.orbMiddle,
                { transform: [{ scale: orbScale1 }] },
              ]}
            />

            {/* Inner Core Layer with Text */}
            <Animated.View
              style={[
                styles.orbLayer,
                styles.orbCore,
                { transform: [{ scale: orbScale3 }] },
                isSyncing && styles.orbCoreActive,
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator color={theme.buttonText} size="large" />
              ) : (
                <Text style={styles.syncButtonText}>Get Started</Text>
              )}
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.statusText}>{statusMessage}</Text>
        {lastSyncTime ? (
          <Text style={styles.metaText}>Last synced: {lastSyncTime}</Text>
        ) : null}
        {dbVersion !== null ? (
          <Text style={styles.metaText}>Version: {dbVersion}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 28,
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
    bottom: '20%',
    right: '-20%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#6366f1',
    opacity: 0.05,
    transform: [{ scale: 1.5 }],
  },
  header: {
    marginTop: 100,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '300',
    color: theme.textMain,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: theme.textSub,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Space for dock
  },
  touchableWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbLayer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(218, 244, 170, 0.05)',
  },
  orbMiddle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(218, 244, 170, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(218, 244, 170, 0.3)',
  },
  orbCore: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  orbCoreActive: {
    backgroundColor: theme.primaryDark,
  },
  syncButtonText: {
    color: theme.buttonText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 60,
    color: theme.textSub,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  metaText: {
    marginTop: 8,
    color: theme.textSub,
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
