/**
 * React Native Sync Service for Electron Database Sync
 * Compatible with React Native 0.86.0
 * Uses existing packages: @dr.pogodin/react-native-fs, react-native-sqlite-2
 */

import SQLite from 'react-native-sqlite-2';
import { Platform } from 'react-native';
import forge from 'node-forge';

// Lazy load RNFS to avoid module initialization issues
let RNFS = null;

const getRNFS = () => {
  if (!RNFS) {
    try {
      RNFS = require('@dr.pogodin/react-native-fs');
    } catch (e) {
      console.error('Failed to load RNFS:', e);
      RNFS = null;
    }
  }
  return RNFS;
};

// Get cache directory - use hardcoded paths only to avoid RNFS constant access issues
const getCacheDir = () => {
  const fs = getRNFS();
  if (fs && fs.CachesDirectoryPath) {
    return fs.CachesDirectoryPath;
  }
  if (Platform.OS === 'android') {
    return '/data/data/com.envy_sync/cache';
  }
  return '/tmp';
};

// Base64 to Uint8Array helper
function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = base64.length * 0.75,
      len = base64.length, i, p = 0,
      encoded1, encoded2, encoded3, encoded4;
      
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  const arrayBuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arrayBuffer);
        
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== undefined) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== undefined) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  
  return bytes;
}

// Uint8Array to Base64 helper
function uint8ArrayToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '', i, l = bytes.length;
  for (i = 0; i < l; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < l ? bytes[i + 1] : 0;
    const b3 = i + 2 < l ? bytes[i + 2] : 0;
    
    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (b2 >> 4);
    const e3 = i + 1 < l ? ((b2 & 15) << 2) | (b3 >> 6) : 64;
    const e4 = i + 2 < l ? b3 & 63 : 64;
    
    result += chars.charAt(e1) + chars.charAt(e2) + 
              (e3 === 64 ? '=' : chars.charAt(e3)) + 
              (e4 === 64 ? '=' : chars.charAt(e4));
  }
  return result;
}

const DEFAULT_DEVICES = [
  {
    id: 1,
    name: 'Desktop PC',
    type: 'desktop',
    backendUrl: 'http://10.163.233.253:8001',
    apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
    status: 'offline',
    lastSyncTime: null,
    totalSyncs: 0,
    dataTransferredBytes: 0,
    isDefault: true,
  },
  {
    id: 2,
    name: 'Laptop Client',
    type: 'laptop',
    backendUrl: 'http://10.163.233.254:8001',
    apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
    status: 'offline',
    lastSyncTime: null,
    totalSyncs: 0,
    dataTransferredBytes: 0,
    isDefault: false,
  },
  {
    id: 3,
    name: 'Tablet Client',
    type: 'mobile',
    backendUrl: 'http://10.163.233.255:8001',
    apiKey: '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff',
    status: 'offline',
    lastSyncTime: null,
    totalSyncs: 0,
    dataTransferredBytes: 0,
    isDefault: false,
  }
];

class SyncService {
  constructor() {
    this.backendUrl = 'https://electron-by-envy.vercel.app/';
    this.apiKey = '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff';
    this.autoSync = true;
    this.syncInterval = 5;
    this.notifyOnSync = true;
    this.compressData = true;
    this.maxRetries = 3;
    this.timeout = 30;

    // Real stats (Legacy / global fallback)
    this.totalSyncs = 0;
    this.lastSyncTime = null;
    this.dataTransferredBytes = 0;
    this.isHostOnline = false;

    this.syncToken = null;
    this.tempDbPath = '';
    this.db = null;
    this.isConfigured = false;
    this.selectedDevice = null;
    this.devices = [];
  }

  /**
   * Configure the sync service
   * @param {string} backendUrl - Your Backend API URL (not Electron EXE)
   * @param {string} apiKey - Same as backend SYNC_API_KEY
   */
  configure(backendUrl, apiKey) {
    this.backendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.isConfigured = true;
  }

