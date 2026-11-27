import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  GoalFormSheet,
  type GoalContributePayload,
} from '@/components/budgets/GoalFormSheet';
import {
  GoalRealizeSheet,
  type GoalRealizePayload,
} from '@/components/budgets/GoalRealizeSheet';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  calculateGoalRecommendation,
  parseDeadlineMonths,
} from '@/lib/goalCalculator';
import { goalService } from '@/services/goal.service';
import { transactionService } from '@/services/transaction.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

const MILESTONES = [25, 50, 75, 100];

function CircularProgressRing({
  percentage,
  size = 86,
  strokeWidth = 8,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8EDF5"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text
        style={[
          {
            position: 'absolute',
            fontFamily: FontFamily.bold,
            fontSize: 16,
            color: Colors.textPrimary,
          },
          Typography.tabularNums,
        ]}
      >
        {Math.round(clamped)}%
      </Text>
    </View>
  );
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { goals, setGoals, wallets, refreshAllData } = useFinance();

  const goal = goals.find((g) => g.id === id);

  const [contributeOpen, setContributeOpen] = useState(false);
  const [realizeOpen, setRealizeOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTargetText, setEditTargetText] = useState('');

  if (!goal) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={styles.emptyTitle}>Target tabungan tidak ditemukan</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallbackBtn}>
          <Text style={styles.backFallbackText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  const isRealized = Boolean(goal.isRealized);
  const isDone = pct >= 100 || isRealized;
  const isReadyToRealize = pct >= 100 && !isRealized;
  const milestoneBarPct =
    pct >= 100
      ? 100
      : pct >= 75
        ? 66.66 + ((pct - 75) / 25) * 33.34
        : pct >= 50
          ? 33.33 + ((pct - 50) / 25) * 33.33
          : pct >= 25
            ? ((pct - 25) / 25) * 33.33
            : 0;
  const remaining = Math.max(0, goal.target - goal.current);
  const ringColor = isDone ? '#10B981' : '#3B7AF5';
  const rec = calculateGoalRecommendation(
    goal.current,
    goal.target,
    goal.deadline,
    goal.frequency
  );
  const monthsLeft = goal.deadline ? parseDeadlineMonths(goal.deadline) : null;

  const openEdit = () => {
    setEditName(goal.name);
    setEditTargetText(formatThousands(String(goal.target)));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const newTarget = Number(editTargetText.replace(/[^0-9]/g, ''));
    if (!editName.trim() || !Number.isFinite(newTarget) || newTarget <= 0) {
      showToast('Nama dan nominal target harus valid', 'error');
      return;
    }
    setEditOpen(false);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, name: editName.trim(), target: newTarget } : g
      )
    );
    try {
      await goalService.updateGoal(goal.id, {
        name: editName.trim(),
        targetAmount: newTarget,
      });
      await refreshAllData();
      showToast('Target tabungan diperbarui');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui target', 'error');
    }
  };

  const handleDeleteGoal = async () => {
    setConfirmDeleteOpen(false);
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    try {
      await goalService.deleteGoal(goal.id);
      await refreshAllData();
      showToast('Target tabungan dihapus');
      router.back();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus target', 'error');
    }
  };

  const handleContribute = async (payload: GoalContributePayload) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, current: g.current + payload.amount } : g
      )
    );
    try {
      await goalService.contributeGoal(goal.id, payload.amount, {
        walletId: payload.sourceWalletId,
        destinationWalletId: payload.targetWalletId,
        note: `Setoran target ${goal.name}`,
      });
      await refreshAllData();
      showToast('Tabungan berhasil ditambahkan');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyetor tabungan', 'error');
    }
  };

  const handleRealize = async (payload: GoalRealizePayload) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, isRealized: true } : g))
    );
    try {
      await transactionService.createTransaction({
        type: payload.action,
        amount: payload.amount,
        walletId: payload.sourceWalletId,
        destinationWalletId:
          payload.action === 'TRANSFER' ? payload.destinationWalletId ?? null : null,
        categoryId: null,
        note:
          payload.action === 'EXPENSE'
            ? `Realisasi target ${goal.name}`
            : `Pindah dana target ${goal.name}`,
      });
      await goalService.updateGoal(goal.id, { status: 'COMPLETED' });
      await refreshAllData();
      showToast('Dana target tabungan berhasil digunakan');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal merealisasikan target', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 10 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {goal.name}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* HERO CARD */}
        <Animated.View entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))} style={styles.heroCard}>
          <View style={styles.heroRingRow}>
            <CircularProgressRing percentage={pct} size={86} strokeWidth={8} color={ringColor} />
            <View style={styles.heroRightCol}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isDone ? Colors.incomeSoft : Colors.primarySoft },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isDone ? Colors.incomeText : Colors.primary },
                  ]}
                >
                  {isDone ? 'Tercapai' : 'Aktif'}
                </Text>
              </View>
              <Text style={styles.heroLabel}>Terkumpul</Text>
              <Text
                style={[styles.heroAmount, Typography.tabularNums]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatIDR(goal.current)}
              </Text>
              <Text style={[styles.heroSubTarget, Typography.tabularNums]}>
                dari target {formatIDR(goal.target)}
              </Text>
            </View>
          </View>

          <View style={styles.miniTilesRow}>
            <View style={styles.miniTile}>
              <Text style={styles.miniTileLabel}>Kekurangan</Text>
              <Text
                style={[
                  styles.miniTileValue,
                  Typography.tabularNums,
                  isDone && { color: Colors.incomeText },
                ]}
                numberOfLines={1}
              >
                {isDone ? 'Target Tercapai!' : formatIDR(remaining)}
              </Text>
            </View>
            <View style={styles.miniTile}>
              <Text style={styles.miniTileLabel}>Saran Nabung</Text>
              <Text style={[styles.miniTileValue, Typography.tabularNums]} numberOfLines={1}>
                {isDone
                  ? 'Selesai'
                  : rec.amount > 0
                    ? rec.compactLabel
                    : 'Fleksibel'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* KARTU MILESTONE PROGRES */}
        <View style={styles.sectionWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Milestone Progres</Text>
            <View style={styles.milestoneTrackWrap}>
              <View style={styles.milestoneLineContainer}>
                <View style={styles.milestoneBgLine} />
                <View
                  style={[
                    styles.milestoneFillLine,
                    {
                      width: `${milestoneBarPct}%`,
                      backgroundColor: isDone ? '#10B981' : '#3B7AF5',
                    },
                  ]}
                />
              </View>
              {MILESTONES.map((step) => {
                const reached = pct >= step;
                return (
                  <View key={step} style={styles.milestonePointWrap}>
                    <View
                      style={[
                        styles.milestoneDot,
                        reached && {
                          backgroundColor: '#10B981',
                          borderColor: '#10B981',
                        },
                      ]}
                    >
                      {reached ? <Check size={12} color="#FFFFFF" strokeWidth={2.8} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        Typography.tabularNums,
                        reached && { color: Colors.incomeText, fontFamily: FontFamily.semibold },
                      ]}
                    >
                      {step}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* KARTU RINCIAN TARGET */}
        <View style={styles.sectionWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rincian Target</Text>
            <View style={[styles.kvRow, styles.kvRowBorder]}>
              <Text style={styles.kvLabel}>Tenggat Waktu</Text>
              <Text style={styles.kvValue}>{goal.deadline || 'Fleksibel'}</Text>
            </View>
            <View style={[styles.kvRow, styles.kvRowBorder]}>
              <Text style={styles.kvLabel}>Status</Text>
              <Text style={[styles.kvValue, { color: isDone ? Colors.incomeText : Colors.primary }]}>
                {isDone ? 'Tercapai' : 'Aktif'}
              </Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Sisa Waktu</Text>
              <Text style={styles.kvValue}>
                {isDone
                  ? 'Sudah tercapai'
                  : monthsLeft
                    ? `${monthsLeft} bulan lagi`
                    : 'Fleksibel'}
              </Text>
            </View>
          </View>
        </View>

        {/* KELOLA TARGET (MUDAH DIJANGKAU) */}
        <View style={styles.manageRow}>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [styles.manageEditBtn, pressed && { opacity: 0.8 }]}
          >
            <Pencil size={16} color={Colors.primary} strokeWidth={2.1} />
            <Text style={styles.manageEditText}>Edit Target</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmDeleteOpen(true)}
            style={({ pressed }) => [styles.manageDeleteBtn, pressed && { opacity: 0.8 }]}
          >
            <Trash2 size={16} color={Colors.expense} strokeWidth={2.1} />
            <Text style={styles.manageDeleteText}>Hapus</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isRealized ? (
          <View style={styles.completedBanner}>
            <Check size={17} color={Colors.incomeText} strokeWidth={2.5} />
            <Text style={styles.completedBannerText}>Target Tabungan Selesai</Text>
          </View>
        ) : isReadyToRealize ? (
          <Pressable
            onPress={() => setRealizeOpen(true)}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: Colors.income },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.primaryBtnText}>Gunakan Dana</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setContributeOpen(true)}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.primaryBtnText}>Tambah Tabungan</Text>
          </Pressable>
        )}
      </View>

      <GoalFormSheet
        visible={contributeOpen}
        wallets={wallets}
        contributingGoal={goal}
        onClose={() => setContributeOpen(false)}
        onCreateGoal={() => {}}
        onContribute={(payload) => void handleContribute(payload)}
      />

      <GoalRealizeSheet
        visible={realizeOpen}
        goal={goal}
        wallets={wallets}
        onClose={() => setRealizeOpen(false)}
        onRealize={(payload) => void handleRealize(payload)}
      />

      <BaseBottomSheet
        visible={editOpen}
        title="Edit Target Tabungan"
        onClose={() => setEditOpen(false)}
        footer={
          <Pressable
            onPress={() => void handleSaveEdit()}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.primaryBtnText}>Simpan Perubahan</Text>
          </Pressable>
        }
      >
        <Text style={styles.inputLabel}>Nama Target</Text>
        <TextInput
          style={styles.textInput}
          value={editName}
          onChangeText={setEditName}
          placeholder="Nama target tabungan"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.inputLabel}>Nominal Target (Rp)</Text>
        <TextInput
          style={[styles.textInput, Typography.tabularNums]}
          value={editTargetText}
          onChangeText={(v) => setEditTargetText(formatThousands(v))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94A3B8"
        />
      </BaseBottomSheet>

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Target Tabungan?"
        message={`Target "${goal.name}" akan dihapus. Saldo dompet Anda tetap aman.`}
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteGoal()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: 18,
    marginTop: -22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  heroRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroRightCol: {
    flex: 1,
    minWidth: 0,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  heroLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  heroSubTarget: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  miniTilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  miniTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  miniTileLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  miniTileValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  sectionWrap: {
    paddingHorizontal: 18,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
  },
  cardTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  milestoneTrackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 4,
  },
  milestoneLineContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 11,
    height: 3,
    overflow: 'hidden',
    borderRadius: 99,
  },
  milestoneBgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#E8EDF5',
    borderRadius: 99,
  },
  milestoneFillLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    borderRadius: 99,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.incomeSoft,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedBannerText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.incomeText,
  },
  milestonePointWrap: {
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  kvRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  kvLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  kvValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,251,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B7AF5',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  inputLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  backFallbackBtn: {
    marginTop: 14,
    backgroundColor: '#3B7AF5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backFallbackText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  manageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  manageEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    paddingVertical: 12,
  },
  manageEditText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.primary,
  },
  manageDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
  },
  manageDeleteText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.expense,
  },
});
