import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Check, ShieldAlert, ShieldCheck, X } from 'lucide-react-native';
import { formatIDR } from '@/lib/format';
import {
  computeLiveMetrics,
  type ChatLiveContext,
  type ChatRichCardType,
} from '@/lib/mockAiChat';
import { type AiTransactionCardData } from '@/services/ai.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

interface ChatCategoryOption {
  id: string;
  label: string;
  type: 'INCOME' | 'EXPENSE';
}

interface ChatRichCardProps {
  type: ChatRichCardType;
  live?: ChatLiveContext;
  cardData?: AiTransactionCardData | null;
  actionStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  isProcessingAction?: boolean;
  categories?: ChatCategoryOption[];
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  onSelectWallet?: (walletName: string) => void;
  onSelectCategory?: (category: { id: string; label: string }) => void;
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

export function ChatRichCard({
  type,
  live,
  cardData,
  actionStatus,
  isProcessingAction = false,
  categories = [],
  onConfirmAction,
  onCancelAction,
  onSelectWallet,
  onSelectCategory,
}: ChatRichCardProps) {
  const [pickingCategory, setPickingCategory] = useState(false);
  if (type === 'WALLET_PICKER' && cardData?.wallets && cardData.wallets.length > 0) {
    return (
      <View style={styles.subCard}>
        <View style={styles.txBadgeRow}>
          <View style={[styles.txBadge, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.txBadgeText, { color: '#2563EB' }]}>
              Pilih Dompet ({formatIDR(cardData.amount)})
            </Text>
          </View>
        </View>
        <View style={styles.walletPickerList}>
          {cardData.wallets.map((w) => (
            <Pressable
              key={w.id}
              disabled={!w.sufficient || !onSelectWallet}
              onPress={() => onSelectWallet?.(w.name)}
              style={({ pressed }) => [
                styles.walletPickerBtn,
                !w.sufficient && styles.walletPickerBtnDisabled,
                pressed && w.sufficient && { opacity: 0.78 },
              ]}
            >
              <Text
                style={[
                  styles.walletPickerName,
                  !w.sufficient && styles.walletPickerTextDisabled,
                ]}
              >
                {w.name}
              </Text>
              <Text
                style={[
                  styles.walletPickerBalance,
                  Typography.tabularNums,
                  !w.sufficient && styles.walletPickerTextDisabled,
                ]}
              >
                {w.sufficient ? formatIDR(w.currentBalance) : `${formatIDR(w.currentBalance)} · Kurang`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if ((type === 'TRANSACTION_PREVIEW' || type === 'TRANSACTION_CREATED') && cardData) {
    const isIncome = cardData.type === 'INCOME';
    const isTransfer = cardData.type === 'TRANSFER';
    const amountPrefix = isIncome ? '+' : isTransfer ? '' : '-';
    const amountColor = isIncome
      ? Colors.income
      : isTransfer
        ? Colors.primary
        : Colors.expense;

    const isConfirmed =
      type === 'TRANSACTION_CREATED' || actionStatus === 'CONFIRMED';
    const isCancelled = actionStatus === 'CANCELLED';

    const balanceLabel = isConfirmed ? 'Saldo Terbaru' : 'Perkiraan Saldo';
    const balanceValue = isConfirmed
      ? cardData.newWalletBalance ?? cardData.projectedWalletBalance ?? 0
      : cardData.projectedWalletBalance ?? cardData.currentWalletBalance ?? 0;

    return (
      <View style={styles.subCard}>
        <View style={styles.txBadgeRow}>
          <View
            style={[
              styles.txBadge,
              {
                backgroundColor: isCancelled
                  ? '#F1F5F9'
                  : isConfirmed
                    ? '#ECFDF5'
                    : '#EFF6FF',
              },
            ]}
          >
            <Text
              style={[
                styles.txBadgeText,
                {
                  color: isCancelled
                    ? '#64748B'
                    : isConfirmed
                      ? '#059669'
                      : '#2563EB',
                },
              ]}
            >
              {isCancelled
                ? 'Dibatalkan'
                : isConfirmed
                  ? '✓ Tercatat Otomatis'
                  : 'Konfirmasi Pencatatan'}
            </Text>
          </View>
        </View>

        <KeyValueRow label="Catatan" value={cardData.note} />
        <KeyValueRow
          label="Nominal"
          value={`${amountPrefix}${formatIDR(cardData.amount)}`}
          valueColor={amountColor}
        />
        {!isCancelled &&
        !isConfirmed &&
        cardData.type !== 'TRANSFER' &&
        categories.length > 0 &&
        onSelectCategory ? (
          <View style={styles.kvRowBorder}>
            <Pressable
              onPress={() => setPickingCategory((prev) => !prev)}
              style={({ pressed }) => [
                styles.kvRow,
                { paddingBottom: 8 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.kvLabel}>Kategori</Text>
              <View style={styles.categoryValueWrap}>
                <Text style={[styles.kvValue, { color: Colors.textPrimary }]}>
                  {cardData.categoryName ?? 'Lainnya'}
                </Text>
                <Text style={styles.categoryChangeBadge}>
                  {pickingCategory ? 'Tutup' : 'Ubah'}
                </Text>
              </View>
            </Pressable>
            {pickingCategory ? (
              <ScrollView
                style={styles.categoryChipScroll}
                contentContainerStyle={styles.categoryChipWrap}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {categories
                  .filter((c) => c.type === cardData.type)
                  .map((c) => {
                    const active = c.id === cardData.categoryId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          onSelectCategory({ id: c.id, label: c.label });
                          setPickingCategory(false);
                        }}
                        style={({ pressed }) => [
                          styles.categoryChip,
                          active && styles.categoryChipActive,
                          pressed && { opacity: 0.75 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            active && styles.categoryChipTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            ) : null}
          </View>
        ) : (
          <KeyValueRow label="Kategori" value={cardData.categoryName ?? 'Lainnya'} />
        )}
        <KeyValueRow
          label="Dompet"
          value={
            isTransfer && cardData.destinationWalletName
              ? `${cardData.walletName ?? ''} → ${cardData.destinationWalletName}`
              : cardData.walletName ?? '-'
          }
        />
        <KeyValueRow
          label={balanceLabel}
          value={formatIDR(balanceValue)}
          isLast={isCancelled}
        />

        {!isCancelled && !isConfirmed ? (
          <View style={styles.txActionRow}>
            <Pressable
              onPress={onCancelAction}
              disabled={isProcessingAction}
              style={({ pressed }) => [
                styles.txCancelBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <X size={14} color="#64748B" strokeWidth={2.2} />
              <Text style={styles.txCancelText}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={onConfirmAction}
              disabled={isProcessingAction}
              style={({ pressed }) => [
                styles.txConfirmBtn,
                pressed && { opacity: 0.85 },
                isProcessingAction && { opacity: 0.65 },
              ]}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.txConfirmText}>
                {isProcessingAction ? 'Menyimpan...' : 'Konfirmasi'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isCancelled && isConfirmed && cardData.transactionId && onCancelAction ? (
          <View style={styles.txActionRow}>
            <Pressable
              onPress={onCancelAction}
              disabled={isProcessingAction}
              style={({ pressed }) => [
                styles.txUndoBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.txUndoText}>
                {isProcessingAction ? 'Membatalkan...' : 'Batalkan'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  const m = computeLiveMetrics(live);

  if (type === 'SUMMARY') {
    const scoreColor =
      m.healthScore >= 80 ? Colors.income : Colors.warningText;
    return (
      <View style={styles.subCard}>
        <KeyValueRow
          label="Skor Kesehatan"
          value={`${m.healthScore} / 100 · ${m.healthLabel}`}
          valueColor={scoreColor}
        />
        <KeyValueRow
          label={live?.hasCompletedSetup ? 'Batas Aman Harian' : 'Burn Rate Harian'}
          value={
            live?.hasCompletedSetup
              ? `${formatIDR(live.userProfile.safeDailyLimit)} / hr`
              : `${formatIDR(m.burnRate)} / hr`
          }
        />
        <KeyValueRow
          label="Sisa Anggaran"
          value={formatIDR(m.remainingBudget)}
          valueColor={Colors.primary}
          isLast
        />
      </View>
    );
  }

  if (type === 'FORECAST') {
    const surplusPrefix = m.projectedSurplus >= 0 ? '+' : '-';
    return (
      <View style={styles.subCard}>
        <KeyValueRow
          label="Laju Pengeluaran"
          value={`${formatIDR(m.burnRate)} / hr`}
        />
        <KeyValueRow
          label="Proyeksi Pengeluaran"
          value={formatIDR(m.projectedExpense)}
          valueColor={Colors.expense}
        />
        <KeyValueRow
          label="Estimasi Akhir Bulan"
          value={`${surplusPrefix}${formatIDR(Math.abs(m.projectedSurplus))}`}
          valueColor={m.projectedSurplus >= 0 ? Colors.income : Colors.expense}
          isLast
        />
      </View>
    );
  }

  if (type === 'ANOMALY') {
    if (live) {
      const alerts = live.budgets.filter(
        (b) => b.limit > 0 && (b.spent / b.limit) * 100 >= b.alertThresholdPct
      );
      if (alerts.length === 0) {
        return (
          <View style={styles.subCard}>
            <View style={styles.alignedRow}>
              <View style={[styles.iconBadge, { backgroundColor: Colors.incomeSoft }]}>
                <ShieldCheck size={13} color={Colors.income} strokeWidth={2.1} />
              </View>
              <View style={styles.alignedBody}>
                <Text style={[styles.alignedTitle, { color: Colors.incomeText }]}>
                  Semua Kategori Aman
                </Text>
                <Text style={styles.alignedSub}>
                  Belum ada kategori yang mendekati atau melewati batas anggaran.
                </Text>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.subCard}>
          {alerts.slice(0, 3).map((b, idx) => {
            const pct = Math.round((b.spent / b.limit) * 100);
            const isOver = pct >= 100;
            return (
              <View
                key={b.id}
                style={[styles.alignedRow, idx > 0 && styles.rowTopDivider]}
              >
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: isOver ? Colors.expenseSoft : Colors.warningSoft },
                  ]}
                >
                  {isOver ? (
                    <ShieldAlert size={13} color={Colors.expense} strokeWidth={2.1} />
                  ) : (
                    <AlertTriangle size={13} color={Colors.warning} strokeWidth={2.1} />
                  )}
                </View>
                <View style={styles.alignedBody}>
                  <Text
                    style={[
                      styles.alignedTitle,
                      { color: isOver ? Colors.expenseText : Colors.warningText },
                    ]}
                  >
                    {b.name} · {pct}%
                  </Text>
                  <Text style={styles.alignedSub}>
                    Terpakai {formatIDR(b.spent)} dari batas {formatIDR(b.limit)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

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
    flexShrink: 1,
    minWidth: 0,
  },
  kvValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    flexShrink: 0,
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
  txBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  txBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  txBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
  },
  txActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  txCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  txCancelText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#475569',
  },
  txConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  txConfirmText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  txUndoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  txUndoText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.expense,
  },
  walletPickerList: {
    gap: 7,
    marginTop: 2,
  },
  walletPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  walletPickerBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  walletPickerName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
  walletPickerBalance: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#475569',
  },
  walletPickerTextDisabled: {
    color: '#94A3B8',
  },
  categoryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChangeBadge: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  categoryChipScroll: {
    maxHeight: 132,
  },
  categoryChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: '#475569',
  },
  categoryChipTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
});
