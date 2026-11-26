import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarClock, Check, Cloud, Home, Wifi } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

export interface RecurringBillItem {
  id: string;
  title: string;
  amount: number;
  dueLabel: string;
  categoryLabel: string;
  iconKey: 'home' | 'cloud' | 'wifi';
}

const RECURRING_BILLS: RecurringBillItem[] = [
  {
    id: 'bill-1',
    title: 'Bayar Kos',
    amount: 850_000,
    dueLabel: 'Jatuh tempo: 28 Nov 2026',
    categoryLabel: 'Tagihan',
    iconKey: 'home',
  },
  {
    id: 'bill-2',
    title: 'Langganan Server Cloud',
    amount: 150_000,
    dueLabel: 'Jatuh tempo: 25 Nov 2026',
    categoryLabel: 'Tagihan',
    iconKey: 'cloud',
  },
  {
    id: 'bill-3',
    title: 'WiFi & Kuota',
    amount: 120_000,
    dueLabel: 'Jatuh tempo: 30 Nov 2026',
    categoryLabel: 'Tagihan',
    iconKey: 'wifi',
  },
];

interface RecurringBillsSheetProps {
  visible: boolean;
  onClose: () => void;
  onRecordBill: (bill: RecurringBillItem) => void;
}

export function RecurringBillsSheet({
  visible,
  onClose,
  onRecordBill,
}: RecurringBillsSheetProps) {
  const { showToast } = useToast();
  const [recordedIds, setRecordedIds] = useState<string[]>([]);

  const handleRecord = (bill: RecurringBillItem) => {
    if (recordedIds.includes(bill.id)) return;
    onRecordBill(bill);
    setRecordedIds((prev) => [...prev, bill.id]);
    showToast(`${bill.title} (${formatIDR(bill.amount)}) tercatat`);
  };

  return (
    <BaseBottomSheet visible={visible} title="Tagihan Rutin" onClose={onClose}>
      <View style={styles.list}>
        {RECURRING_BILLS.map((bill) => {
          const isRecorded = recordedIds.includes(bill.id);

          return (
            <View key={bill.id} style={styles.card}>
              <View style={styles.iconBox}>
                {bill.iconKey === 'home' ? (
                  <Home size={18} color={Colors.primary} strokeWidth={1.9} />
                ) : bill.iconKey === 'cloud' ? (
                  <Cloud size={18} color={Colors.primary} strokeWidth={1.9} />
                ) : (
                  <Wifi size={18} color={Colors.primary} strokeWidth={1.9} />
                )}
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.title} numberOfLines={1}>
                  {bill.title}
                </Text>
                <View style={styles.dueRow}>
                  <CalendarClock size={12} color={Colors.textMuted} strokeWidth={1.9} />
                  <Text style={styles.dueText} numberOfLines={1}>
                    {bill.dueLabel}
                  </Text>
                </View>
                <Text style={[styles.amount, Typography.tabularNums]}>
                  {formatIDR(bill.amount)}
                </Text>
              </View>

              <Pressable
                onPress={() => handleRecord(bill)}
                disabled={isRecorded}
                style={({ pressed }) => [
                  styles.recordBtn,
                  isRecorded && styles.recordBtnDone,
                  pressed && !isRecorded && { opacity: 0.85 },
                ]}
              >
                {isRecorded ? (
                  <>
                    <Check size={13} color={Colors.incomeText} strokeWidth={2.4} />
                    <Text style={styles.recordBtnDoneText}>Tercatat</Text>
                  </>
                ) : (
                  <Text style={styles.recordBtnText}>Catat</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  amount: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.expense,
    marginTop: 2,
  },
  recordBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordBtnDone: {
    backgroundColor: Colors.incomeSoft,
  },
  recordBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  recordBtnDoneText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.incomeText,
  },
});
