import { NativeModules, Platform } from 'react-native';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

let RNFS = null;
const getRNFS = () => {
  if (!RNFS) {
    try {
      RNFS = require('@dr.pogodin/react-native-fs');
    } catch (e) {
      console.error('Failed to load RNFS in UpdateService:', e);
    }
  }
  return RNFS;
};

export const CURRENT_APP_VERSION = '1.0.1';
export const CURRENT_VERSION_CODE = 1;

class UpdateService {
  constructor() {
    this.updateInfo = null;
    this.isDownloading = false;
    this.downloadProgress = 0;
    this.downloadedBytes = 0;
    this.totalBytes = 0;
    this.downloadedFilePath = null;
    this.dismissedVersion = null;
    this.lastCheckTime = null;
  }

  // Load saved update configuration
  async init() {
    const fs = getRNFS();
    if (!fs) return;
    try {
      const configPath = `${fs.DocumentDirectoryPath}/update_config.json`;
      const exists = await fs.exists(configPath);
      if (exists) {
        const content = await fs.readFile(configPath, 'utf8');
        const data = JSON.parse(content);
        this.dismissedVersion = data.dismissedVersion || null;
        this.lastCheckTime = data.lastCheckTime || null;
      }
    } catch (e) {
      console.warn('[UpdateService] Failed to load config:', e);
    }
  }

  async saveConfig() {
    const fs = getRNFS();
    if (!fs) return;
    try {
      const configPath = `${fs.DocumentDirectoryPath}/update_config.json`;
      const data = {
        dismissedVersion: this.dismissedVersion,
        lastCheckTime: this.lastCheckTime,
      };
      await fs.writeFile(configPath, JSON.stringify(data), 'utf8');
    } catch (e) {
      console.warn('[UpdateService] Failed to save config:', e);
    }
  }

  // Compare semantic versioning strings
  isNewerVersion(latest, current) {
    if (!latest) return false;
    const cleanLatest = String(latest).replace(/^v/i, '');
    const cleanCurrent = String(current).replace(/^v/i, '');
    const p1 = cleanLatest.split('.').map(Number);
    const p2 = cleanCurrent.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const v1 = isNaN(p1[i]) ? 0 : p1[i];
      const v2 = isNaN(p2[i]) ? 0 : p2[i];
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    return false;
  }