  /**
   * Load settings and stats from settings.json
   */
  async loadSettings() {
    const fs = getRNFS();
    if (!fs) return;

    try {
      const settingsPath = `${fs.DocumentDirectoryPath}/settings.json`;
      const exists = await fs.exists(settingsPath);
      if (exists) {
        let content = await fs.readFile(settingsPath, 'utf8');
        if (content.includes('10.236.238.253')) {
          console.log('[SYNC] Auto-migrating settings.json old IP 10.236.238.253 -> 10.163.233.253');
          content = content.replace(/10\.236\.238\.253/g, '10.163.233.253');
          await fs.writeFile(settingsPath, content, 'utf8');
        }
        const loaded = JSON.parse(content);

        this.backendUrl = loaded.backendUrl || this.backendUrl;
        this.apiKey = loaded.apiKey || this.apiKey;
        this.autoSync = loaded.autoSync !== undefined ? loaded.autoSync : this.autoSync;
        this.syncInterval = loaded.syncInterval || this.syncInterval;
        this.notifyOnSync = loaded.notifyOnSync !== undefined ? loaded.notifyOnSync : this.notifyOnSync;
        this.compressData = loaded.compressData !== undefined ? loaded.compressData : this.compressData;
        this.maxRetries = loaded.maxRetries || this.maxRetries;
        this.timeout = loaded.timeout || this.timeout;

        this.totalSyncs = loaded.totalSyncs || 0;
        this.lastSyncTime = loaded.lastSyncTime || null;
        this.dataTransferredBytes = loaded.dataTransferredBytes || 0;

        // Load devices array
        this.devices = loaded.devices && loaded.devices.length > 0 ? loaded.devices : JSON.parse(JSON.stringify(DEFAULT_DEVICES));
        
        // Load selected device reference
        if (loaded.selectedDevice) {
          this.selectedDevice = loaded.selectedDevice;
        } else {
          this.selectedDevice = this.devices.find(d => d.isDefault) || this.devices[0];
        }

        // Apply selected device configuration
        if (this.selectedDevice) {
          this.backendUrl = this.selectedDevice.backendUrl || this.backendUrl;
          this.apiKey = this.selectedDevice.apiKey || this.apiKey;
        }

        const isDevMode = typeof __DEV__ !== 'undefined' && __DEV__;
        if (!isDevMode) {
          const isLocal = this.backendUrl.includes('localhost') || 
                          this.backendUrl.includes('127.0.0.1') || 
                          this.backendUrl.includes('10.') || 
                          this.backendUrl.includes('192.168.');
          if (isLocal) {
            console.log('[SYNC] Production mode detected. Overriding local backend URL to Vercel production URL.');
            this.backendUrl = 'https://electron-by-envy.vercel.app';
            if (this.selectedDevice) {
              this.selectedDevice.backendUrl = this.backendUrl;
            }
            await this.saveSettings();
          }
        }

        this.isConfigured = true;
      } else {
        // Initialize default settings on first run
        this.devices = JSON.parse(JSON.stringify(DEFAULT_DEVICES));
        this.selectedDevice = this.devices[0];
        this.isConfigured = true;
        await this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings and stats to settings.json
   * @param {Object} settings - Object containing settings to save
   */
  async saveSettings(settings = {}) {
    const fs = getRNFS();
    if (!fs) return;

    try {
      const settingsPath = `${fs.DocumentDirectoryPath}/settings.json`;

      // Update service properties
      if (settings.backendUrl !== undefined) this.backendUrl = settings.backendUrl.replace(/\/$/, '');
      if (settings.apiKey !== undefined) this.apiKey = settings.apiKey;
      if (settings.autoSync !== undefined) this.autoSync = settings.autoSync;
      if (settings.syncInterval !== undefined) this.syncInterval = settings.syncInterval;
      if (settings.notifyOnSync !== undefined) this.notifyOnSync = settings.notifyOnSync;
      if (settings.compressData !== undefined) this.compressData = settings.compressData;
      if (settings.maxRetries !== undefined) this.maxRetries = settings.maxRetries;
      if (settings.timeout !== undefined) this.timeout = settings.timeout;
      
      if (settings.totalSyncs !== undefined) this.totalSyncs = settings.totalSyncs;
      if (settings.lastSyncTime !== undefined) this.lastSyncTime = settings.lastSyncTime;
      if (settings.dataTransferredBytes !== undefined) this.dataTransferredBytes = settings.dataTransferredBytes;

      if (settings.devices !== undefined) this.devices = settings.devices;
      if (settings.selectedDevice !== undefined) {
        this.selectedDevice = settings.selectedDevice;
        if (this.selectedDevice) {
          this.backendUrl = this.selectedDevice.backendUrl.replace(/\/$/, '');
          this.apiKey = this.selectedDevice.apiKey;
        }
      }

      this.isConfigured = true;

      const toSave = {
        backendUrl: this.backendUrl,
        apiKey: this.apiKey,
        autoSync: this.autoSync,
        syncInterval: this.syncInterval,
        notifyOnSync: this.notifyOnSync,
        compressData: this.compressData,
        maxRetries: this.maxRetries,
        timeout: this.timeout,
        totalSyncs: this.totalSyncs,
        lastSyncTime: this.lastSyncTime,
        dataTransferredBytes: this.dataTransferredBytes,
        devices: this.devices,
        selectedDevice: this.selectedDevice,
      };

      await fs.writeFile(settingsPath, JSON.stringify(toSave, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Set available devices for sync
   * @param {Array<Object>} devices - Array of device objects
   */
  setDevices(devices) {
    this.devices = devices;
    // Set default device if none selected
    if (!this.selectedDevice && devices.length > 0) {
      const defaultDevice = devices.find(d => d.isDefault) || devices[0];
      this.selectedDevice = defaultDevice;
    }
  }

  /**
   * Select a device for sync
   * @param {Object} device - Device object to select
   */
  selectDevice(device) {
    this.selectedDevice = device;
    if (device) {
      this.backendUrl = device.backendUrl.replace(/\/$/, '');
      this.apiKey = device.apiKey;
    }
    this.db = null; // Clear SQLite connection so it re-opens the selected device file
  }

  /**
   * Get available devices
   * @returns {Array<Object>} Array of device objects
   */
  getDevices() {
    if (!this.devices || this.devices.length === 0) {
      this.devices = JSON.parse(JSON.stringify(DEFAULT_DEVICES));
    }
    return this.devices.map(device => ({
      ...device,
      lastSync: this.formatDeviceLastSyncTime(device),
    }));
  }

  /**
   * Get currently selected device
   * @returns {Object|null} Selected device or null
   */
  getSelectedDevice() {
    if (!this.selectedDevice) {
      const devices = this.getDevices();
      this.selectedDevice = devices.find(d => d.isDefault) || devices[0];
    }
    return this.selectedDevice;
  }

  /**
   * Format last sync time string for a device
   */
  formatDeviceLastSyncTime(device) {
    if (!device.lastSyncTime) {
      return 'Never synced';
    }
    const diffMs = Date.now() - new Date(device.lastSyncTime).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  /**
   * Ping a device's backend URL to check if it's online
   * @param {Object} device
   * @returns {Promise<boolean>} True if online, false otherwise
   */
  async pingDevice(device) {
    if (!device.backendUrl) return false;
    const url = `${device.backendUrl.replace(/\/$/, '')}/api/health`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-sync-api-key': device.apiKey
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get currently selected device
   * @returns {Object|null} Selected device or null
   */
  getSelectedDevice() {
    const devices = this.getDevices();
    if (!this.selectedDevice && devices.length > 0) {
      this.selectedDevice = devices[0];
    }
    return this.selectedDevice;
  }

  /**
   * Format last sync time string
   */
  formatLastSyncTime() {
    if (!this.lastSyncTime) {
      return 'Never synced';
    }
    const diffMs = Date.now() - new Date(this.lastSyncTime).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  /**
   * Format bytes to readable size
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Perform complete sync workflow
   * @returns {Promise<Object>} Sync result with database info
   */
  /**
   * Perform complete sync workflow using WebSockets
   * @param {Function} onStatus - Status change callback
   * @returns {Promise<Object>} Sync result
   */
  async performSync(onStatus = () => {}) {
    if (!this.isConfigured) {
      throw new Error('SyncService not configured. Call configure() first.');
    }

    const fs = getRNFS();
    if (!fs) {
      throw new Error('RNFS package not available.');
    }

    // Connect with role=phone
    const wsUrl = `${this.backendUrl.replace(/^http/, 'ws')}/sync?apiKey=${this.apiKey}&role=phone&deviceId=${Platform.OS}-${Platform.Version}`;
    console.log(`[SYNC] Connecting to WebSocket: ${wsUrl}`);
    
    return new Promise((resolve, reject) => {
      let ws;
      let sessionRequestId = null;
      
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        return reject(new Error(`WebSocket connection failed: ${err.message}`));
      }
      
      ws.onopen = () => {
        console.log('[SYNC] WebSocket connection opened. Requesting database sync...');
        onStatus('Preparing database...');
        
        sessionRequestId = global.crypto?.randomUUID ? global.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        
        ws.send(JSON.stringify({
          type: 'SYNC_REQUEST',
          requestId: sessionRequestId,
          deviceId: `${Platform.OS}-${Platform.Version}`,
          currentVersion: 0
        }));
      };
      
      ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          console.error('[SYNC] Failed to parse WebSocket message:', err.message);
          return;
        }
        
        const { type, requestId, file, downloadUrl, error } = msg;
        
        if (requestId !== sessionRequestId) {
          console.warn('[SYNC] Request ID mismatch. Ignoring message.');
          return;
        }
        
        switch (type) {
          case 'SYNC_PREPARING':
            onStatus('Preparing database...');
            break;
            
          case 'SYNC_UPLOADING':
            onStatus('Uploading...');
            break;
            
          case 'SYNC_READY':
            onStatus('Downloading...');
            
            try {
              const cacheDir = getCacheDir();
              const tempDir = `${cacheDir}/sync_temp`;
              const dirExists = await fs.exists(tempDir);
              if (!dirExists) {
                await fs.mkdir(tempDir);
              }
              
              this.tempDbPath = `${tempDir}/data-${Date.now()}.db.enc`;
              console.log(`[SYNC] Downloading sync database to: ${this.tempDbPath}`);
              
              const downloadResult = await fs.downloadFile({
                fromUrl: downloadUrl,
                toFile: this.tempDbPath
              }).promise;
              
              if (downloadResult.statusCode !== 200) {
                throw new Error(`Download failed with HTTP status ${downloadResult.statusCode}`);
              }
              
              onStatus('Verifying...');
              
              // Read binary content as base64
              const base64Data = await fs.readFile(this.tempDbPath, 'base64');
              const binaryString = forge.util.decode64(base64Data);
              
              // Verify SHA-256 using node-forge
              const md = forge.md.sha256.create();
              md.update(binaryString);
              const hashHex = md.digest().toHex();
              
              console.log(`[SYNC] Server SHA-256: ${file.sha256}`);
              console.log(`[SYNC] Local SHA-256: ${hashHex}`);
              
              if (hashHex.toLowerCase() !== file.sha256.toLowerCase()) {
                throw new Error('Downloaded database integrity check failed (SHA-256 mismatch)');
              }
              
              onStatus('Processing...');
              
              // Decrypt the file using node-forge (AES-256-GCM)
              const iv = binaryString.substring(0, 16);
              const tag = binaryString.substring(16, 32);
              const ciphertext = binaryString.substring(32);
              
              // Derive key using SHA-256 hash of 'envy-secure-key-2025'
              const keyMd = forge.md.sha256.create();
              keyMd.update('envy-secure-key-2025');
              const derivedKey = keyMd.digest().getBytes();
              
              const decipher = forge.cipher.createDecipher('AES-GCM', derivedKey);
              decipher.start({
                iv: iv,
                tag: tag
              });
              decipher.update(forge.util.createBuffer(ciphertext));
              const pass = decipher.finish();
              
              if (!pass) {
                throw new Error('Database decryption failed (GCM authentication check failed)');
              }
              
              const decryptedBytes = decipher.output.getBytes();
              const decryptedBase64 = forge.util.encode64(decryptedBytes);
              
              const destDir = Platform.select({
                android: fs.DocumentDirectoryPath,
                ios: `${fs.LibraryDirectoryPath}/NoCloud`
              });
              
              const deviceId = this.selectedDevice ? this.selectedDevice.id : 1;
              const destPath = `${destDir}/synced_data_device_${deviceId}.db`;
              
              if (!(await fs.exists(destDir))) {
                await fs.mkdir(destDir);
              }
              
              if (await fs.exists(destPath)) {
                await fs.unlink(destPath);
              }
              
              await fs.writeFile(destPath, decryptedBase64, 'base64');
              console.log(`[SYNC] Decrypted database saved to destination: ${destPath}`);
              
              // Open database via react-native-sqlite-2
              this.db = SQLite.openDatabase(`synced_data_device_${deviceId}.db`, '1.0', 'Synced Database', 5 * 1024 * 1024);
              console.log('[SYNC] Synced database opened successfully.');
              
              // Clean up temp file
              try {
                if (await fs.exists(this.tempDbPath)) {
                  await fs.unlink(this.tempDbPath);
                }
              } catch (err) {}
              
              // Update settings & statistics
              const syncedBytes = file.size;
              const deviceIndex = this.devices.findIndex(d => d.id === deviceId);
              if (deviceIndex !== -1) {
                this.devices[deviceIndex].totalSyncs = (this.devices[deviceIndex].totalSyncs || 0) + 1;
                this.devices[deviceIndex].lastSyncTime = new Date().toISOString();
                this.devices[deviceIndex].dataTransferredBytes = (this.devices[deviceIndex].dataTransferredBytes || 0) + syncedBytes;
                this.selectedDevice = this.devices[deviceIndex];
              }
              
              this.totalSyncs++;
              this.lastSyncTime = new Date().toISOString();
              this.dataTransferredBytes += syncedBytes;
              
              await this.saveSettings({
                totalSyncs: this.totalSyncs,
                lastSyncTime: this.lastSyncTime,
                dataTransferredBytes: this.dataTransferredBytes,
                devices: this.devices,
                selectedDevice: this.selectedDevice
              });
              
              // Send SYNC_COMPLETE signal
              ws.send(JSON.stringify({
                type: 'SYNC_COMPLETE',
                requestId: sessionRequestId,
                version: file.version,
                sha256: file.sha256
              }));
              
              onStatus('Sync Complete');
              ws.close();
              resolve({
                success: true,
                token: sessionRequestId,
                dbPath: destPath,
                version: file.version
              });
              
            } catch (err) {
              console.error('[SYNC] Sync process failure:', err.message);
              ws.send(JSON.stringify({
                type: 'SYNC_FAILED',
                requestId: sessionRequestId,
                error: err.message
              }));
              ws.close();
              reject(err);
            }
            break;
            
          case 'SYNC_FAILED':
            ws.close();
            reject(new Error(error || 'Sync preparing failed on server'));
            break;
            
          default:
            console.warn('[SYNC] Unknown signaling state received:', type);
        }
      };
      
      ws.onerror = (err) => {
        console.error('[SYNC] WebSocket error event details:', err);
        console.error('[SYNC] WebSocket error message:', err ? err.message : 'No message');
        reject(new Error(`WebSocket connection error (URL: ${wsUrl})`));
      };
      
      ws.onclose = (event) => {
        console.log('[SYNC] WebSocket closed. Code:', event.code, 'Reason:', event.reason, 'wasClean:', event.wasClean);
        if (event.code !== 1000 && event.code !== 1005) {
          reject(new Error(`WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason || 'None'})`));
        }
      };
    });
  }

  /**
   * Get database information from backend
   * @returns {Promise<Object>} Database info
   */
  async getDbInfo() {
    if (!this.isConfigured) {
      throw new Error('SyncService not configured. Call configure() first.');
    }

    const response = await this._makeRequest('/api/sync/db-info', 'GET');
    return response;
  }

  /**
   * Get all tables from the synced database
   * @returns {Promise<Array<string>>} Table names
   */
  async getTables() {
    try {
      const rows = await this.executeQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
      );
      return rows.map(row => row.name);
    } catch (error) {
      console.error('Get tables error:', error);
      throw error;
    }
  }

  /**
   * Get table data
   * @param {string} tableName - Name of the table
   * @param {number} limit - Optional limit on number of rows
   * @returns {Promise<Array<Object>>} Table data
   */
  async getTableData(tableName, limit = 100) {
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name');
      }
      const query = limit ? `SELECT * FROM ${tableName} LIMIT ${limit}` : `SELECT * FROM ${tableName}`;
      const rows = await this.executeQuery(query);
      return rows;
    } catch (error) {
      console.error('Get table data error:', error);
      throw error;
    }
  }

  /**
   * Get table row count
   * @param {string} tableName - Name of the table
   * @returns {Promise<number>} Row count
   */
  async getTableCount(tableName) {
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name');
      }
      const rows = await this.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
      if (rows && rows.length > 0) {
        return rows[0].count;
      }
      return 0;
    } catch (error) {
      console.error('Get table count error:', error);
      throw error;
    }
  }

  /**
   * Execute custom SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array<Object>>} Query results
   */
  async executeQuery(query, params = []) {
    if (!this.db) {
      try {
        await this.openExistingDatabase();
      } catch (err) {
        throw new Error(`Database not initialized for ${this.selectedDevice?.name || 'this device'}. Please sync first.`);
      }
    }

    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          query,
          params,
          (tx, results) => {
            const rows = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve(rows);
          },
          (tx, error) => {
            reject(error);
            return false; // rollback
          }
        );
      });
    });
  }

  /**
   * Check sync status
   * @returns {Promise<Object>} Sync status
   */
  async getSyncStatus() {
    if (!this.syncToken) {
      throw new Error('No active sync token.');
    }

    const response = await this._makeRequest(`/api/sync/status/${this.syncToken}`, 'GET');
    return response;
  }

  /**
   * Clean up temporary files and close database
   */
  async cleanup() {
    try {
      // Clear database instance if open
      this.db = null;

      // Delete temporary database file
      if (this.tempDbPath) {
        const fs = getRNFS();
        if (fs && typeof fs.exists === 'function' && typeof fs.unlink === 'function') {
          const exists = await fs.exists(this.tempDbPath);
          if (exists) {
            await fs.unlink(this.tempDbPath);
          }
        }
        this.tempDbPath = '';
      }

      // Reset sync token
      this.syncToken = null;

      return { success: true };
    } catch (error) {
      console.error('Cleanup error:', error);
      // Continue even if cleanup fails
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiate sync with backend
   * @private
   */
  async _initiateSync() {
    const response = await this._makeRequest('/api/sync/initiate', 'POST');
    
    if (!response.success || !response.token) {
      throw new Error('Failed to initiate sync');
    }

    return response;
  }

  /**
   * Download database from backend
   * @private
   */
  async _downloadDatabase() {
    const downloadUrl = `${this.backendUrl}/api/sync/download/${this.syncToken}`;
    
    // Get RNFS lazily
    const fs = getRNFS();
    if (!fs) {
      throw new Error('RNFS package not available. Please ensure it is properly installed and linked.');
    }
    
    // Create temp directory if it doesn't exist
    const cacheDir = getCacheDir();
    const tempDir = `${cacheDir}/sync_temp`;
    
    try {
      // Check if RNFS methods are available
      if (typeof fs.exists !== 'function' || typeof fs.mkdir !== 'function') {
        throw new Error('RNFS methods not available. Package may not be properly linked.');
      }
      
      const dirExists = await fs.exists(tempDir);
      if (!dirExists) {
        await fs.mkdir(tempDir);
      }
    } catch (fsError) {
      console.error('FS directory error:', fsError);
      throw new Error(`Failed to create temp directory: ${fsError.message}`);
    }

    // Generate temp file path
    const timestamp = Date.now();
    this.tempDbPath = `${tempDir}/data-${timestamp}.db`;

    // Download file
    const downloadResult = await fs.downloadFile({
      fromUrl: downloadUrl,
      toFile: this.tempDbPath,
      headers: {
        'x-sync-api-key': this.apiKey
      }
    }).promise;

    if (downloadResult.statusCode !== 200) {
      throw new Error(`Download failed with status ${downloadResult.statusCode}`);
    }
  }

  async _openDatabase() {
    if (!this.tempDbPath) {
      throw new Error('No database file available');
    }

    try {
      const fs = getRNFS();
      if (!fs) {
        throw new Error('RNFS package not available. Please ensure it is properly installed and linked.');
      }

      // Determine the destination path where react-native-sqlite-2 expects the file
      const destDir = Platform.select({
        android: fs.DocumentDirectoryPath,
        ios: `${fs.LibraryDirectoryPath}/NoCloud`,
      });
      
      const deviceId = this.selectedDevice ? this.selectedDevice.id : 1;
      const destPath = `${destDir}/synced_data_device_${deviceId}.db`;

      // Ensure the destination directory exists
      const dirExists = await fs.exists(destDir);
      if (!dirExists) {
        await fs.mkdir(destDir);
      }

      // Delete existing destination file if it exists
      const fileExists = await fs.exists(destPath);
      if (fileExists) {
        await fs.unlink(destPath);
      }

      // Copy downloaded database file to destination
      await fs.copyFile(this.tempDbPath, destPath);
      console.log('Database file copied to:', destPath);

      // Open the database using react-native-sqlite-2
      this.db = SQLite.openDatabase(`synced_data_device_${deviceId}.db`, '1.0', 'Synced Database', 5 * 1024 * 1024);
      console.log('Database opened successfully');
    } catch (error) {
      console.error('Database open error:', error);
      throw error;
    }
  }

  async openExistingDatabase() {
    try {
      const fs = getRNFS();
      if (!fs) {
        throw new Error('RNFS package not available. Please ensure it is properly installed and linked.');
      }

      const destDir = Platform.select({
        android: fs.DocumentDirectoryPath,
        ios: `${fs.LibraryDirectoryPath}/NoCloud`,
      });
      
      const deviceId = this.selectedDevice ? this.selectedDevice.id : 1;
      const destPath = `${destDir}/synced_data_device_${deviceId}.db`;

      const fileExists = await fs.exists(destPath);
      if (!fileExists) {
        throw new Error(`Database file for device ${deviceId} does not exist locally.`);
      }

      this.db = SQLite.openDatabase(`synced_data_device_${deviceId}.db`, '1.0', 'Synced Database', 5 * 1024 * 1024);
      console.log('Existing database opened successfully:', destPath);
      return destPath;
    } catch (error) {
      console.error('Database open existing error:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to backend
   * @private
   */
  async _makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.backendUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-sync-api-key': this.apiKey
    };

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If not JSON, throw error with the actual response
        console.error('Non-JSON response from backend:', responseText.substring(0, 200));
        throw new Error(`Backend returned non-JSON response. Status: ${response.status}. Response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const syncService = new SyncService();
export default syncService;
