import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Easing,
} from 'react-native';

const { width } = Dimensions.get('window');

const theme = {
  background: '#000000',
  dockBg: 'rgba(15, 15, 15, 0.85)',
  dockBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#E44D26', // Copper/Red accent
  primaryGlow: 'rgba(228, 77, 38, 0.15)',
  textSub: '#666666',
};

const FloatingDock = ({ items, onItemPress, activeItem }) => {
  // Scale animations for individual items
  const [scaleAnims] = useState(items.map(() => new Animated.Value(1)));

  // Entrance animations for the entire dock
  const slideUpAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth entrance when the app loads
    Animated.parallel([
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = index => {
    Animated.spring(scaleAnims[index], {
      toValue: 1.15, // Refined scale for a professional, weighty feel
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = index => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideUpAnim }],
        },
      ]}
    >
      <View style={styles.dock}>
        {items.map((item, index) => {
          const isActive = activeItem === item.id;
          const scale = scaleAnims[index];
          const iconColor = isActive ? theme.primary : theme.textSub;

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onItemPress(item)}
              onPressIn={() => handlePressIn(index)}
              onPressOut={() => handlePressOut(index)}
              activeOpacity={1}
              style={styles.dockItemContainer}
            >
              <Animated.View
                style={[styles.dockItem, { transform: [{ scale }] }]}
              >
                {/* Subtle glassmorphic glow behind the active icon */}
                {isActive && <View style={styles.activeGlowBackground} />}

                {/* Clone the icon to inject dynamic color and slight size bump for active state */}
                {React.cloneElement(item.icon, {
                  color: iconColor,
                  size: isActive ? 24 : 22,
                })}

                {/* Active Indicator Dot */}
                {isActive && <View style={styles.activeIndicator} />}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: theme.dockBg,
    borderRadius: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.dockBorder,
    justifyContent: 'space-between',
    width: width * 0.85,
    // Deep premium shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  dockItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItem: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeGlowBackground: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primaryGlow,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default FloatingDock;
