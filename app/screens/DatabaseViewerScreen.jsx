import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';

// ---------------------------------------------------------------------------
// Theme — Premium dark palette with depth
// ---------------------------------------------------------------------------
const theme = {
  background: '#0A0A0B',
  surface: '#121214',
  surfaceRaised: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  textPrimary: '#F2F2F3',
  textSecondary: '#8A8A8E',
  textTertiary: '#5A5A5E',
  accent: '#E4572E',
  accentMuted: 'rgba(228, 87, 46, 0.12)',
  danger: '#FF5A4E',
};

// UX Helper: Converts raw keys (e.g., 'created_at', 'firstName') to friendly labels ('Created At', 'First Name')
const formatLabel = (key) => {
  if (!key) return '';
  let label = key.replace(/[_-]/g, ' '); // Replace underscores/dashes with spaces
  label = label.replace(/([a-z])([A-Z])/g, '$1 $2'); // Split camelCase
  
  // Capitalize first letter of each word and handle common acronyms
  return label
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === 'id') return 'ID';
      if (lower === 'sku') return 'SKU';
      if (lower === 'url') return 'URL';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const DatabaseViewerScreen = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDatabase();
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [selectedTable, tableData, searchQuery]);

  const loadDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      let dbOpened = false;
      try {
        await syncService.openExistingDatabase();
        dbOpened = true;
      } catch (err) {
        console.log('No existing DB file:', err.message);
      }

      if (!dbOpened) {
        throw new Error(
          'No database found. Please go to the Sync screen and trigger a synchronization first.',
        );
      }

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
    await loadDatabase();
    setRefreshing(false);
  };

  const handleTableSelect = async tableName => {
    if (tableName === selectedTable) return;
    setSelectedTable(tableName);
    setTableData([]);
    setSearchQuery('');
    try {
      const data = await syncService.getTableData(tableName);
      setTableData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const lowerQuery = searchQuery.toLowerCase();
    return tableData.filter(row =>
      Object.values(row).some(
        val => val !== null && String(val).toLowerCase().includes(lowerQuery)
      )
    );
  }, [tableData, searchQuery]);

  // -- Sub-renders ------------------------------------------------------------
  const renderTableTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContent}
    >
      {tables.map(tableName => {
        const isSelected = selectedTable === tableName;
        return (
          <TouchableOpacity
            key={tableName}
            onPress={() => handleTableSelect(tableName)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, isSelected && styles.tabTextSelected]}
            >
              {tableName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderCard = (row, index) => {
    const keys = Object.keys(row);
    const primaryKey = keys[0];
    const secondaryKeys = keys.slice(1, 4);

    return (
      <TouchableOpacity
        key={index}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setDetailRow(row)}
      >
        {primaryKey && (
          <View style={styles.cardHeader}>
            <View style={styles.primaryHeaderContainer}>
              <Text style={styles.primaryLabel}>{formatLabel(primaryKey)}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {row[primaryKey] === null ? '—' : String(row[primaryKey])}
              </Text>
            </View>
            <View style={styles.indexBadge}>
              <Text style={styles.cardIndex}>#{index + 1}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.cardBody}>
          {secondaryKeys.map(key => {
            const val = row[key];
            const isNull = val === null || val === undefined || val === '';
            return (
              <View key={key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel} numberOfLines={1}>
                  {formatLabel(key)}
                </Text>
                <Text
                  style={[styles.fieldValue, isNull && styles.fieldValueNull]}
                  numberOfLines={1}
                >
                  {isNull ? '—' : String(val)}
                </Text>
              </View>
            );
          })}
          {keys.length > 4 && (
            <View style={styles.moreIndicatorRow}>
               <View style={styles.moreIndicatorLine} />
               <Text style={styles.moreText}>+ {keys.length - 4} more</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={!!detailRow}
      transparent
      animationType="fade"
      onRequestClose={() => setDetailRow(null)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setDetailRow(null)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>{selectedTable} Details</Text>
            <TouchableOpacity onPress={() => setDetailRow(null)} hitSlop={12}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {detailRow &&
              Object.entries(detailRow).map(([key, value]) => (
                <View key={key} style={styles.modalFieldRow}>
                  <Text style={styles.modalFieldKey}>{formatLabel(key)}</Text>
                  <Text style={styles.modalFieldValue} selectable>
                    {value === null || value === undefined || value === ''
                      ? 'Not specified'
                      : String(value)}
                  </Text>
                </View>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.loadingText}>Loading database</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isNoSyncData =
      error.includes('No synced database found') ||
      error.includes('Database not initialized') ||
      error.includes('No database found');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>
            {isNoSyncData ? 'No synced data' : 'Connection error'}
          </Text>
          <Text style={styles.errorText}>
            {isNoSyncData
              ? `You haven't synced data from ${
                  syncService.getSelectedDevice()?.name || 'this device'
                } yet.`
              : error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>{isNoSyncData ? 'Sync device' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Database</Text>
        <Text style={styles.headerSubtitle}>
          {syncService.getSelectedDevice()?.name || 'Device'} · {tables.length}{' '}
          {tables.length === 1 ? 'table' : 'tables'}
        </Text>
      </View>

      {tables.length > 0 && renderTableTabs()}

      {selectedTable && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${selectedTable}...`}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      )}

      {selectedTable && (
        <View style={styles.recordCountRow}>
          <Text style={styles.recordCountText}>
            {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        {selectedTable ? (
          filteredData.length > 0 ? (
            <Animated.View style={{ opacity: fadeAnim, gap: 14 }}>
              {filteredData.map((row, index) => renderCard(row, index))}
            </Animated.View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.noDataText}>No records found.</Text>
            </View>
          )
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.noDataText}>No tables available.</Text>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabSelected: {
    backgroundColor: theme.accentMuted,
    borderColor: theme.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  tabTextSelected: {
    color: theme.accent,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    color: theme.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  recordCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  recordCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  // Refined Card UI
  card: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  primaryHeaderContainer: {
    flex: 1,
    marginRight: 12,
  },
  primaryLabel: {
    fontSize: 11,
    color: theme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  indexBadge: {
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardIndex: {
    fontSize: 12,
    color: theme.textSecondary,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  cardBody: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldLabel: {
    width: 120, // Increased width for formatted labels
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  fieldValueNull: {
    color: theme.textTertiary,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  moreIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  moreIndicatorLine: {
    height: 1,
    flex: 1,
    backgroundColor: theme.border,
    marginRight: 12,
  },
  moreText: {
    fontSize: 11,
    color: theme.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty / loading / error
  loadingText: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.danger,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyStateContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 8,
  },
  noDataText: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  // Modal UI (Refined for formatted labels)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  modalClose: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
  },
  modalBody: {
    maxHeight: 500,
  },
  modalFieldRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  modalFieldKey: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
  },
  modalFieldValue: {
    fontSize: 15,
    color: theme.textPrimary,
    lineHeight: 22,
  },
});

export default DatabaseViewerScreen;