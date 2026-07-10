import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

const { width, height } = Dimensions.get('window');

// Premium Dark Theme Palette
const theme = {
  background: '#000000',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBgActive: 'rgba(228, 77, 38, 0.1)',
  cardBorder: 'rgba(255, 255, 255, 0.05)',
  textMain: '#FFFFFF',
  textSub: '#888888',
  primary: '#E44D26', // Copper/Red accent
  dataRowBg: 'rgba(20, 20, 20, 0.7)',
  dataCellBg: 'rgba(255, 255, 255, 0.03)',
};

const DatabaseViewerScreen = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDatabase();
    runAnimations();
  }, []);

  const runAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle background orb breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const loadDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      let dbOpened = false;
      try {
        await syncService.openExistingDatabase();
        dbOpened = true;
      } catch (err) {
        console.log('No existing DB file, attempting auto-sync:', err.message);
      }

      if (!dbOpened && !synced) {
        await syncService.performSync();
        setSynced(true);
      }

      // Get tables
      const tableList = await syncService.getTables();
      setTables(tableList);

      if (tableList.length > 0) {
        setSelectedTable(tableList[0]);
        const data = await syncService.getTableData(tableList[0]);
        setTableData(data);
      } else {
        setTableData([]);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSynced(false);
    await loadDatabase();
    setRefreshing(false);
  };

  const handleTableSelect = async tableName => {
    setSelectedTable(tableName);
    try {
      const data = await syncService.getTableData(tableName);
      setTableData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderTableCard = (tableName, index) => {
    const isSelected = selectedTable === tableName;

    return (
      <Animated.View
        key={tableName}
        style={[
          styles.tableCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
          isSelected && styles.selectedCard,
        ]}
      >
        <TouchableOpacity
          onPress={() => handleTableSelect(tableName)}
          style={styles.tableCardButton}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tableCardText,
              isSelected && styles.selectedCardText,
            ]}
          >
            {tableName}
          </Text>
          <Text style={styles.tableCardCount}>
            {isSelected ? `${tableData.length} rows` : 'Tap to view'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDataRow = (row, index) => {
    return (
      <Animated.View
        key={index}
        style={[
          styles.dataRow,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.rowIndex}>#{index + 1}</Text>
        </View>
        <ScrollView
          style={styles.rowContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(row).map(([key, value]) => (
            <View key={key} style={styles.dataCell}>
              <Text style={styles.cellKey}>{key}</Text>
              <Text style={styles.cellValue} numberOfLines={2}>
                {String(value || 'NULL')}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Initializing Link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isNoSyncData =
      error.includes('No synced database found') ||
      error.includes('Database not initialized');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>
            {isNoSyncData ? 'No Synced Data' : 'Connection Error'}
          </Text>
          <Text style={styles.errorText}>
            {isNoSyncData
              ? `You haven't synced data from ${
                  syncService.getSelectedDevice()?.name || 'this device'
                } yet.`
              : error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>
              {isNoSyncData ? 'Sync Device Now' : 'Retry Connection'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient Abstract Glow */}
      <Animated.View
        style={[
          styles.topOrb,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
          },
        ]}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Database Viewer</Text>
        <Text style={styles.headerSubtitle}>
          {syncService.getSelectedDevice()?.name || 'Device'} • {tables.length}{' '}
          tables
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }} // Extra padding for dock
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Tables Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Entities</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tablesScroll}
          >
            {tables.map((table, index) => renderTableCard(table, index))}
          </ScrollView>
        </View>

        {/* Data Section */}
        {selectedTable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedTable} Records{' '}
              <Text style={styles.recordCount}>({tableData.length})</Text>
            </Text>
            {tableData.length > 0 ? (
              tableData.map((row, index) => renderDataRow(row, index))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.noDataText}>
                  No records found in this entity.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  topOrb: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: theme.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textMain,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMain,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  recordCount: {
    color: theme.textSub,
    fontWeight: '400',
  },
  tablesScroll: {
    flexDirection: 'row',
    paddingBottom: 8, // Space for shadow
  },
  tableCard: {
    width: 140,
    height: 90,
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  selectedCard: {
    borderColor: theme.primary,
    backgroundColor: theme.cardBgActive,
  },
  tableCardButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  tableCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textSub,
    marginBottom: 6,
  },
  selectedCardText: {
    color: theme.primary,
  },
  tableCardCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  dataRow: {
    backgroundColor: theme.dataRowBg,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  rowHeader: {
    marginBottom: 12,
  },
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 1,
  },
  rowContent: {
    flexDirection: 'row',
  },
  dataCell: {
    minWidth: 110,
    marginRight: 16,
    padding: 12,
    backgroundColor: theme.dataCellBg,
    borderRadius: 12,
  },
  cellKey: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textSub,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellValue: {
    fontSize: 14,
    color: theme.textMain,
    fontWeight: '400',
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSub,
    marginTop: 16,
    letterSpacing: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF453A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.textSub,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  retryButtonText: {
    color: theme.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  noDataText: {
    fontSize: 14,
    color: theme.textSub,
    textAlign: 'center',
  },
});

export default DatabaseViewerScreen;
