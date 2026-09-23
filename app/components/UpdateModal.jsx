import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import updateService, { CURRENT_APP_VERSION } from '../services/updateService';
import { useToast } from './Toast';

const theme = {
  background: '#16161b',
  cardBg: '#24242d',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  textMain: '#ffffff',
  textSub: '#9ca3af',
  primary: '#daf4aa',
  primaryDark: '#b5dd75',
  primaryText: '#16161b',
  error: '#f87171',
  success: '#34d399',
};

export const UpdateModal = ({ visible, updateInfo, onClose, onInstalled }) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState('0 MB');
  const [totalBytes, setTotalBytes] = useState('0 MB');
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [downloadedPath, setDownloadedPath] = useState(null);

  if (!updateInfo) return null;

  const formatSize = bytes => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleStartDownload = async () => {
    try {
      setDownloading(true);
      setProgress(0);

      const filePath = await updateService.downloadApk(info => {
        setProgress(info.percentage);
        setDownloadedBytes(formatSize(info.bytesWritten));
        setTotalBytes(formatSize(info.contentLength));
      });

      setDownloading(false);
      setReadyToInstall(true);
      setDownloadedPath(filePath);
      showToast('APK Downloaded! Ready to install.', 'success');

      // Auto trigger installation
      handleInstall(filePath);
    } catch (err) {
      setDownloading(false);
      const errMsg = err.message || 'Failed to download update.';
      showToast(errMsg, 'error');
      Alert.alert('Download Error', errMsg);
    }
  };

  const handleInstall = async path => {
    try {
      const target = path || downloadedPath;
      await updateService.installApk(target);
      if (onInstalled) onInstalled();
    } catch (err) {
      showToast(err.message || 'Installation process triggered.', 'info');
    }
  };

  const handleDismiss = async () => {
    if (updateInfo.version) {
      await updateService.dismissUpdate(updateInfo.version);
    }
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!updateInfo.mandatory && !downloading) {
          handleDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top Banner Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download-outline" size={32} color={theme.primaryText} />
          </View>

          {/* Header */}
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.subtitle}>
            A new version of Envy Sync is ready to install.
          </Text>

          {/* Version Pills */}
          <View style={styles.versionRow}>
            <View style={styles.versionBadgeCurrent}>
              <Text style={styles.versionBadgeTextCurrent}>
                Current: v{CURRENT_APP_VERSION}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.textSub} style={{ marginHorizontal: 8 }} />
            <View style={styles.versionBadgeNew}>
              <Text style={styles.versionBadgeTextNew}>
                New: v{updateInfo.version}
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          <Text style={styles.notesHeader}>WHAT'S NEW</Text>
          <ScrollView
            style={styles.notesContainer}
            contentContainerStyle={styles.notesContent}
            showsVerticalScrollIndicator={false}
          >
            {updateInfo.releaseNotes && updateInfo.releaseNotes.length > 0 ? (
              updateInfo.releaseNotes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noteText}>Performance optimizations and bug fixes.</Text>
            )}
          </ScrollView>

          {/* Download Progress Bar */}
          {downloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>Downloading update...</Text>
                <Text style={styles.progressPercentage}>{progress}%</Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressSubtext}>
                {downloadedBytes} / {totalBytes || updateInfo.fileSize || '15 MB'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {!updateInfo.mandatory && !downloading && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}

            {!readyToInstall ? (
              <TouchableOpacity
                style={[
                  styles.updateButton,
                  updateInfo.mandatory && { flex: 1 },
                  downloading && styles.disabledButton,
                ]}
                onPress={handleStartDownload}
                disabled={downloading}
                activeOpacity={0.8}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={theme.primaryText} style={{ marginRight: 6 }} />
                    <Text style={styles.updateButtonText}>Update Now</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.updateButton, { flex: 1 }]}
                onPress={() => handleInstall()}
                activeOpacity={0.8}
              >
                <Ionicons name="build-outline" size={18} color={theme.primaryText} style={{ marginRight: 6 }} />
                <Text style={styles.updateButtonText}>Install APK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: theme.cardBg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textMain,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSub,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  versionBadgeCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  versionBadgeTextCurrent: {
    fontSize: 12,
    color: theme.textSub,
    fontWeight: '600',
  },
  versionBadgeNew: {
    backgroundColor: 'rgba(218, 244, 170, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(218, 244, 170, 0.3)',
  },
  versionBadgeTextNew: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700',
  },
  notesHeader: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSub,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesContainer: {
    width: '100%',
    maxHeight: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  notesContent: {
    paddingVertical: 4,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.textMain,
    lineHeight: 18,
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: theme.textSub,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 11,
    color: theme.textSub,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSub,
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.primaryText,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default UpdateModal;
