import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { formatIDR } from '@/lib/format';
import { formatCompactIDR } from '@/lib/goalCalculator';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

export type SimulationKey = 'CURRENT' | 'SAVE_20' | 'SAVE_35';

export interface SimulationScenario {
  key: SimulationKey;
  label: string;
  burnRate: number;
  projectedExpense: number;
  projectedBalance: number;
}

export const SIMULATION_SCENARIOS: Record<SimulationKey, SimulationScenario> = {
  CURRENT: {
    key: 'CURRENT',
    label: 'Saat Ini',
    burnRate: 125_000,
    projectedExpense: 3_750_000,
    projectedBalance: 2_450_000,
  },
  SAVE_20: {
    key: 'SAVE_20',
    label: 'Hemat 20%',
    burnRate: 100_000,
    projectedExpense: 3_550_000,
    projectedBalance: 2_650_000,
  },
  SAVE_35: {
    key: 'SAVE_35',
    label: 'Hemat 35%',
    burnRate: 81_000,
    projectedExpense: 3_398_000,
    projectedBalance: 2_802_000,
  },
};

const BUDGET_LIMIT = 4_000_000;

interface MilestonePoint {
  label: string;
  title: string;
  amount: number;
  isProjected: boolean;
}

function buildSmoothBezierPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

interface InteractiveForecastChartProps {
  scenarioKey: SimulationKey;
  onSelectScenario: (key: SimulationKey) => void;
  scenarios?: Record<SimulationKey, SimulationScenario>;
  budgetLimit?: number;
  currentExpense?: number;
}

