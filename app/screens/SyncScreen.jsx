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
  background: '#000000',
  textMain: '#FFFFFF',
  textSub: '#888888',
  primary: '#E44D26', // Copper/Red from images
  primaryDark: '#A33216',
  success: '#30D158',
  error: '#FF453A',
  buttonPlatform: '#050505',
  buttonBg: '#101010',
  buttonBorder: '#222222',
  shadowPrimary: '#E44D26',
};

export const SyncScreen = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to securely sync');

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

    startIdleBreathing();
  }, []);

  const startIdleBreathing = () => {
    // Staggered breathing loops for the different orb layers to make it look organic
    const createBreathingLoop = (animValue, scaleTo, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: scaleTo, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 1, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
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
        Animated.timing(orbScale1, { toValue: 1.3, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale1, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale2, { toValue: 1.5, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale2, { toValue: 1, duration: 1000, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    try {
      await syncService.loadSettings();
      setStatusMessage('Syncing database...');
      const result = await syncService.performSync();
      if (result.success) {
        setStatusMessage('Sync complete');
      } else {
        setStatusMessage('Sync failed');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(`Sync failed: ${err.message}`);
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

  const scalePulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });
  
  const opacityPulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

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
      {/* Abstract Top Glow similar to reference images */}
      <Animated.View style={[styles.topOrb, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.2] }) }]} />

      <View style={styles.header}>
        <Text style={styles.titleText}>ENVY SYNC</Text>
        <Text style={styles.subtitleText}>An intelligent system that aligns your time, tasks, and cognitive load.</Text>
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
          <Animated.View style={[styles.orbContainer, { transform: [{ scale: buttonScale }] }]}>
            
            {/* Outer Glow Layer */}
            <Animated.View 
              style={[
                styles.orbLayer, 
                styles.orbOuter, 
                { transform: [{ scale: orbScale2 }] }
              ]} 
            />
            
            {/* Middle Glow Layer */}
            <Animated.View 
              style={[
                styles.orbLayer, 
                styles.orbMiddle, 
                { transform: [{ scale: orbScale1 }] }
              ]} 
            />
            
            {/* Inner Core Layer with Text */}
            <Animated.View 
              style={[
                styles.orbLayer, 
                styles.orbCore, 
                { transform: [{ scale: orbScale3 }] },
                isSyncing && styles.orbCoreActive
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <Text style={styles.syncButtonText}>Get Started</Text>
              )}
            </Animated.View>

          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.statusText}>{statusMessage}</Text>
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
  topOrb: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.primary,
    filter: 'blur(40px)',
  },
  header: {
    marginTop: 100,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '500',
    color: theme.textMain,
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 14,
    color: theme.textSub,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(228, 77, 38, 0.05)',
  },
  orbMiddle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(228, 77, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(228, 77, 38, 0.3)',
  },
  orbCore: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(228, 77, 38, 0.25)',
    borderWidth: 1.5,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  orbCoreActive: {
    backgroundColor: 'rgba(228, 77, 38, 0.4)',
    borderColor: '#FFFFFF',
  },
  syncButtonText: {
    color: theme.textMain,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusText: {
    marginTop: 60,
    color: theme.textSub,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  buttonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  syncButton: {
    width: 250,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});