/**
 * React Native Usage Example for Electron Database Sync
 * Compatible with React Native 0.86.0
 * 
 * This component demonstrates how to use the sync service to:
 * 1. Configure the sync service
 * 2. Perform sync with backend
 * 3. Read database tables and data
 * 4. Clean up resources
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import syncService from './REACT_NATIVE_SYNC_SERVICE';

const SyncExample = () => {
  const [status, setStatus] = useState('idle');
  const [dbInfo, setDbInfo] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [error, setError] = useState(null);

  // Configure sync service (replace with your actual backend URL and API key)
  const BACKEND_URL = 'http://10.236.238.253:8001';
  const API_KEY = '320e016f7a59776fe9dc4cd36d4cc4594cb859379843a9fcef74de5f005eb5ff';

  useEffect(() => {
    // Configure sync service on component mount
    syncService.configure(BACKEND_URL, API_KEY);
    
    // Cleanup on unmount
    return () => {
      syncService.cleanup();
    };
  }, []);

  const handleGetDbInfo = async () => {
    setStatus('loading');
    setError(null);
    
    try {
      const info = await syncService.getDbInfo();
      setDbInfo(info);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleSync = async () => {
    setStatus('loading');
    setError(null);
    setTables([]);
    setSelectedTable(null);
    setTableData([]);
    
    try {
      const result = await syncService.performSync();
      console.log('Sync result:', result);
      
      // Get tables after sync
      const tableList = await syncService.getTables();
      setTables(tableList);
      setStatus('success');
      
      Alert.alert('Success', 'Database synced successfully!');
    } catch (err) {
      setError(err.message);
      setStatus('error');
      Alert.alert('Error', `Sync failed: ${err.message}`);
    }
  };

  const handleSelectTable = async (tableName) => {
    setSelectedTable(tableName);
    setStatus('loading');
    setError(null);
    
    try {
      const data = await syncService.getTableData(tableName, 50);
      setTableData(data);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleCleanup = async () => {
    setStatus('loading');
    
    try {
      await syncService.cleanup();
      setDbInfo(null);
      setTables([]);
      setSelectedTable(null);
      setTableData([]);
      setStatus('idle');
      
      Alert.alert('Success', 'Cleanup completed');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const renderTableData = () => {
    if (!selectedTable || tableData.length === 0) {
      return <Text style={styles.noData}>No data available</Text>;
    }

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Table: {selectedTable}</Text>
        <Text style={styles.tableCount}>Rows: {tableData.length}</Text>
        
        <ScrollView style={styles.dataScroll}>
          {tableData.map((row, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.rowIndex}>#{index + 1}</Text>
              <Text style={styles.rowData}>
                {JSON.stringify(row, null, 2)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Electron Database Sync</Text>
        
        {/* Configuration Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <Text style={styles.infoText}>Backend: {BACKEND_URL}</Text>
          <Text style={styles.infoText}>API Key: {API_KEY.substring(0, 8)}...</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={handleGetDbInfo}
            disabled={status === 'loading'}
          >
            <Text style={styles.buttonText}>Get DB Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.syncButton]}
            onPress={handleSync}
            disabled={status === 'loading'}
          >
            <Text style={styles.buttonText}>Perform Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cleanupButton]}
            onPress={handleCleanup}
            disabled={status === 'loading'}
          >
            <Text style={styles.buttonText}>Cleanup</Text>
          </TouchableOpacity>
        </View>

        {/* Status Indicator */}
        {status === 'loading' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>Processing...</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Database Info */}
        {dbInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Info</Text>
            <Text style={styles.infoText}>
              Encrypted: {dbInfo.info?.isEncrypted ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.infoText}>
              DB Size: {dbInfo.info?.dbSize ? `${(dbInfo.info.dbSize / 1024).toFixed(2)} KB` : 'N/A'}
            </Text>
          </View>
        )}

        {/* Tables List */}
        {tables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Tables</Text>
            {tables.map((table, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.tableItem,
                  selectedTable === table && styles.tableItemSelected
                ]}
                onPress={() => handleSelectTable(table)}
              >
                <Text style={[
                  styles.tableItemText,
                  selectedTable === table && styles.tableItemTextSelected
                ]}>
                  {table}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Table Data */}
        {selectedTable && renderTableData()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  infoButton: {
    backgroundColor: '#007AFF',
  },
  syncButton: {
    backgroundColor: '#34C759',
  },
  cleanupButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
  },
  tableItem: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tableItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tableItemText: {
    fontSize: 14,
    color: '#333',
  },
  tableItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tableCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  dataScroll: {
    maxHeight: 400,
  },
  row: {
    padding: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  rowIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  rowData: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});

export default SyncExample;
