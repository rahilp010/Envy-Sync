/* eslint-disable react/prop-types */
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import syncService from '../../REACT_NATIVE_SYNC_SERVICE';
import { CURRENT_APP_VERSION } from '../services/updateService';

// ---------------------------------------------------------------------------
// Theme — Unified with Dashboard & Mobile ecosystem
// ---------------------------------------------------------------------------
const theme = {
  background: '#16161b',
  surface: '#16161b',
  surfaceRaised: '#24242d',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af', // gray-400
  textTertiary: '#6b7280', // gray-500
  accent: '#daf4aa',
  accentText: '#16161b',
  accentMuted: 'rgba(218, 244, 170, 0.12)',
  danger: '#f87171', // red-400
  success: '#34d399', // emerald-400
  warning: '#fbbf24', // amber-400
  accentBlue: '#60a5fa', // blue-400
  accentPurple: '#c084fc', // purple-400
  accentLime: '#daf4aa',
};

// UX Helper: Converts raw keys to friendly labels
const formatLabel = key => {
  if (!key) return '';
  let label = key.replace(/[_-]/g, ' ');
  label = label.replace(/([a-z])([A-Z])/g, '$1 $2');

  return label
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === 'id') return 'ID';
      if (lower === 'sku') return 'SKU';
      if (lower === 'hsn') return 'HSN';
      if (lower === 'gst') return 'GST';
      if (lower === 'url') return 'URL';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const formatCurrency = val => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        val => val !== null && String(val).toLowerCase().includes(lowerQuery),
      ),
    );
  }, [tableData, searchQuery]);

  // -- Table Tabs ------------------------------------------------------------
  const renderTableTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContent}
    >
      {tables.map(tableName => {
        const isSelected = selectedTable === tableName;
        let iconName = 'list-outline';
        if (tableName === 'products') iconName = 'cube-outline';
        else if (tableName === 'clients') iconName = 'people-outline';
        else if (tableName === 'accounts') iconName = 'wallet-outline';
        else if (tableName === 'sales') iconName = 'trending-up-outline';
        else if (tableName === 'purchases') iconName = 'cart-outline';
        else if (tableName === 'ledger') iconName = 'journal-outline';

        return (
          <TouchableOpacity
            key={tableName}
            onPress={() => handleTableSelect(tableName)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={14}
              color={isSelected ? theme.accentText : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabText, isSelected && styles.tabTextSelected]}
            >
              {tableName.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ---------------------------------------------------------------------------
  // SPECIALIZED MOBILE VIEW CARDS FOR DATA RECORDS
  // ---------------------------------------------------------------------------

  // 1. PRODUCTS CARD
  const renderProductCard = (row, index) => {
    const qty = Number(row.productQuantity || 0);
    const stockStatus =
      qty > 10 ? 'in_stock' : qty > 0 ? 'low_stock' : 'out_of_stock';

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row.productName || 'Unnamed Product'}
            </Text>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: 'rgba(96, 165, 250, 0.12)' },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.accentBlue }]}>
                  {row.assetsType || 'Raw Material'}
                </Text>
              </View>
              {row.saleHSN ? (
                <Text style={styles.subTagText}>HSN: {row.saleHSN}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{row.id || index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          <View style={styles.priceStockRow}>
            <View>
              <Text style={styles.priceLabel}>Unit Price</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(row.productPrice)}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceLabel}>Stock Status</Text>
              <View
                style={[
                  styles.stockBadge,
                  stockStatus === 'in_stock' && {
                    backgroundColor: 'rgba(52, 211, 153, 0.12)',
                    borderColor: 'rgba(52, 211, 153, 0.25)',
                  },
                  stockStatus === 'low_stock' && {
                    backgroundColor: 'rgba(251, 191, 36, 0.12)',
                    borderColor: 'rgba(251, 191, 36, 0.25)',
                  },
                  stockStatus === 'out_of_stock' && {
                    backgroundColor: 'rgba(248, 113, 113, 0.12)',
                    borderColor: 'rgba(248, 113, 113, 0.25)',
                  },
                ]}
              >
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={
                    stockStatus === 'in_stock'
                      ? theme.success
                      : stockStatus === 'low_stock'
                      ? theme.warning
                      : theme.danger
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.stockBadgeText,
                    stockStatus === 'in_stock' && { color: theme.success },
                    stockStatus === 'low_stock' && { color: theme.warning },
                    stockStatus === 'out_of_stock' && { color: theme.danger },
                  ]}
                >
                  {stockStatus === 'in_stock'
                    ? `${qty} in stock`
                    : stockStatus === 'low_stock'
                    ? `Low: ${qty} left`
                    : 'Out of stock'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.metricsFooterRow}>
            <View>
              <Text style={styles.miniLabel}>Tax Rate</Text>
              <Text style={styles.miniValue}>{row.taxRate || 0}%</Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>Tax Amount</Text>
              <Text style={styles.miniValue}>
                {formatCurrency(row.taxAmount)}
              </Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>Total (Inc. Tax)</Text>
              <Text
                style={[
                  styles.miniValue,
                  { color: theme.accentLime, fontWeight: '700' },
                ]}
              >
                {formatCurrency(row.totalAmountWithTax || row.productPrice)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 2. CLIENTS CARD
  const renderClientCard = (row, index) => {
    const isDebtor =
      row.accountType === 'Debtor' || row.accountType === 'Debtors';
    const isEmployee = row.isEmployee === 1;

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row.clientName || 'Unnamed Client'}
            </Text>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.badgePill,
                  isDebtor
                    ? { backgroundColor: 'rgba(52, 211, 153, 0.12)' }
                    : { backgroundColor: 'rgba(251, 191, 36, 0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isDebtor ? theme.success : theme.warning },
                  ]}
                >
                  {row.accountType || 'Client'}
                </Text>
              </View>
              {isEmployee && (
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: 'rgba(192, 132, 252, 0.15)' },
                  ]}
                >
                  <Text
                    style={[styles.badgeText, { color: theme.accentPurple }]}
                  >
                    EMPLOYEE
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{row.id || index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          {row.phoneNo ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="call-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.infoText}>{row.phoneNo}</Text>
            </View>
          ) : null}

          {row.gstNo ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="business-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.infoText}>GST: {row.gstNo}</Text>
            </View>
          ) : null}

          {row.address ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {row.address}
              </Text>
            </View>
          ) : null}

          <View style={styles.cardDivider} />

          <View style={styles.metricsFooterRow}>
            <View>
              <Text style={styles.miniLabel}>Pending Balance</Text>
              <Text
                style={[
                  styles.miniValue,
                  {
                    color:
                      Number(row.pendingAmount || 0) > 0
                        ? theme.danger
                        : theme.textPrimary,
                  },
                ]}
              >
                {formatCurrency(row.pendingAmount)}
              </Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>Paid Balance</Text>
              <Text style={[styles.miniValue, { color: theme.success }]}>
                {formatCurrency(row.paidAmount)}
              </Text>
            </View>
            {isEmployee ? (
              <View>
                <Text style={styles.miniLabel}>Salary</Text>
                <Text style={[styles.miniValue, { color: theme.accentPurple }]}>
                  {formatCurrency(row.salary)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 3. ACCOUNTS CARD
  const renderAccountCard = (row, index) => {
    const isBank = row.accountType === 'Bank' || row.accounterType === 'GPay';
    const isCash = row.accountType === 'Cash';

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row.accountName || 'Unnamed Account'}
            </Text>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.badgePill,
                  isBank && { backgroundColor: 'rgba(96, 165, 250, 0.15)' },
                  isCash && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isBank && { color: theme.accentBlue },
                    isCash && { color: theme.success },
                  ]}
                >
                  {row.accountType}
                </Text>
              </View>
              {row.accountNumber ? (
                <Text style={styles.subTagText}>
                  Acc #: {row.accountNumber}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{row.id || index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          <View style={styles.metricsFooterRow}>
            <View>
              <Text style={styles.miniLabel}>Opening Balance</Text>
              <Text style={styles.miniValue}>
                {formatCurrency(row.openingBalance)}{' '}
                <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                  ({row.openingBalanceType || 'DR'})
                </Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.miniLabel}>Closing Balance</Text>
              <Text
                style={[
                  styles.priceValue,
                  {
                    color: isBank
                      ? theme.accentBlue
                      : isCash
                      ? theme.success
                      : theme.accentLime,
                  },
                ]}
              >
                {formatCurrency(
                  row.closingBalance !== null
                    ? row.closingBalance
                    : row.openingBalance,
                )}{' '}
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  ({row.closingBalanceType || 'DR'})
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 4. SALES & PURCHASES CARD
  const renderTransactionCard = (row, index, type) => {
    const isSales = type === 'sales';
    const isCompleted = row.statusOfTransaction === 'completed';
    const isPending = row.statusOfTransaction === 'pending';

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row.billNo
                ? `Bill: ${row.billNo}`
                : `${isSales ? 'Sale' : 'Purchase'} #${row.id}`}
            </Text>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.badgePill,
                  isCompleted && {
                    backgroundColor: 'rgba(52, 211, 153, 0.12)',
                    borderColor: 'rgba(52, 211, 153, 0.2)',
                  },
                  isPending && {
                    backgroundColor: 'rgba(251, 191, 36, 0.12)',
                    borderColor: 'rgba(251, 191, 36, 0.2)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isCompleted && { color: theme.success },
                    isPending && { color: theme.warning },
                  ]}
                >
                  {(row.statusOfTransaction || 'completed').toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                ]}
              >
                <Text style={styles.badgeText}>
                  {(row.paymentMethod || 'bank').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{row.id || index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          <View style={styles.priceStockRow}>
            <View>
              <Text style={styles.priceLabel}>
                Total Amount {row.taxRate ? `(${row.taxRate}% Tax)` : ''}
              </Text>
              <Text
                style={[
                  styles.priceValue,
                  { color: isSales ? theme.accentLime : theme.textPrimary },
                ]}
              >
                {formatCurrency(
                  row.totalAmountWithTax ||
                    row.saleAmount ||
                    row.purchaseAmount,
                )}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceLabel}>Quantity</Text>
              <Text style={styles.miniValue}>{row.quantity || 1} items</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.metricsFooterRow}>
            <View>
              <Text style={styles.miniLabel}>Paid Amount</Text>
              <Text style={[styles.miniValue, { color: theme.success }]}>
                {formatCurrency(row.paidAmount)}
              </Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>Pending Amount</Text>
              <Text
                style={[
                  styles.miniValue,
                  {
                    color:
                      Number(row.pendingAmount || row.pendingFromOurs || 0) > 0
                        ? theme.danger
                        : theme.textPrimary,
                  },
                ]}
              >
                {formatCurrency(row.pendingAmount || row.pendingFromOurs)}
              </Text>
            </View>
            {row.date ? (
              <View>
                <Text style={styles.miniLabel}>Date</Text>
                <Text style={styles.miniValue}>
                  {new Date(row.date).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 5. LEDGER CARD
  const renderLedgerCard = (row, index) => {
    const isDebit = row.entryType === 'debit';
    const isCredit = row.entryType === 'credit';

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row.referenceType || 'Ledger Entry'} #{row.referenceId || row.id}
            </Text>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.badgePill,
                  isDebit && { backgroundColor: 'rgba(248, 113, 113, 0.12)' },
                  isCredit && { backgroundColor: 'rgba(52, 211, 153, 0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isDebit && { color: theme.danger },
                    isCredit && { color: theme.success },
                  ]}
                >
                  {(row.entryType || 'DEBIT').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.subTagText}>Acc ID: {row.accountId}</Text>
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{row.id || index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          <View style={styles.priceStockRow}>
            <View>
              <Text style={styles.priceLabel}>Amount</Text>
              <Text
                style={[
                  styles.priceValue,
                  { color: isDebit ? theme.danger : theme.success },
                ]}
              >
                {formatCurrency(row.amount)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceLabel}>Balance After</Text>
              <Text style={styles.miniValue}>
                {formatCurrency(row.balanceAfter)} ({row.balanceType || 'DR'})
              </Text>
            </View>
          </View>

          {row.narration ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.infoText} numberOfLines={2}>
                {row.narration}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // 6. GENERIC CARD FALLBACK (For custom or unknown tables)
  const renderGenericCard = (row, index) => {
    const keys = Object.keys(row);
    const primaryKey = keys[0];
    const displayFields = keys.slice(1);

    return (
      <TouchableOpacity
        key={index}
        style={styles.mobileCard}
        activeOpacity={0.75}
        onPress={() => setDetailRow(row)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.primaryLabel}>{formatLabel(primaryKey)}</Text>
            <Text style={styles.cardMainTitle} numberOfLines={1}>
              {row[primaryKey] === null ? '—' : String(row[primaryKey])}
            </Text>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.cardIndex}>#{index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardBodySection}>
          {displayFields.map(key => {
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
        </View>
      </TouchableOpacity>
    );
  };

  // Dispatcher for selecting correct card component
  const renderCardItem = (row, index) => {
    switch (selectedTable) {
      case 'products':
        return renderProductCard(row, index);
      case 'clients':
        return renderClientCard(row, index);
      case 'accounts':
        return renderAccountCard(row, index);
      case 'sales':
        return renderTransactionCard(row, index, 'sales');
      case 'purchases':
        return renderTransactionCard(row, index, 'purchases');
      case 'ledger':
        return renderLedgerCard(row, index);
      default:
        return renderGenericCard(row, index);
    }
  };

  // -- Modal View -----------------------------------------------------------
  const renderDetailModal = () => (
    <Modal
      visible={!!detailRow}
      transparent
      animationType="slide"
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
            <Text style={styles.modalTitle}>
              {selectedTable ? selectedTable.toUpperCase() : 'RECORD'} DETAILS
            </Text>
            <TouchableOpacity onPress={() => setDetailRow(null)} hitSlop={12}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {detailRow &&
              Object.entries(detailRow).map(([key, value]) => (
                <View key={key} style={styles.modalFieldRow}>
                  <Text style={styles.modalFieldKey}>{formatLabel(key)}</Text>
                  <Text style={styles.modalFieldValue} selectable>
                    {value === null || value === undefined || value === ''
                      ? 'Not specified'
                      : typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
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
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Loading synced database...</Text>
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
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.accent}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.errorTitle}>
            {isNoSyncData ? 'No Synced Database' : 'Connection Error'}
          </Text>
          <Text style={styles.errorText}>
            {isNoSyncData
              ? `No database has been downloaded from ${
                  syncService.getSelectedDevice()?.name || 'the device'
                } yet. Trigger a sync to view mobile cards.`
              : error}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              {isNoSyncData ? 'Refresh Database' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Database Records</Text>
        <Text style={styles.headerSubtitle}>
          {syncService.getSelectedDevice()?.name || 'Device'} · v{CURRENT_APP_VERSION} · {tables.length}{' '}
          {tables.length === 1 ? 'table' : 'tables'} available
        </Text>
      </View>

      {tables.length > 0 && renderTableTabs()}

      {selectedTable && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInner}>
            <Ionicons
              name="search"
              size={16}
              color={theme.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${selectedTable}...`}
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      {selectedTable && (
        <View style={styles.recordCountRow}>
          <Text style={styles.recordCountText}>
            {filteredData.length}{' '}
            {filteredData.length === 1 ? 'RECORD' : 'RECORDS'} DISPLAYED
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
            <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
              {filteredData.map((row, index) => renderCardItem(row, index))}
            </Animated.View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.noDataText}>No matching records found.</Text>
            </View>
          )
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.noDataText}>
              No tables available in synced database.
            </Text>
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
    fontSize: 26,
    fontWeight: '300', // font-light styling
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
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabSelected: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextSelected: {
    color: theme.accentText,
    fontWeight: '800',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  recordCountRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  recordCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  // ---------------------------------------------------------------------------
  // MOBILE VIEW CARD STYLES
  // ---------------------------------------------------------------------------
  mobileCard: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  primaryLabel: {
    fontSize: 10,
    color: theme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.4,
  },
  subTagText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  indexBadge: {
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardIndex: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '700',
  },

  cardBodySection: {
    gap: 8,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 6,
  },
  metricsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 10,
    color: theme.textTertiary,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  // Generic Card Fallbacks
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  fieldLabel: {
    width: 130,
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  fieldValue: {
    flex: 1,
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  fieldValueNull: {
    color: theme.textTertiary,
    fontStyle: 'italic',
  },

  // Empty, Error & Loading
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.danger,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateContainer: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: theme.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 12,
  },
  noDataText: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  // Modal UI
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalSheet: {
    backgroundColor: '#24242d',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: 0.5,
  },
  modalClose: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accent,
  },
  modalBody: {
    maxHeight: 500,
  },
  modalFieldRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalFieldKey: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFieldValue: {
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 20,
  },
});

export default DatabaseViewerScreen;
