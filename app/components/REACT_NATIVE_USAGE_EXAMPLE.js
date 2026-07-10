// React Native Usage Example
// Copy this to your React Native component

import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import syncService from './REACT_NATIVE_SYNC_SERVICE';

const SyncExample = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [error, setError] = useState(null);

  // Configure the sync service (do this once in your app)
  useEffect(() => {
    syncService.configure(
      'http://YOUR_ELECTRON_BACKEND_IP:3000', // Replace with your backend URL
      'YOUR_SECURE_API_KEY' // Replace with your SYNC_API_KEY from .env
    );
  }, []);

  const handleSync = async () => {
    try {
      setSyncStatus('syncing');
      setError(null);
      setTables([]);
      setTableData([]);
      setSelectedTable(null);

      // Perform complete sync
      const result = await syncService.performSync();
      
      setSyncStatus('synced');
      setTables(result.tables);
      console.log('Sync completed successfully');

    } catch (err) {
      setSyncStatus('error');
      setError(err.message);
      console.error('Sync error:', err);
    }
  };

  const handleViewTable = async (tableName) => {
    try {
      setSelectedTable(tableName);
      const data = await syncService.getTableData(tableName);
      setTableData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCleanup = async () => {
    try {
      await syncService.cleanup();
      setSyncStatus('idle');
      setTables([]);
      setTableData([]);
      setSelectedTable(null);
      setError(null);
      console.log('Cleanup completed');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Sync</Text>

      {/* Sync Button */}
      <Button
        title={syncStatus === 'syncing' ? 'Syncing...' : 'Sync Database'}
        onPress={handleSync}
        disabled={syncStatus === 'syncing'}
      />

      {/* Status */}
      {syncStatus !== 'idle' && (
        <View style={styles.statusContainer}>
          {syncStatus === 'syncing' && <ActivityIndicator size="small" />}
          <Text style={styles.status}>
            {syncStatus === 'synced' ? '✅ Sync Complete' : syncStatus === 'error' ? '❌ Sync Failed' : ''}
          </Text>
        </View>
      )}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Tables List */}
      {tables.length > 0 && (
        <View style={styles.tablesContainer}>
          <Text style={styles.subtitle}>Available Tables:</Text>
          <FlatList
            data={tables}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View style={styles.tableItem}>
                <Text>{item}</Text>
                <Button
                  title="View Data"
                  onPress={() => handleViewTable(item)}
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Table Data */}
      {selectedTable && (
        <View style={styles.dataContainer}>
          <Text style={styles.subtitle}>Data from {selectedTable}:</Text>
          <FlatList
            data={tableData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.dataItem}>
                <Text style={styles.dataText}>{JSON.stringify(item)}</Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Cleanup Button */}
      {syncStatus === 'synced' && (
        <Button
          title="Cleanup & Close"
          onPress={handleCleanup}
          color="red"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  status: {
    marginLeft: 10,
  },
  error: {
    color: 'red',
    marginVertical: 10,
  },
  tablesContainer: {
    marginTop: 20,
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  dataContainer: {
    marginTop: 20,
    flex: 1,
  },
  dataItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataText: {
    fontSize: 12,
  },
});

export default SyncExample;
