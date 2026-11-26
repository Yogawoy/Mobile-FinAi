import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, LogOut, Sparkles, Tag } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

interface ProfileSheetProps {
  visible: boolean;
  userName: string;
  monthlyIncomeTarget: number;
  onClose: () => void;
  onSaveProfile: (name: string, incomeTarget: number) => void;
  onOpenCategories: () => void;
  onLogout: () => void;
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function ProfileSheet({
  visible,
  userName,
  monthlyIncomeTarget,
  onClose,
  onSaveProfile,
  onOpenCategories,
  onLogout,
}: ProfileSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(userName);
  const [targetText, setTargetText] = useState(
    formatThousands(String(monthlyIncomeTarget))
  );
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(userName);
    setTargetText(formatThousands(String(monthlyIncomeTarget)));
  }, [visible, userName, monthlyIncomeTarget]);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'YS';

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showToast('Nama minimal 2 karakter', 'error');
      return;
    }
    const targetNum = Number(targetText.replace(/[^0-9]/g, '')) || 0;
    onSaveProfile(trimmed, targetNum);
    showToast('Profil berhasil diperbarui');
    onClose();
  };

  return (
    <>
      <BaseBottomSheet visible={visible} title="Profil Saya" onClose={onClose}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {name || 'Yoga Saputra'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              yoga@smartfinance.id
            </Text>
            <View style={styles.scorePill}>
              <Sparkles size={12} color={Colors.primary} strokeWidth={2} />
              <Text style={[styles.scoreText, Typography.tabularNums]}>
                Skor AI: 84/100
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Nama Tampilan</Text>
        <TextInput
          style={styles.input}
          placeholder="Nama lengkap"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Target Pemasukan Bulanan (Rp)</Text>
        <View style={styles.amountBox}>
          <Text style={styles.rpPrefix}>Rp</Text>
          <TextInput
            style={[styles.amountInput, Typography.tabularNums]}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={targetText}
            onChangeText={(val) => setTargetText(formatThousands(val))}
          />
        </View>

        <Pressable
          onPress={() => {
            onClose();
            onOpenCategories();
          }}
          style={({ pressed }) => [
            styles.menuBtn,
            pressed && { backgroundColor: Colors.canvas },
          ]}
        >
          <View style={styles.menuLeft}>
            <View style={styles.menuIconBox}>
              <Tag size={17} color={Colors.primary} strokeWidth={1.9} />
            </View>
            <Text style={styles.menuText}>Kelola Kategori Kustom</Text>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} strokeWidth={1.9} />
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setLogoutConfirmOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <LogOut size={17} color={Colors.expense} strokeWidth={1.9} />
            <Text style={styles.logoutText}>Keluar</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Simpan Profil"
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Text style={styles.saveText}>Simpan Profil</Text>
          </Pressable>
        </View>
      </BaseBottomSheet>

      <ConfirmDialog
        visible={logoutConfirmOpen}
        title="Keluar dari Akun?"
        message="Anda akan kembali ke halaman masuk Smart Finance."
        confirmLabel="Keluar"
        variant="danger"
        icon="logout"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          onClose();
          onLogout();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primarySoft,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.primary,
  },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scorePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 6,
  },
  scoreText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 14,
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
    height: 48,
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
    fontSize: 17,
    color: Colors.textPrimary,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    minHeight: 52,
    marginTop: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  logoutBtn: {
    minHeight: TouchTarget.minSize + 4,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: Colors.expenseSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoutText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.expense,
  },
  saveBtn: {
    flex: 1,
    minHeight: TouchTarget.minSize + 4,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
