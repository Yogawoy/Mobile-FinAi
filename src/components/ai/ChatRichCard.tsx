import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { type ChatRichCardType } from '@/src/lib/mockAiChat';
import { Colors, FontFamily, Radius, Typography } from '@/src/theme/tokens';

interface ChatRichCardProps {
  type: ChatRichCardType;
}

const RECOMMENDATIONS = [
  {
    title: 'Kurangi pesan antar Makanan & Minuman',
    tag: 'Hemat ~Rp 210rb/bln',
  },
  {
    title: 'Tahan belanja non-esensial selama 8 hari ke depan',
    tag: 'Hemat ~Rp 180rb/bln',
  },
  {
    title: 'Audit langganan Cloud yang jarang dipakai bulan ini',
    tag: 'Hemat ~Rp 95rb/bln',
  },
];

function KeyValueRow({
  label,
  value,
  valueColor = Colors.textPrimary,
  isLast = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.kvRow, !isLast && styles.kvRowBorder]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, Typography.tabularNums, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

export function ChatRichCard({ type }: ChatRichCardProps) {
  if (type === 'SUMMARY') {
    return (
      <View style={styles.subCard}>
        <KeyValueRow
          label="Skor Kesehatan"
          value="84 / 100 · Sehat"
          valueColor={Colors.income}
        />
        <KeyValueRow label="Burn Rate Harian" value="Rp 125rb / hr" />
        <KeyValueRow
          label="Sisa Anggaran Nov"
          value="Rp 2.650.000"
          valueColor={Colors.primary}
          isLast
        />
      </View>
    );
  }

  if (type === 'FORECAST') {
    return (
      <View style={styles.subCard}>
        <KeyValueRow label="Burn Rate Harian" value="Rp 125rb / hr" />
        <KeyValueRow
          label="Proyeksi Pengeluaran"
          value="Rp 3.750.000"
          valueColor={Colors.expense}
        />
        <KeyValueRow
          label="Estimasi Sisa Akhir Bulan"
          value="+Rp 2.450.000"
          valueColor={Colors.income}
          isLast
        />
      </View>
    );
  }

  if (type === 'ANOMALY') {
    return (
      <View style={styles.subCard}>
        <View style={styles.alignedRow}>
          <View style={[styles.iconBadge, { backgroundColor: Colors.expenseSoft }]}>
            <ShieldAlert size={13} color={Colors.expense} strokeWidth={2.1} />
          </View>
          <View style={styles.alignedBody}>
            <Text style={[styles.alignedTitle, { color: Colors.expenseText }]}>
              Belanja 108% (Over-Budget)
            </Text>
            <Text style={styles.alignedSub}>
              Melebihi batas anggaran sebesar Rp 40.000
            </Text>
          </View>
        </View>

        <View style={[styles.alignedRow, styles.rowTopDivider]}>
          <View style={[styles.iconBadge, { backgroundColor: Colors.warningSoft }]}>
            <AlertTriangle size={13} color={Colors.warning} strokeWidth={2.1} />
          </View>
          <View style={styles.alignedBody}>
            <Text style={[styles.alignedTitle, { color: Colors.warningText }]}>
              Pengeluaran Makanan +28%
            </Text>
            <Text style={styles.alignedSub}>
              Naik dibanding rata-rata bulan lalu
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.subCard}>
      {RECOMMENDATIONS.map((rec, idx) => (
        <View
          key={rec.title}
          style={[styles.alignedRow, idx > 0 && styles.rowTopDivider]}
        >
          <View style={styles.numCircle}>
            <Text style={[styles.numText, Typography.tabularNums]}>
              {idx + 1}
            </Text>
          </View>
          <View style={styles.alignedBody}>
            <Text style={styles.alignedTitle}>{rec.title}</Text>
            <Text style={[styles.recTag, Typography.tabularNums]}>{rec.tag}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 12,
    gap: 8,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 12,
  },
  kvRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  kvLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
    flex: 1,
  },
  kvValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
  },
  alignedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowTopDivider: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.primary,
  },
  alignedBody: {
    flex: 1,
  },
  alignedTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  alignedSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 1,
  },
  recTag: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.incomeText,
    backgroundColor: Colors.incomeSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 4,
  },
});
