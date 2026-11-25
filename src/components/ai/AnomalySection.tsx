import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Check, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { type AnomalyItem } from '@/src/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/src/theme/tokens';

interface AnomalySectionProps {
  anomalies: AnomalyItem[];
  onDismiss: (id: string) => void;
}

function getSeverityMeta(severity: AnomalyItem['severity']) {
  if (severity === 'HIGH') {
    return {
      accent: Colors.expense,
      softBg: Colors.expenseSoft,
      textColor: Colors.expenseText,
      borderColor: '#FECACA',
    };
  }
  return {
    accent: Colors.warning,
    softBg: Colors.warningSoft,
    textColor: Colors.warningText,
    borderColor: '#FDE68A',
  };
}

function renderAnomalyIcon(type: AnomalyItem['type'], color: string) {
  switch (type) {
    case 'OVER_BUDGET':
      return <ShieldAlert size={18} color={color} strokeWidth={1.9} />;
    case 'CATEGORY_SPIKE':
      return <TrendingUp size={18} color={color} strokeWidth={1.9} />;
    case 'OUTLIER_TX':
      return <AlertTriangle size={18} color={color} strokeWidth={1.9} />;
  }
}

export function AnomalySection({ anomalies, onDismiss }: AnomalySectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Deteksi Pemborosan</Text>
        <View style={styles.countBadge}>
          <Text style={[styles.countText, Typography.tabularNums]}>
            {anomalies.length} Aktif
          </Text>
        </View>
      </View>

      {anomalies.length === 0 ? (
        <View style={styles.calmCard}>
          <View style={styles.calmIconCircle}>
            <ShieldCheck size={22} color={Colors.income} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calmTitle}>Semua Peringatan Ditinjau</Text>
            <Text style={styles.calmText}>
              Semua peringatan pemborosan sudah ditinjau.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {anomalies.map((item) => {
            const meta = getSeverityMeta(item.severity);
            return (
              <Animated.View
                key={item.id}
                exiting={FadeOut.duration(220)}
                layout={LinearTransition.springify()}
                style={[styles.alertCard, { borderColor: meta.borderColor }]}
              >
                <View style={[styles.leftStrip, { backgroundColor: meta.accent }]} />

                <View style={[styles.iconBox, { backgroundColor: meta.softBg }]}>
                  {renderAnomalyIcon(item.type, meta.accent)}
                </View>

                <View style={styles.contentCol}>
                  <View style={styles.topLine}>
                    <View style={[styles.typeBadge, { backgroundColor: meta.softBg }]}>
                      <Text style={[styles.typeBadgeText, { color: meta.textColor }]}>
                        {item.badgeLabel}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => onDismiss(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Tandai ${item.badgeLabel} sudah ditinjau`}
                      style={({ pressed }) => [
                        styles.reviewBtn,
                        pressed && { opacity: 0.72 },
                      ]}
                    >
                      <Check size={13} color={Colors.textSecondary} strokeWidth={2.3} />
                      <Text style={styles.reviewBtnText}>Ditinjau</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.messageText}>{item.message}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  countText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.primaryDark,
  },
  list: {
    gap: 10,
  },
  alertCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  leftStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  contentCol: {
    flex: 1,
    gap: 7,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviewBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  calmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calmIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.incomeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  calmText: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
