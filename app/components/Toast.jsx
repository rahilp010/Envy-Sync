import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const ToastContext = createContext({
  showToast: (message, type = 'info', duration = 3500) => {},
  hideToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const toastTypes = {
  error: {
    bg: '#2d1818',
    border: 'rgba(248, 113, 113, 0.4)',
    icon: 'alert-circle',
    iconColor: '#f87171',
    textColor: '#fca5a5',
  },
  warning: {
    bg: '#2d2414',
    border: 'rgba(251, 191, 36, 0.4)',
    icon: 'warning',
    iconColor: '#fbbf24',
    textColor: '#fde68a',
  },
  success: {
    bg: '#142a1e',
    border: 'rgba(52, 211, 153, 0.4)',
    icon: 'checkmark-circle',
    iconColor: '#34d399',
    textColor: '#a7f3d0',
  },
  info: {
    bg: '#162232',
    border: 'rgba(96, 165, 250, 0.4)',
    icon: 'information-circle',
    iconColor: '#60a5fa',
    textColor: '#bfdbfe',
  },
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  }, [opacityAnim, slideAnim]);

  const showToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      if (!message) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      setToast({ visible: true, message, type });

      slideAnim.setValue(-100);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacityAnim, slideAnim],
  );

  const config = toastTypes[toast.type] || toastTypes.info;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.toastCard,
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <Ionicons
              name={config.icon}
              size={22}
              color={config.iconColor}
              style={styles.icon}
            />
            <Text style={[styles.messageText, { color: config.textColor }]}>
              {toast.message}
            </Text>
            <TouchableOpacity
              onPress={hideToast}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={config.iconColor} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  icon: {
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ToastProvider;
