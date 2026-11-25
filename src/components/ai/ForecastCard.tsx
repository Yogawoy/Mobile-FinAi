import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { type ForecastData } from '@/src/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/src/theme/tokens';

interface ForecastCardProps {
  forecast: ForecastData;
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(220, width - 64);
  const chartHeight = 82;
  const padY = 10;
  const padX = 6;

  const allPoints = [
    ...forecast.actualPoints,
    ...forecast.projectedPoints.slice(1),
  ];
  const maxVal = Math.max(...allPoints, 4.0);
  const totalSteps = allPoints.length - 1;
  const actualEndIdx = forecast.actualPoints.length - 1;

  const toX = (idx: number) =>
    padX + (idx / Math.max(1, totalSteps)) * (chartWidth - padX * 2);
  const toY = (val: number) =>
    chartHeight - padY - (val / maxVal) * (chartHeight - padY * 2);

  const actualCoords = forecast.actualPoints.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const projCoords = forecast.projectedPoints.map((v, i) => ({
    x: toX(actualEndIdx + i),
    y: toY(v),
  }));

  const actualPath = actualCoords
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const actualAreaPath = `${actualPath} L ${actualCoords[actualCoords.length - 1].x.toFixed(1)} ${chartHeight - padY} L ${actualCoords[0].x.toFixed(1)} ${chartHeight - padY} Z`;

  const projPath = projCoords
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const riskBadge =
    forecast.riskLevel === 'SAFE'
      ? { label: 'Status: Aman', bg: Colors.incomeSoft, color: Colors.incomeText }
      : forecast.riskLevel === 'WARNING'
        ? { label: 'Status: Waspada', bg: Colors.warningSoft, color: Colors.warningText }
        : { label: 'Status: Berisiko', bg: Colors.expenseSoft, color: Colors.expenseText };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Prediksi Arus Kas</Text>
        <View style={[styles.riskBadge, { backgroundColor: riskBadge.bg }]}>
          <Text style={[styles.riskText, { color: riskBadge.color }]}>
            {riskBadge.label}
          </Text>
        </View>
      </View>

      {/* 3 Mini-Tiles */}
      <View style={styles.tilesRow}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Burn Rate</Text>
          <Text style={[styles.tileValue, Typography.tabularNums]}>
            Rp 125rb/hr
          </Text>
        </View>

        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Proyeksi Keluar</Text>
          <Text style={[styles.tileValue, Typography.tabularNums]}>
            Rp 3,75jt
          </Text>
        </View>

        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Sisa Akhir Bln</Text>
          <Text
            style={[styles.tileValue, Typography.tabularNums, { color: Colors.income }]}
          >
            +Rp 2,45jt
          </Text>
        </View>
      </View>

      {/* Mini SVG Projection Curve */}
      <View style={styles.chartWrap}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B7AF5" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#3B7AF5" stopOpacity="0.0" />
            </SvgGradient>
          </Defs>

          {/* Subtle horizontal guide line */}
          <Line
            x1={padX}
            y1={chartHeight - padY}
            x2={chartWidth - padX}
            y2={chartHeight - padY}
            stroke="#E8EDF5"
            strokeWidth={1}
          />

          <Path d={actualAreaPath} fill="url(#actualFill)" />
          <Path
            d={actualPath}
            stroke="#3B7AF5"
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={projPath}
            stroke="#3B7AF5"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.solidLineSample} />
          <Text style={styles.legendText}>Aktual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.dashedLineSample} />
          <Text style={styles.legendText}>Proyeksi Akhir Bulan</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  riskText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tileLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  tileValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  chartWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  solidLineSample: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  dashedLineSample: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  legendText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
