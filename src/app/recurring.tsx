import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { FocusTextInput } from '@/components/ui/FocusTextInput';
import { useToast } from '@/components/ui/ToastProvider';
import {
  useFinance,
  type RecurringFrequency,
  type RecurringIconKey,
  type RecurringScheduleItem,
} from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { recurringService } from '@/services/recurring.service';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Cloud,
  Home,
  Plus,
  Wifi,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RecurringType = 'EXPENSE' | 'INCOME';

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function advanceDateLabel(current: string, frequency: RecurringFrequency): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const parts = current.trim().split(/\s+/);
  if (parts.length < 3) return 'Bulan depan';
  const day = Number(parts[0]) || 1;
  const mIdx = months.findIndex((m) => m.toLowerCase() === parts[1].toLowerCase());
  const year = Number(parts[2]) || 2026;
  if (mIdx === -1) return 'Bulan depan';

  if (frequency === 'Mingguan') {
    const nextDay = day + 7;
    if (nextDay <= 28) {
      return `${String(nextDay).padStart(2, '0')} ${months[mIdx]} ${year}`;
    }
    const nextM = (mIdx + 1) % 12;
    const nextY = mIdx === 11 ? year + 1 : year;
    return `${String(nextDay - 28).padStart(2, '0')} ${months[nextM]} ${nextY}`;
  }

  const nextM = (mIdx + 1) % 12;
  const nextY = mIdx === 11 ? year + 1 : year;
  return `${String(day).padStart(2, '0')} ${months[nextM]} ${nextY}`;
}

function renderScheduleIcon(key: RecurringIconKey, color: string) {
  switch (key) {
    case 'home':
      return <Home size={19} color={color} strokeWidth={1.9} />;
    case 'cloud':
      return <Cloud size={19} color={color} strokeWidth={1.9} />;
    case 'wifi':
      return <Wifi size={19} color={color} strokeWidth={1.9} />;
    case 'briefcase':
      return <Briefcase size={19} color={color} strokeWidth={1.9} />;
  }
}

