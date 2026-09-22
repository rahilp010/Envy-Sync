import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const theme = {
  cardBg: '#24242d',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  textMain: '#ffffff',
  textSub: '#9ca3af',
  primary: '#daf4aa',
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  accentBlue: '#60a5fa',
  accentPurple: '#c084fc',
};

const formatCurrency = val => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${Math.round(val)}`;
};

// Helper math to draw clean SVG arcs
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  if (endAngle - startAngle >= 360) {
    endAngle = 359.99;
  }
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

export const ERPAnalyticsCharts = React.memo(({ stats }) => {
  const bank = Math.max(0, Number(stats?.bankBalance || 0));
  const cash = Math.max(0, Number(stats?.cashBalance || 0));
  const totalLiquidity = bank + cash;

  const bankRatio = totalLiquidity > 0 ? bank / totalLiquidity : 0.5;
  const cashRatio = totalLiquidity > 0 ? cash / totalLiquidity : 0.5;

  const bankAngle = bankRatio * 360;

  // Donut Arc Paths
  const bankArc = describeArc(75, 75, 55, 0, Math.max(0.1, bankAngle - 2));
  const cashArc = describeArc(
    75,
    75,
    55,
    bankAngle,
    Math.max(bankAngle + 0.1, 357.99),
  );

  // Bar Chart calculations
  const salesTot = Math.max(0, Number(stats?.totalSalesAmount || 0));
  const salesPend = Math.max(0, Number(stats?.pendingSalesAmount || 0));
  const purchTot = Math.max(0, Number(stats?.totalPurchaseAmount || 0));
  const purchPend = Math.max(0, Number(stats?.pendingPurchaseAmount || 0));

  const maxVal = Math.max(salesTot, salesPend, purchTot, purchPend, 100);
  const chartHeight = 120;

  const getBarHeight = val => Math.max(8, (val / maxVal) * chartHeight);

  return (
    <View style={styles.container}>
      {/* 1. LIQUIDITY DONUT CHART */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.titleRow}>
            <Ionicons
              name="pie-chart-outline"
              size={18}
              color={theme.accentBlue}
            />
            <Text style={styles.chartTitle}>Treasury Liquidity</Text>
          </View>
          <Text style={styles.chartBadge}>DONUT</Text>
        </View>

        <View style={styles.donutContainer}>
          <View style={styles.svgWrapper}>
            <Svg height="150" width="150" viewBox="0 0 150 150">
              <Defs>
                <LinearGradient
                  id="bankGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#60a5fa" />
                  <Stop offset="100%" stopColor="#3b82f6" />
                </LinearGradient>
                <LinearGradient
                  id="cashGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#34d399" />
                  <Stop offset="100%" stopColor="#10b981" />
                </LinearGradient>
              </Defs>

              {/* Background Ring */}
              <Circle
                cx="75"
                cy="75"
                r="55"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="14"
                fill="none"
              />

              {totalLiquidity > 0 ? (
                <>
                  <Path
                    d={bankArc}
                    fill="none"
                    stroke="url(#bankGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  <Path
                    d={cashArc}
                    fill="none"
                    stroke="url(#cashGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <Circle
                  cx="75"
                  cy="75"
                  r="55"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="14"
                  fill="none"
                />
              )}
            </Svg>

            <View style={styles.donutCenterContent}>
              <Text style={styles.centerLabel}>TOTAL</Text>
              <Text style={styles.centerValue}>
                {formatCurrency(totalLiquidity)}
              </Text>
            </View>
          </View>

          <View style={styles.donutLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: '#60a5fa' }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendTitle}>Bank Balance</Text>
                <Text style={styles.legendValue}>{formatCurrency(bank)}</Text>
              </View>
              <Text style={styles.legendPercent}>
                {(bankRatio * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: '#34d399' }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendTitle}>Cash Balance</Text>
                <Text style={styles.legendValue}>{formatCurrency(cash)}</Text>
              </View>
              <Text style={styles.legendPercent}>
                {(cashRatio * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. REVENUE VS PROCUREMENT BAR CHART */}
      <View style={[styles.chartCard, { marginTop: 14 }]}>
        <View style={styles.chartHeader}>
          <View style={styles.titleRow}>
            <Ionicons
              name="bar-chart-outline"
              size={18}
              color={theme.primary}
            />
            <Text style={styles.chartTitle}>Revenue vs Procurement</Text>
          </View>
          <Text style={styles.chartBadge}>BAR CHART</Text>
        </View>

        <View style={styles.barChartWrapper}>
          <Svg
            height="160"
            width={width - 72}
            viewBox={`0 0 ${width - 72} 160`}
          >
            <Defs>
              <LinearGradient id="salesTotGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
              </LinearGradient>
              <LinearGradient id="salesPendGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#daf4aa" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#daf4aa" stopOpacity="0.3" />
              </LinearGradient>
              <LinearGradient id="purchTotGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#f87171" stopOpacity="0.3" />
              </LinearGradient>
              <LinearGradient id="purchPendGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
              </LinearGradient>
            </Defs>

            {/* Grid Background Lines */}
            <Line
              x1="0"
              y1="20"
              x2={width - 72}
              y2="20"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4"
            />
            <Line
              x1="0"
              y1="65"
              x2={width - 72}
              y2="65"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4"
            />
            <Line
              x1="0"
              y1="110"
              x2={width - 72}
              y2="110"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4"
            />
            <Line
              x1="0"
              y1="135"
              x2={width - 72}
              y2="135"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />

            {/* BAR 1: Total Sales */}
            <Rect
              x={(width - 72) * 0.08}
              y={135 - getBarHeight(salesTot)}
              width="36"
              height={getBarHeight(salesTot)}
              rx="6"
              fill="url(#salesTotGrad)"
            />
            <SvgText
              x={(width - 72) * 0.08 + 18}
              y={Math.max(12, 130 - getBarHeight(salesTot))}
              fontSize="9"
              fontWeight="bold"
              fill="#34d399"
              textAnchor="middle"
            >
              {formatCurrency(salesTot)}
            </SvgText>

            {/* BAR 2: Sales Pending */}
            <Rect
              x={(width - 72) * 0.31}
              y={135 - getBarHeight(salesPend)}
              width="36"
              height={getBarHeight(salesPend)}
              rx="6"
              fill="url(#salesPendGrad)"
            />
            <SvgText
              x={(width - 72) * 0.31 + 18}
              y={Math.max(12, 130 - getBarHeight(salesPend))}
              fontSize="9"
              fontWeight="bold"
              fill="#daf4aa"
              textAnchor="middle"
            >
              {formatCurrency(salesPend)}
            </SvgText>

            {/* BAR 3: Total Purchases */}
            <Rect
              x={(width - 72) * 0.56}
              y={135 - getBarHeight(purchTot)}
              width="36"
              height={getBarHeight(purchTot)}
              rx="6"
              fill="url(#purchTotGrad)"
            />
            <SvgText
              x={(width - 72) * 0.56 + 18}
              y={Math.max(12, 130 - getBarHeight(purchTot))}
              fontSize="9"
              fontWeight="bold"
              fill="#f87171"
              textAnchor="middle"
            >
              {formatCurrency(purchTot)}
            </SvgText>

            {/* BAR 4: Purchases Pending */}
            <Rect
              x={(width - 72) * 0.79}
              y={135 - getBarHeight(purchPend)}
              width="36"
              height={getBarHeight(purchPend)}
              rx="6"
              fill="url(#purchPendGrad)"
            />
            <SvgText
              x={(width - 72) * 0.79 + 18}
              y={Math.max(12, 130 - getBarHeight(purchPend))}
              fontSize="9"
              fontWeight="bold"
              fill="#fbbf24"
              textAnchor="middle"
            >
              {formatCurrency(purchPend)}
            </SvgText>
          </Svg>

          <View style={styles.barLabelsRow}>
            <Text style={[styles.barLabel, { color: '#34d399' }]}>
              Sales Tot
            </Text>
            <Text style={[styles.barLabel, { color: '#daf4aa' }]}>
              Sales Pend
            </Text>
            <Text style={[styles.barLabel, { color: '#f87171' }]}>
              Purch Tot
            </Text>
            <Text style={[styles.barLabel, { color: '#fbbf24' }]}>
              Purch Pend
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  chartCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textMain,
    letterSpacing: 0.2,
  },
  chartBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.textSub,
    letterSpacing: 0.8,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  svgWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.textSub,
    letterSpacing: 0.6,
  },
  centerValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textMain,
    marginTop: 2,
  },
  donutLegend: {
    flex: 1,
    marginLeft: 16,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTitle: {
    fontSize: 11,
    color: theme.textSub,
    marginBottom: 2,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMain,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSub,
  },
  barChartWrapper: {
    alignItems: 'center',
    paddingTop: 8,
  },
  barLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 72,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ERPAnalyticsCharts;