  // Check update against Electron_Backend API
  async checkForUpdates(force = false) {
    await this.init();
    this.lastCheckTime = new Date().toISOString();
    await this.saveConfig();

    const baseUrl = (
      syncService.backendUrl || 'https://envy-erp.vercel.app'
    ).replace(/\/$/, '');
    const apiKey = syncService.apiKey || '';

    // Endpoints to check in priority order (Electron_Backend /api/version first)
    const endpoints = [
      `${baseUrl}/api/version?key=${encodeURIComponent(apiKey)}`,
      `${baseUrl}/api/sync/update-check?version=${CURRENT_APP_VERSION}&platform=${Platform.OS}`,
      `${baseUrl}/updates/update.json`,
    ];

    const parseReleaseNotes = notes => {
      if (!notes) return ['General performance enhancements and bug fixes.'];
      if (Array.isArray(notes)) return notes.filter(Boolean);
      if (typeof notes === 'string') {
        const list = notes
          .split('\n')
          .map(line => line.replace(/^[•\-\*\s]+/, '').trim())
          .filter(
            line =>
              line.length > 0 && !line.toLowerCase().startsWith("what's new"),
          );
        return list.length > 0 ? list : [notes.trim()];
      }
      return ['General performance enhancements and bug fixes.'];
    };

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-api-key': apiKey,
            'x-activation-key': apiKey,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok && response.status === 200) {
          const data = await response.json();
          const latestVer = data.version || data.latestVersion;
          const apkUrl = data.url || data.apkUrl || data.update;
          const notes =
            data.changeLog || data.notes || data.releaseNotes || data.readme;

          if (latestVer) {
            const hasNewVersion =
              this.isNewerVersion(latestVer, CURRENT_APP_VERSION) ||
              (data.versionCode && data.versionCode > CURRENT_VERSION_CODE);

            if (hasNewVersion) {
              this.updateInfo = {
                version: latestVer,
                versionCode: data.versionCode || 2,
                apkUrl: apkUrl || `${baseUrl}/download/envy-sync-latest.apk`,
                releaseNotes: parseReleaseNotes(notes),
                mandatory: !!data.mandatory,
                fileSize: data.fileSize || '14.5 MB',
              };

              if (
                !force &&
                !this.updateInfo.mandatory &&
                this.dismissedVersion === this.updateInfo.version
              ) {
                return {
                  hasUpdate: false,
                  updateInfo: this.updateInfo,
                  dismissed: true,
                };
              }

              return { hasUpdate: true, updateInfo: this.updateInfo };
            } else {
              // API responded and app is already up to date
              return { hasUpdate: false, updateInfo: null };
            }
          }
        }
      } catch (err) {
        console.log(
          `[UpdateService] Endpoint check failed (${url}):`,
          err.message,
        );
      }
    }

    return { hasUpdate: false, updateInfo: null };
  }

  async dismissUpdate(version) {
    this.dismissedVersion = version;
    await this.saveConfig();
  }

  // Download APK file to cache directory with progress tracking
  async downloadApk(onProgress) {
    if (!this.updateInfo || !this.updateInfo.apkUrl) {
      throw new Error('No update APK URL available');
    }

    const fs = getRNFS();
    if (!fs) {
      throw new Error('FileSystem module not available');
    }

    const apkFileName = `envy_sync_v${this.updateInfo.version}.apk`;
    const targetPath = `${fs.CachesDirectoryPath}/${apkFileName}`;

    try {
      const exists = await fs.exists(targetPath);
      if (exists) {
        await fs.unlink(targetPath);
      }
    } catch (e) {
      // Ignore unlink error
    }

    this.isDownloading = true;
    this.downloadProgress = 0;

    const downloadOptions = {
      fromUrl: this.updateInfo.apkUrl,
      toFile: targetPath,
      background: true,
      discretionary: true,
      progress: res => {
        const percentage = Math.floor(
          (res.bytesWritten / res.contentLength) * 100,
        );
        this.downloadProgress = percentage;
        this.downloadedBytes = res.bytesWritten;
        this.totalBytes = res.contentLength;
        if (onProgress) {
          onProgress({
            percentage,
            bytesWritten: res.bytesWritten,
            contentLength: res.contentLength,
          });
        }
      },
    };

    try {
      const res = await fs.downloadFile(downloadOptions).promise;
      this.isDownloading = false;
      if (res.statusCode === 200 || res.statusCode === 0) {
        this.downloadedFilePath = targetPath;
        return targetPath;
      } else {
        throw new Error(`Download failed with status code ${res.statusCode}`);
      }
    } catch (err) {
      this.isDownloading = false;
      throw err;
    }
  }

  // Trigger Android Package Installer via Native Module
  async installApk(filePath) {
    const targetFile = filePath || this.downloadedFilePath;
    if (!targetFile) {
      throw new Error('No APK file downloaded to install');
    }

    if (Platform.OS === 'android') {
      const Installer = NativeModules.UpdateInstaller;
      if (!Installer) {
        throw new Error('Native UpdateInstaller module is not registered');
      }

      const canInstall = await Installer.canInstallUnknownApps();
      if (!canInstall) {
        await Installer.openInstallPermissionSettings();
        throw new Error(
          'Please grant permission to install unknown apps for Envy_Sync, then tap Install again.',
        );
      }

      return await Installer.installApk(targetFile);
    } else {
      throw new Error('Automatic APK installation is only supported on Android');
    }
  }
}

const updateService = new UpdateService();
export default updateService;