export default function RecurringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    recurringSchedules: schedules,
    setRecurringSchedules: setSchedules,
    wallets,
    categories,
    refreshAllData,
  } = useFinance();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringScheduleItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [type, setType] = useState<RecurringType>('EXPENSE');
  const [frequency, setFrequency] = useState<RecurringFrequency>('Bulanan');
  const [dueDate, setDueDate] = useState('01 Des 2026');

  const summary = useMemo(() => {
    const activeItems = schedules.filter((s) => s.active);
    const monthlyExpense = activeItems
      .filter((s) => s.type === 'EXPENSE')
      .reduce((sum, s) => sum + (s.frequency === 'Mingguan' ? s.amount * 4 : s.amount), 0);
    return { activeCount: activeItems.length, monthlyExpense };
  }, [schedules]);

  const openAddSheet = () => {
    setEditingItem(null);
    setTitle('');
    setAmountText('');
    setType('EXPENSE');
    setFrequency('Bulanan');
    setDueDate('01 Des 2026');
    setSheetOpen(true);
  };

  const openEditSheet = (item: RecurringScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setAmountText(formatThousands(String(item.amount)));
    setType(item.type);
    setFrequency(item.frequency);
    setDueDate(item.nextDueDate);
    setSheetOpen(true);
  };

  const handleSaveSchedule = async () => {
    const trimmed = title.trim();
    const numericAmount = Number(amountText.replace(/[^0-9]/g, ''));
    if (!trimmed) {
      showToast('Masukkan nama jadwal rutin', 'error');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('Masukkan nominal lebih dari 0', 'error');
      return;
    }

    const backendFreq = frequency === 'Mingguan' ? 'WEEKLY' : 'MONTHLY';

    if (editingItem) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editingItem.id
            ? {
              ...s,
              title: trimmed,
              amount: numericAmount,
              type,
              frequency,
              nextDueDate: dueDate.trim() || s.nextDueDate,
              iconKey: type === 'INCOME' ? 'briefcase' : s.iconKey,
            }
            : s
        )
      );
      setSheetOpen(false);
      try {
        await recurringService.updateRecurring(editingItem.id, {
          title: trimmed,
          type,
          amount: numericAmount,
          frequency: backendFreq,
        });
        await refreshAllData();
        showToast('Jadwal rutin diperbarui');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal memperbarui jadwal', 'error');
      }
    } else {
      const targetWallet = wallets.find((w) => !w.isArchived) ?? wallets[0];
      if (!targetWallet) {
        showToast('Tambahkan dompet aktif terlebih dahulu', 'error');
        return;
      }
      const matchedCat = categories.find((c) => c.type === type);
      const nextItem: RecurringScheduleItem = {
        id: `rec-${Date.now()}`,
        title: trimmed,
        amount: numericAmount,
        type,
        frequency,
        nextDueDate: dueDate.trim() || '01 Des 2026',
        active: true,
        iconKey: type === 'INCOME' ? 'briefcase' : 'cloud',
      };
      setSchedules((prev) => [nextItem, ...prev]);
      setSheetOpen(false);
      try {
        await recurringService.createRecurring({
          walletId: targetWallet.id,
          categoryId: matchedCat?.id ?? null,
          title: trimmed,
          type,
          amount: numericAmount,
          frequency: backendFreq,
        });
        await refreshAllData();
        showToast(`Jadwal "${trimmed}" ditambahkan`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal menambah jadwal', 'error');
      }
    }
  };

  const handleRecordNow = async (item: RecurringScheduleItem) => {
    const targetWallet =
      (item.walletId ? wallets.find((w) => w.id === item.walletId) : undefined) ??
      wallets.find((w) => !w.isArchived) ??
      wallets[0];
    if (!targetWallet) {
      showToast('Tambahkan dompet aktif terlebih dahulu', 'error');
      return;
    }
    if (item.type === 'EXPENSE' && targetWallet.balance < item.amount) {
      showToast(
        `Saldo ${targetWallet.name} tidak cukup, sisa saat ini ${formatIDR(targetWallet.balance)}`,
        'error'
      );
      return;
    }

    const nextDate = advanceDateLabel(item.nextDueDate, item.frequency);
    setSchedules((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, nextDueDate: nextDate } : s))
    );
    try {
      await recurringService.executeRecurring(item.id);
      await refreshAllData();
      showToast(`${item.title} (${formatIDR(item.amount)}) tercatat ke ${targetWallet.name}`);
    } catch (err) {
      await refreshAllData();
      showToast(err instanceof Error ? err.message : 'Gagal mencatat transaksi rutin', 'error');
    }
  };

  const handleToggleActive = async (id: string, val: boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: val } : s))
    );
    try {
      await recurringService.updateRecurring(id, { isActive: val });
      await refreshAllData();
      showToast(val ? 'Jadwal diaktifkan' : 'Jadwal dinonaktifkan');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status jadwal', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 28 }}
      >
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <View style={styles.topNav}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Text style={styles.navTitle}>Tagihan Rutin</Text>
            <Pressable
              onPress={openAddSheet}
              accessibilityRole="button"
              accessibilityLabel="Tambah jadwal rutin"
              style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.8 }]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addPillText}>Tambah</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* OVERLAPPING SUMMARY CARD */}
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.summaryCard}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.summaryCaption}>ESTIMASI TAGIHAN BULAN INI</Text>
            <Text
              style={[styles.summaryAmount, Typography.tabularNums]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatIDR(summary.monthlyExpense)}
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <Text style={[styles.activeBadgeText, Typography.tabularNums]}>
              {summary.activeCount} Aktif
            </Text>
          </View>
        </Animated.View>

        {/* SCHEDULE CARDS LIST */}
        <View style={styles.listWrap}>
          {schedules.map((item, idx) => {
            const isIncome = item.type === 'INCOME';
            const iconBg = isIncome ? Colors.incomeSoft : Colors.primarySoft;
            const iconColor = isIncome ? Colors.income : Colors.primary;

            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(Math.min(idx * 55, 220))
                  .duration(320)
                  .easing(Easing.out(Easing.cubic))}
              >
                <Pressable
                  onPress={() => openEditSheet(item)}
                  style={({ pressed }) => [
                    styles.card,
                    !item.active && styles.cardInactive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                      {renderScheduleIcon(item.iconKey, iconColor)}
                    </View>

                    <View style={styles.titleCol}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.freqBadge}>
                          <Text style={styles.freqBadgeText}>{item.frequency}</Text>
                        </View>
                      </View>

                      <View style={styles.dueRow}>
                        <CalendarClock size={12} color={Colors.textMuted} strokeWidth={1.9} />
                        <Text style={styles.dueText} numberOfLines={1}>
                          Berikutnya: {item.nextDueDate}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={item.active}
                      onValueChange={(val) => handleToggleActive(item.id, val)}
                      trackColor={{ false: '#E2E8F0', true: '#3B7AF5' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.cardBottom}>
                    <Text
                      style={[
                        styles.cardAmount,
                        Typography.tabularNums,
                        { color: isIncome ? Colors.income : Colors.textPrimary },
                      ]}
                    >
                      {isIncome ? '+' : ''}
                      {formatIDR(item.amount)}
                    </Text>

                    <Pressable
                      onPress={() => handleRecordNow(item)}
                      disabled={!item.active}
                      style={({ pressed }) => [
                        styles.recordBtn,
                        !item.active && { opacity: 0.45 },
                        pressed && item.active && { backgroundColor: Colors.primaryDark },
                      ]}
                    >
                      <Text style={styles.recordBtnText}>Catat Sekarang</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* ADD / EDIT RECURRING SCHEDULE SHEET */}
      <BaseBottomSheet
        visible={sheetOpen}
        title={editingItem ? 'Edit Jadwal Rutin' : 'Tambah Jadwal Rutin'}
        onClose={() => setSheetOpen(false)}
        footer={
          <Pressable
            onPress={handleSaveSchedule}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Text style={styles.saveBtnText}>Simpan Jadwal</Text>
          </Pressable>
        }
      >
        <View style={styles.typeTabs}>
          {(
            [
              { key: 'EXPENSE', label: 'Pengeluaran' },
              { key: 'INCOME', label: 'Pemasukan' },
            ] as { key: RecurringType; label: string }[]
          ).map((t) => {
            const active = type === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setType(t.key)}
                style={[styles.typeTab, active && styles.typeTabActive]}
              >
                <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Nama Jadwal</Text>
        <FocusTextInput
          style={styles.input}
          placeholder="Contoh: Bayar Kos, Netflix, Gaji"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Nominal (Rp)</Text>
        <View style={styles.amountBox}>
          <Text style={styles.rpPrefix}>Rp</Text>
          <FocusTextInput
            showFocusBorder={false}
            style={[styles.amountInput, Typography.tabularNums]}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={amountText}
            onChangeText={(val) => setAmountText(formatThousands(val))}
          />
        </View>

        <Text style={styles.label}>Frekuensi</Text>
        <View style={styles.freqRow}>
          {(['Bulanan', 'Mingguan'] as RecurringFrequency[]).map((f) => {
            const selected = frequency === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[styles.freqChip, selected && styles.freqChipSelected]}
              >
                <Text style={[styles.freqChipText, selected && styles.freqChipTextSelected]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Jatuh Tempo Berikutnya</Text>
        <FocusTextInput
          style={styles.input}
          placeholder="Contoh: 01 Des 2026"
          placeholderTextColor="#94A3B8"
          value={dueDate}
          onChangeText={setDueDate}
        />
      </BaseBottomSheet>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 3,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  blueHeader: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minHeight: 36,
  },
  addPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...CARD_SHADOW,
  },
  summaryCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.7,
  },
  summaryAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 3,
  },
  activeBadge: {
    flexShrink: 0,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },

  listWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    ...CARD_SHADOW,
  },
  cardInactive: {
    opacity: 0.65,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  freqBadge: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  freqBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cardAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    flexShrink: 0,
  },
  recordBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },

  typeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  typeTabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  typeTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  typeTabTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.textMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 10,
  },
  freqChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  freqChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  freqChipTextSelected: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