export function InteractiveForecastChart({
  scenarioKey,
  onSelectScenario,
  scenarios = SIMULATION_SCENARIOS,
  budgetLimit = BUDGET_LIMIT,
  currentExpense = 2_750_000,
}: InteractiveForecastChartProps) {
  const { width } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState(4); // Default: 30 Nov

  const scenario = scenarios[scenarioKey];
  const chartWidth = Math.max(240, width - 72);
  const chartHeight = 175;
  const padLeft = 14;
  const padRight = 14;
  const padTop = 26;
  const padBottom = 18;

  const milestones: MilestonePoint[] = useMemo(() => {
    const base = Math.max(0, currentExpense);
    return [
      { label: '1 Nov', title: 'Awal Bulan (1 Nov)', amount: Math.round(base * 0.08), isProjected: false },
      { label: '8 Nov', title: 'Minggu 1 (8 Nov)', amount: Math.round(base * 0.35), isProjected: false },
      { label: '15 Nov', title: 'Tengah Bulan (15 Nov)', amount: Math.round(base * 0.69), isProjected: false },
      { label: 'Hari Ini', title: 'Hari Ini (22 Nov)', amount: base, isProjected: false },
      {
        label: '30 Nov',
        title: 'Akhir Bulan (30 Nov)',
        amount: scenario.projectedExpense,
        isProjected: true,
      },
    ];
  }, [currentExpense, scenario.projectedExpense]);

  const maxVal = Math.max(
    budgetLimit * 1.12,
    scenario.projectedExpense * 1.15,
    currentExpense * 1.15,
    1_000_000
  );
  const coords = milestones.map((m, idx) => {
    const x =
      padLeft +
      (idx / (milestones.length - 1)) * (chartWidth - padLeft - padRight);
    const y =
      chartHeight -
      padBottom -
      (m.amount / maxVal) * (chartHeight - padTop - padBottom);
    return { x, y };
  });

  const actualCoords = coords.slice(0, 4);
  const projCoords = coords.slice(3, 5);

  const actualPath = buildSmoothBezierPath(actualCoords);
  const actualAreaPath = `${actualPath} L ${actualCoords[3].x.toFixed(1)} ${(chartHeight - padBottom).toFixed(1)} L ${actualCoords[0].x.toFixed(1)} ${(chartHeight - padBottom).toFixed(1)} Z`;

  const projPath = buildSmoothBezierPath(projCoords);
  const projAreaPath = `${projPath} L ${projCoords[1].x.toFixed(1)} ${(chartHeight - padBottom).toFixed(1)} L ${projCoords[0].x.toFixed(1)} ${(chartHeight - padBottom).toFixed(1)} Z`;

  const budgetY =
    chartHeight -
    padBottom -
    (budgetLimit / maxVal) * (chartHeight - padTop - padBottom);

  const activeMilestone = milestones[selectedIndex] ?? milestones[4];
  const diffFromBudget = budgetLimit - activeMilestone.amount;
  const statusHint =
    diffFromBudget >= 0
      ? `${formatCompactIDR(diffFromBudget)} di bawah batas`
      : `${formatCompactIDR(Math.abs(diffFromBudget))} di atas batas`;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          Kurva Proyeksi Pengeluaran
        </Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.solidSwatch} />
            <Text style={styles.legendText}>Aktual</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.dashedSwatch} />
            <Text style={styles.legendText}>Proyeksi</Text>
          </View>
        </View>
      </View>

      {/* Dynamic Readout Bar */}
      <View style={styles.readoutBar}>
        <Text style={styles.readoutTitle} numberOfLines={1}>
          {activeMilestone.title}
        </Text>
        <Text style={[styles.readoutValue, Typography.tabularNums]} numberOfLines={1}>
          {formatIDR(activeMilestone.amount)} ·{' '}
          <Text
            style={{
              color: diffFromBudget >= 0 ? Colors.incomeText : Colors.expense,
            }}
          >
            {statusHint}
          </Text>
        </Text>
      </View>

      {/* SVG Smooth Cubic Bezier Area Chart */}
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B7AF5" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#3B7AF5" stopOpacity="0.01" />
            </SvgGradient>
            <SvgGradient id="projAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B7AF5" stopOpacity="0.08" />
              <Stop offset="1" stopColor="#3B7AF5" stopOpacity="0.0" />
            </SvgGradient>
          </Defs>

          {/* Budget Limit Line */}
          <Line
            x1={padLeft}
            y1={budgetY}
            x2={chartWidth - padRight}
            y2={budgetY}
            stroke="#94A3B8"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />

          {/* Baseline */}
          <Line
            x1={padLeft}
            y1={chartHeight - padBottom}
            x2={chartWidth - padRight}
            y2={chartHeight - padBottom}
            stroke="#E8EDF5"
            strokeWidth={1}
          />

          {/* Area Fills */}
          <Path d={actualAreaPath} fill="url(#actualAreaGrad)" />
          <Path d={projAreaPath} fill="url(#projAreaGrad)" />

          {/* Smooth Cubic Bezier Strokes */}
          <Path
            d={actualPath}
            stroke="#3B7AF5"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={projPath}
            stroke="#3B7AF5"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            fill="none"
            strokeLinecap="round"
          />

          {/* 5 Interactive Milestone Dots */}
          {coords.map((pt, idx) => {
            const isSelected = idx === selectedIndex;
            const isProj = milestones[idx].isProjected;
            return (
              <React.Fragment key={milestones[idx].label}>
                {isSelected ? (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={11}
                    fill="#DBEAFE"
                    opacity={0.9}
                  />
                ) : null}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6.5 : 4.2}
                  fill={isProj && !isSelected ? '#FFFFFF' : '#3B7AF5'}
                  stroke="#3B7AF5"
                  strokeWidth={isProj ? 2 : 1.5}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Budget Limit Tag */}
        <View style={[styles.budgetTagWrap, { top: Math.max(2, budgetY - 18) }]}>
          <Text style={[styles.budgetTagText, Typography.tabularNums]}>
            Batas Rp 4jt
          </Text>
        </View>

        {/* Interactive Touch Targets over SVG Milestones */}
        {coords.map((pt, idx) => (
          <Pressable
            key={`hit-${idx}`}
            onPress={() => setSelectedIndex(idx)}
            accessibilityRole="button"
            accessibilityLabel={`Pilih ${milestones[idx].title}`}
            style={[
              styles.pointHitArea,
              {
                left: pt.x - 18,
                top: pt.y - 18,
              },
            ]}
          />
        ))}
      </View>

      {/* X-Axis Interactive Date Labels */}
      <View style={styles.xAxisRow}>
        {milestones.map((m, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Pressable
              key={m.label}
              onPress={() => setSelectedIndex(idx)}
              style={styles.xAxisBtn}
            >
              <Text
                style={[
                  styles.xAxisLabel,
                  isSelected && styles.xAxisLabelActive,
                ]}
                numberOfLines={1}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3 Quick Saving Simulation Pills */}
      <Text style={styles.simCaption}>SIMULASI LAJU PENGELUARAN</Text>
      <View style={styles.simRow}>
        {(Object.keys(SIMULATION_SCENARIOS) as SimulationKey[]).map((key) => {
          const item = SIMULATION_SCENARIOS[key];
          const active = scenarioKey === key;
          return (
            <Pressable
              key={key}
              onPress={() => onSelectScenario(key)}
              style={[styles.simPill, active && styles.simPillActive]}
            >
              <Text style={[styles.simPillTitle, active && styles.simPillTextActive]}>
                {item.label}
              </Text>
              <Text
                style={[
                  styles.simPillSub,
                  Typography.tabularNums,
                  active && styles.simPillSubActive,
                ]}
                numberOfLines={1}
              >
                {formatCompactIDR(item.burnRate)}/hr
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
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
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  solidSwatch: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  dashedSwatch: {
    width: 12,
    height: 0,
    borderTopWidth: 2.2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  legendText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },

  readoutBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    gap: 2,
  },
  readoutTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  readoutValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },

  chartContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  budgetTagWrap: {
    position: 'absolute',
    right: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  budgetTagText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    color: '#64748B',
  },
  pointHitArea: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 14,
  },
  xAxisBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  xAxisLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  xAxisLabelActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },

  simCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simPill: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  simPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  simPillTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  simPillTextActive: {
    color: '#FFFFFF',
  },
  simPillSub: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  simPillSubActive: {
    color: 'rgba(255,255,255,0.88)',
  },
});
