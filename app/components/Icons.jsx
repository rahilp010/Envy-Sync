import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const DatabaseIcon = ({ size = 24, color = '#888888' }) => (
  <Ionicons name="server-outline" size={size} color={color} />
);

export const SyncIcon = ({ size = 24, color = '#888888' }) => (
  <Ionicons name="sync-outline" size={size} color={color} />
);

export const HomeIcon = ({ size = 24, color = '#888888' }) => (
  <Ionicons name="home-outline" size={size} color={color} />
);

export const SettingsIcon = ({ size = 24, color = '#888888' }) => (
  <Ionicons name="settings-outline" size={size} color={color} />
);

export const TableIcon = ({ size = 24, color = '#888888' }) => (
  <Ionicons name="grid-outline" size={size} color={color} />
);
