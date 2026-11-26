import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  ChevronRight,
  EyeOff,
  HelpCircle,
  Info,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  UserPen,
} from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryManagerSheet } from '@/components/modals/CategoryManagerSheet';
import { RecurringBillsSheet } from '@/components/modals/RecurringBillsSheet';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

const AUDIT_LOGS = [
  {
    id: 'log-1',
    action: 'AUTH_LOGIN',
    detail: 'Masuk berhasil via Expo Go',
    device: 'Android · Redmi Note 12',
    time: 'Hari ini, 09:42',
    badgeBg: '#ECFDF5',
    badgeColor: '#047857',
  },
  {
    id: 'log-2',
    action: 'AI_GENERATE',
    detail: 'Pembaruan analisis & prediksi arus kas',
    device: 'Gemini AI Cloud',
    time: 'Hari ini, 09:30',
    badgeBg: '#EBF2FF',
    badgeColor: '#2563EB',
  },
  {
    id: 'log-3',
    action: 'TX_CREATE',
    detail: 'Mencatat pengeluaran Makan Siang Rp 45.000',
    device: 'Android · Redmi Note 12',
    time: 'Kemarin, 12:35',
    badgeBg: '#F8FAFC',
    badgeColor: '#475569',
  },
  {
    id: 'log-4',
    action: 'BUDGET_UPDATE',
    detail: 'Mengubah batas anggaran Makanan & Minuman',
    device: 'Android · Redmi Note 12',
    time: '20 Nov 2026, 18:10',
    badgeBg: '#FFFBEB',
    badgeColor: '#B45309',
  },
];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    wallets,
    transactions,
    updateUserProfile,
    resetDemoData,
    startTutorial,
  } = useFinance();

  const name = userProfile.name;
  const email = userProfile.email;
  const incomeTarget = userProfile.monthlyIncomeTarget;

  // Preferences state
  const [budgetNotifEnabled, setBudgetNotifEnabled] = useState(true);
  const hideBalanceOnOpen = userProfile.hideBalanceOnOpen;

  // Sheets & dialogs
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [recurringSheetOpen, setRecurringSheetOpen] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Edit profile form
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftTarget, setDraftTarget] = useState(formatThousands(String(incomeTarget)));

  // Change password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'YS';

  const openEditProfile = () => {
    setDraftName(name);
    setDraftEmail(email);
    setDraftTarget(formatThousands(String(incomeTarget)));
    setEditProfileOpen(true);
  };

  const handleSaveProfile = () => {
    const trimmedName = draftName.trim();
    const trimmedEmail = draftEmail.trim();
    if (trimmedName.length < 2) {
      showToast('Nama minimal 2 karakter', 'error');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Masukkan alamat email yang valid', 'error');
      return;
    }
    const targetNum = Number(draftTarget.replace(/[^0-9]/g, '')) || 0;
    updateUserProfile({
      name: trimmedName,
      email: trimmedEmail,
      monthlyIncomeTarget: targetNum,
    });
    setEditProfileOpen(false);
    showToast('Profil & target pemasukan diperbarui');
  };

  const handleSavePassword = () => {
    if (!oldPassword) {
      showToast('Masukkan password lama Anda', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password baru minimal 8 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSheetOpen(false);
    showToast('Password berhasil diperbarui');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 28 }}
      >
        {/* SECTION 1 — HEADER PROFIL BIRU */}
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
            <Text style={styles.navTitle}>Profil & Pengaturan</Text>
            <View style={styles.backPlaceholder} />
          </View>

          <View style={styles.identityWrap}>
            <View style={styles.avatarRing}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userEmail}>{email}</Text>
            <View style={styles.memberPill}>
              <Text style={styles.memberPillText}>Member Smart Finance • Aktif</Text>
            </View>
          </View>
        </LinearGradient>

        {/* SECTION 2 — KARTU STATISTIK MINI MENUMPANG */}
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.statsCard}
        >
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, Typography.tabularNums]}>
              {wallets.length}
            </Text>
            <Text style={styles.statLabel}>Dompet</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={[styles.statNumber, Typography.tabularNums]}>
              {transactions.length}
            </Text>
            <Text style={styles.statLabel}>Transaksi</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text
              style={[
                styles.statNumber,
                Typography.tabularNums,
                { color: Colors.income },
              ]}
            >
              84/100
            </Text>
            <Text style={styles.statLabel}>Skor AI</Text>
          </View>
        </Animated.View>

        {/* SECTION 3 — 3 GRUP MENU PENGATURAN */}
        <View style={styles.groupsWrap}>
          {/* GRUP 1: AKUN & KEUANGAN */}
          <View style={styles.groupBlock}>
            <Text style={styles.groupTitle}>Akun & Keuangan</Text>
            <View style={styles.menuCard}>
              <MenuRow
                icon={<UserPen size={18} color="#3B7AF5" strokeWidth={1.9} />}
                iconBg="#EBF2FF"
                title="Edit Profil & Target Pemasukan"
                onPress={openEditProfile}
              />
              <MenuRow
                icon={<Tag size={18} color="#0D9488" strokeWidth={1.9} />}
                iconBg="#F0FDFA"
                title="Kelola Kategori Kustom"
                onPress={() => router.push('/categories')}
                showDivider
              />
              <MenuRow
                icon={<CalendarClock size={18} color="#EF4444" strokeWidth={1.9} />}
                iconBg="#FEF2F2"
                title="Jadwal Tagihan Rutin"
                onPress={() => router.push('/recurring')}
                showDivider
              />
              <MenuRow
                icon={<SlidersHorizontal size={18} color="#3B7AF5" strokeWidth={1.9} />}
                iconBg="#EBF2FF"
                title="Atur Ulang Blueprint Keuangan"
                onPress={() => router.push('/setup')}
                showDivider
              />
              <MenuRow
                icon={<RotateCcw size={18} color="#F59E0B" strokeWidth={1.9} />}
                iconBg="#FFFBEB"
                title="Muat Ulang Data Demo"
                onPress={() => {
                  resetDemoData();
                  showToast('Data demo berhasil dimuat ulang');
                  router.replace('/(tabs)');
                }}
                showDivider
              />
            </View>
          </View>

          {/* GRUP 2: KEAMANAN & PREFERENSI */}
          <View style={styles.groupBlock}>
            <Text style={styles.groupTitle}>Keamanan & Preferensi</Text>
            <View style={styles.menuCard}>
              <MenuRow
                icon={<KeyRound size={18} color="#2563EB" strokeWidth={1.9} />}
                iconBg="#EBF2FF"
                title="Ubah Password"
                onPress={() => setPasswordSheetOpen(true)}
              />

              <View style={[styles.menuRow, styles.rowDivider]}>
                <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
                  <BellRing size={18} color="#F59E0B" strokeWidth={1.9} />
                </View>
                <Text style={styles.menuLabel} numberOfLines={1}>
                  Notifikasi Peringatan Anggaran
                </Text>
                <Switch
                  value={budgetNotifEnabled}
                  onValueChange={(val) => {
                    setBudgetNotifEnabled(val);
                    showToast(
                      val
                        ? 'Notifikasi peringatan anggaran diaktifkan'
                        : 'Notifikasi peringatan anggaran dimatikan'
                    );
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#3B7AF5' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.menuRow, styles.rowDivider]}>
                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
                  <EyeOff size={18} color="#475569" strokeWidth={1.9} />
                </View>
                <Text style={styles.menuLabel} numberOfLines={1}>
                  Sembunyikan Saldo Saat Dibuka
                </Text>
                <Switch
                  value={hideBalanceOnOpen}
                  onValueChange={(val) => {
                    updateUserProfile({ hideBalanceOnOpen: val });
                    showToast(
                      val
                        ? 'Saldo disembunyikan di Beranda & Dompet'
                        : 'Saldo ditampilkan di Beranda & Dompet'
                    );
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#3B7AF5' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <MenuRow
                icon={<ShieldCheck size={18} color="#10B981" strokeWidth={1.9} />}
                iconBg="#ECFDF5"
                title="Aktivitas Keamanan (Audit Log)"
                onPress={() => setAuditLogOpen(true)}
                showDivider
              />
            </View>
          </View>

          {/* GRUP 3: TENTANG SMART FINANCE */}
          <View style={styles.groupBlock}>
            <Text style={styles.groupTitle}>Tentang Smart Finance</Text>
            <View style={styles.menuCard}>
              <View style={styles.aboutRow}>
                <View style={[styles.iconBox, { backgroundColor: '#EBF2FF' }]}>
                  <Info size={18} color="#3B7AF5" strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.aboutTitle}>Smart Finance Mobile v1.0</Text>
                  <Text style={styles.aboutSub}>
                    Cloud Computing • Arsitektur Decoupled (Expo + Express + Gemini AI)
                  </Text>
                </View>
              </View>

              <MenuRow
                icon={<HelpCircle size={18} color="#3B7AF5" strokeWidth={1.9} />}
                iconBg="#EBF2FF"
                title="Ulangi Panduan Aplikasi"
                onPress={() => {
                  startTutorial();
                  router.replace('/(tabs)');
                }}
                showDivider
              />
            </View>
          </View>

          {/* SECTION 4 — TOMBOL KELUAR */}
          <Pressable
            onPress={() => setLogoutConfirmOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari Akun"
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <LogOut size={18} color={Colors.expense} strokeWidth={2} />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* SHEET 1: EDIT PROFIL & TARGET PEMASUKAN */}
      <BaseBottomSheet
        visible={editProfileOpen}
        title="Edit Profil & Target"
        onClose={() => setEditProfileOpen(false)}
        footer={
          <Pressable
            onPress={handleSaveProfile}
            style={({ pressed }) => [
              styles.sheetSaveBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Text style={styles.sheetSaveText}>Simpan Perubahan</Text>
          </Pressable>
        }
      >
        <Text style={styles.sheetLabel}>Nama Lengkap</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="Nama lengkap"
          placeholderTextColor="#94A3B8"
          value={draftName}
          onChangeText={setDraftName}
        />

        <Text style={styles.sheetLabel}>Alamat Email</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="nama@email.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={draftEmail}
          onChangeText={setDraftEmail}
        />

        <Text style={styles.sheetLabel}>Target Pemasukan Bulanan (Rp)</Text>
        <View style={styles.amountBox}>
          <Text style={styles.rpPrefix}>Rp</Text>
          <TextInput
            style={[styles.amountInput, Typography.tabularNums]}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={draftTarget}
            onChangeText={(val) => setDraftTarget(formatThousands(val))}
          />
        </View>
      </BaseBottomSheet>

      {/* SHEET 2: KELOLA KATEGORI KUSTOM */}
      <CategoryManagerSheet
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
      />

      {/* SHEET 3: JADWAL TAGIHAN RUTIN */}
      <RecurringBillsSheet
        visible={recurringSheetOpen}
        onClose={() => setRecurringSheetOpen(false)}
        onRecordBill={() => {}}
      />

      {/* SHEET 4: UBAH PASSWORD */}
      <BaseBottomSheet
        visible={passwordSheetOpen}
        title="Ubah Password"
        onClose={() => setPasswordSheetOpen(false)}
        footer={
          <Pressable
            onPress={handleSavePassword}
            style={({ pressed }) => [
              styles.sheetSaveBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Text style={styles.sheetSaveText}>Simpan Password</Text>
          </Pressable>
        }
      >
        <Text style={styles.sheetLabel}>Password Lama</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="Masukkan password saat ini"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
        />

        <Text style={styles.sheetLabel}>Password Baru (Min. 8 Karakter)</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="Minimal 8 karakter"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.sheetLabel}>Konfirmasi Password Baru</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="Ulangi password baru"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </BaseBottomSheet>

      {/* SHEET 5: AKTIVITAS KEAMANAN (AUDIT LOG) */}
      <BaseBottomSheet
        visible={auditLogOpen}
        title="Aktivitas Keamanan"
        onClose={() => setAuditLogOpen(false)}
      >
        <View style={styles.auditList}>
          {AUDIT_LOGS.map((log) => (
            <View key={log.id} style={styles.auditCard}>
              <View style={styles.auditTop}>
                <View style={[styles.auditBadge, { backgroundColor: log.badgeBg }]}>
                  <Text style={[styles.auditBadgeText, { color: log.badgeColor }]}>
                    {log.action}
                  </Text>
                </View>
                <Text style={styles.auditTime}>{log.time}</Text>
              </View>
              <Text style={styles.auditDetail}>{log.detail}</Text>
              <Text style={styles.auditDevice}>{log.device}</Text>
            </View>
          ))}
        </View>
      </BaseBottomSheet>

      {/* DIALOG KONFIRMASI KELUAR */}
      <ConfirmDialog
        visible={logoutConfirmOpen}
        title="Keluar dari Akun?"
        message="Anda perlu masuk kembali untuk mengakses data keuangan Smart Finance."
        confirmLabel="Keluar"
        variant="danger"
        icon="logout"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          showToast('Berhasil keluar dari akun');
          router.replace('/login');
        }}
      />
    </View>
  );
}

function MenuRow({
  icon,
  iconBg,
  title,
  onPress,
  showDivider = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        showDivider && styles.rowDivider,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.menuLabel} numberOfLines={1}>
        {title}
      </Text>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={1.9} />
    </Pressable>
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
    paddingBottom: 38,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16.5,
    color: '#FFFFFF',
  },
  backPlaceholder: {
    width: TouchTarget.minSize,
  },
  identityWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  avatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  memberPill: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  memberPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  statsCard: {
    marginHorizontal: 16,
    marginTop: -22,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
  },

  groupsWrap: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 18,
  },
  groupBlock: {
    gap: 8,
  },
  groupTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    ...CARD_SHADOW,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  aboutTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  aboutSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },

  logoutBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.expenseSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.expense,
  },

  sheetLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  sheetInput: {
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
  sheetSaveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSaveText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  auditList: {
    gap: 10,
  },
  auditCard: {
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  auditTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  auditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  auditBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
  },
  auditTime: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  auditDetail: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  auditDevice: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
});
