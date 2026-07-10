// React Native Sync Service
// Copy this file to your React Native project

import { Platform } from 'react-native';
import RNFS from '@dr.pogodin/react-native-fs';
import SQLite from 'react-native-sqlite-2';

class SyncService {
  constructor() {
    this.apiBaseUrl = 'http://10.236.238.253:8001/'; // e.g., 'http://192.168.1.100:3000'
    this.syncApiKey = '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff'; // Set from your .env file
    this.dbPath = null;
    this.database = null;
  }

  /**
   * Initialize sync service with configuration
   */
  configure(apiBaseUrl, syncApiKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.syncApiKey = syncApiKey;
  }

  /**
   * Step 1: Initiate sync and get sync token
   */
  async initiateSync() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/sync/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': this.syncApiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate sync');
      }

      return data;
    } catch (error) {
      console.error('Sync initiation error:', error);
      throw error;
    }
  }

  /**
   * Step 2: Download database file using sync token
   */
  async downloadDatabase(syncToken) {
    try {
      const downloadUrl = `${this.apiBaseUrl}/api/sync/download/${syncToken}`;
      
      // Create temp file path
      const tempDir = `${RNFS.DocumentDirectoryPath}/temp_sync`;
      const tempFilePath = `${tempDir}/data_${Date.now()}.db`;

      // Ensure temp directory exists
      const exists = await RNFS.exists(tempDir);
      if (!exists) {
        await RNFS.mkdir(tempDir);
      }

      // Download the file
      const downloadResult = RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: tempFilePath,
        headers: {
          'x-sync-api-key': this.syncApiKey,
        },
      });

      const response = await downloadResult.promise;

      if (response.statusCode !== 200) {
        throw new Error(`Download failed with status: ${response.statusCode}`);
      }

      this.dbPath = tempFilePath;
      return tempFilePath;
    } catch (error) {
      console.error('Database download error:', error);
      throw error;
    }
  }

  /**
   * Step 3: Open and read the SQLite database
   */
  async openDatabase() {
    try {
      if (!this.dbPath) {
        throw new Error('No database file available. Call downloadDatabase first.');
      }

      // Close existing database if any
      if (this.database) {
        this.database = null;
      }

      // Determine the destination path where react-native-sqlite-2 expects the file
      const destDir = Platform.select({
        android: RNFS.DocumentDirectoryPath,
        ios: `${RNFS.LibraryDirectoryPath}/NoCloud`,
      });
      const destPath = `${destDir}/synced_data.db`;

      // Ensure the destination directory exists
      const dirExists = await RNFS.exists(destDir);
      if (!dirExists) {
        await RNFS.mkdir(destDir);
      }

      // Delete existing destination file if it exists
      const fileExists = await RNFS.exists(destPath);
      if (fileExists) {
        await RNFS.unlink(destPath);
      }

      // Copy downloaded database file to destination
      await RNFS.copyFile(this.dbPath, destPath);
      console.log('Database file copied to:', destPath);

      // Open the database using react-native-sqlite-2
      this.database = SQLite.openDatabase('synced_data.db', '1.0', 'Synced Data', 2 * 1024 * 1024);
      console.log('Database opened successfully');

      return this.database;
    } catch (error) {
      console.error('Database open error:', error);
      throw error;
    }
  }

  /**
   * Import data from the downloaded SQLite file (Legacy, handled by openDatabase file copying)
   */
  async importDatabaseFile(filePath) {
    console.log('Database file import handled via SQLite directory replication.');
    return true;
  }

  /**
   * Get all tables in the database
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
   * Get all data from a specific table
   */
  async getTableData(tableName) {
    try {
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name');
      }
      const rows = await this.executeQuery(`SELECT * FROM ${tableName}`);
      return rows;
    } catch (error) {
      console.error('Get table data error:', error);
      throw error;
    }
  }

  /**
   * Execute custom query
   */
  async executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.database) {
        return reject(new Error('Database not opened'));
      }

      this.database.transaction((tx) => {
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
   * Step 4: Clean up - Close database and delete temp files
   */
  async cleanup() {
    try {
      // Clear database instance
      this.database = null;

      // Delete temp database file
      if (this.dbPath) {
        const fileExists = await RNFS.exists(this.dbPath);
        if (fileExists) {
          await RNFS.unlink(this.dbPath);
          console.log('Temp database file deleted');
        }
        this.dbPath = null;
      }

      // Clean up temp directory
      const tempDir = `${RNFS.DocumentDirectoryPath}/temp_sync`;
      const dirExists = await RNFS.exists(tempDir);
      if (dirExists) {
        await RNFS.unlink(tempDir);
        console.log('Temp directory cleaned up');
      }

      // Clean up the copied SQLite database file
      const destPath = Platform.select({
        android: `${RNFS.DocumentDirectoryPath}/synced_data.db`,
        ios: `${RNFS.LibraryDirectoryPath}/NoCloud/synced_data.db`,
      });
      const destExists = await RNFS.exists(destPath);
      if (destExists) {
        await RNFS.unlink(destPath);
        console.log('SQLite database file deleted');
      }

      return true;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Complete sync workflow
   */
  async performSync() {
    try {
      console.log('Starting sync...');

      // Step 1: Initiate sync
      console.log('Initiating sync...');
      const syncData = await this.initiateSync();
      console.log('Sync initiated. Token:', syncData.syncToken);

      // Step 2: Download database
      console.log('Downloading database...');
      const dbPath = await this.downloadDatabase(syncData.syncToken);
      console.log('Database downloaded to:', dbPath);

      // Step 3: Open database
      console.log('Opening database...');
      await this.openDatabase();
      console.log('Database opened successfully');

      // Get tables
      const tables = await this.getTables();
      console.log('Available tables:', tables);

      // Return sync result with database instance
      return {
        success: true,
        database: this.database,
        tables: tables,
        dbPath: dbPath,
      };

    } catch (error) {
      console.error('Sync failed:', error);
      
      // Cleanup on error
      await this.cleanup();
      
      throw error;
    }
  }
}

// Export singleton instance
export default new SyncService();
