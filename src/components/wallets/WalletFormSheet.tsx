import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { type WalletItem } from '@/src/lib/mockData';
import {
  getWalletTheme,
  WALLET_COLOR_OPTIONS,
  type WalletColorKey,
  type WalletTypeKey,
} from '@/src/lib/walletTheme';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/src/theme/tokens';
import { RealisticWalletCard } from './RealisticWalletCard';

export interface WalletFormSubmitPayload {
  id?: string;
  name: string;
  type: WalletTypeKey;
  balance: number;
  last4: string;
  colorKey: WalletColorKey;
}

interface WalletFormSheetProps {
  visible: boolean;
  editingWallet?: WalletItem | null;
  onClose: () => void;
  onSubmit: (payload: WalletFormSubmitPayload) => void;
}

const WALLET_TYPES: { key: WalletTypeKey; label: string; defaultColor: WalletColorKey }[] = [
  { key: 'BANK', label: 'Bank', defaultColor: 'royal' },
  { key: 'EWALLET', label: 'E-Wallet', defaultColor: 'teal' },
  { key: 'SAVINGS', label: 'Tabungan', defaultColor: 'navy' },
  { key: 'CASH', label: 'Tunai', defaultColor: 'slate' },
];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function WalletFormSheet({
  visible,
  editingWallet,
  onClose,
  onSubmit,
}: WalletFormSheetProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletTypeKey>('BANK');
  const [balanceText, setBalanceText] = useState('');
  const [last4, setLast4] = useState('');
  const [colorKey, setColorKey] = useState<WalletColorKey>('royal');

  useEffect(() => {
    if (!visible) return;
    if (editingWallet) {
      setName(editingWallet.name);
      const normalizedType =
        editingWallet.type === 'E_WALLET' ? 'EWALLET' : editingWallet.type;
      setType(normalizedType);
      setBalanceText(formatThousands(String(editingWallet.balance)));
      const digits = editingWallet.last4.replace(/[^0-9]/g, '').slice(-4);
      setLast4(digits);
      setColorKey(
        editingWallet.colorKey || getWalletTheme(editingWallet.type).key
      );
      return;
    }

    setName('');
    setType('BANK');
    setBalanceText('');
    setLast4('');
    setColorKey('royal');
  }, [visible, editingWallet]);

  const numericBalance = Number(balanceText.replace(/[^0-9]/g, '')) || 0;

  const previewWallet: WalletItem = {
    id: editingWallet?.id || 'preview',
    name: name.trim() || 'Nama Dompet',
    type,
    balance: numericBalance,
    last4: last4.trim()
      ? `•••• ${last4.trim().padStart(4, '0')}`
      : type === 'CASH'
        ? 'Dompet Fisik'
        : '•••• 0000',
    colorKey,
    gradient: getWalletTheme(type, colorKey).gradient,
  };

  const handleTypeSelect = (nextType: WalletTypeKey, defaultColor: WalletColorKey) => {
    setType(nextType);
    if (!editingWallet) {
      setColorKey(defaultColor);
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nama dompet kosong', 'Masukkan nama dompet atau rekening.');
      return;
    }

    const formattedLast4 = last4.trim()
      ? `•••• ${last4.trim().padStart(4, '0')}`
      : type === 'CASH'
        ? 'Dompet Fisik'
        : `•••• ${String(Math.floor(1000 + Math.random() * 9000))}`;

    onSubmit({
      id: editingWallet?.id,
      name: trimmed,
      type,
      balance: numericBalance,
      last4: formattedLast4,
      colorKey,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>
              {editingWallet ? 'Edit Dompet' : 'Tambah Dompet'}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={20} color={Colors.textMuted} strokeWidth={1.9} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formBody}
          >
            {/* Mini Live Preview Kartu Rekening */}
            <View style={styles.previewWrap}>
              <RealisticWalletCard wallet={previewWallet} compact />
            </View>

            <Text style={styles.label}>Nama Dompet</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Bank BCA, OVO, Dana Darurat"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Tipe Rekening</Text>
            <View style={styles.chipWrap}>
              {WALLET_TYPES.map((item) => {
                const selected = type === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => handleTypeSelect(item.key, item.defaultColor)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Saldo Awal (Rp)</Text>
            <View style={styles.amountBox}>
              <Text style={styles.rpPrefix}>Rp</Text>
              <TextInput
                style={[styles.amountInput, Typography.tabularNums]}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={balanceText}
                onChangeText={(val) => setBalanceText(formatThousands(val))}
              />
            </View>

            <Text style={styles.label}>4 Digit Akhir (Opsional)</Text>
            <TextInput
              style={[styles.input, Typography.tabularNums]}
              placeholder="Contoh: 4821"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={4}
              value={last4}
              onChangeText={(val) => setLast4(val.replace(/[^0-9]/g, ''))}
            />

            <Text style={styles.label}>Warna Kartu</Text>
            <View style={styles.colorRow}>
              {WALLET_COLOR_OPTIONS.map((opt) => {
                const selected = colorKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setColorKey(opt.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Pilih warna ${opt.label}`}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: opt.dotColor },
                      selected && styles.colorCircleSelected,
                    ]}
                  >
                    {selected ? <Check size={16} color="#FFFFFF" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Simpan Dompet"
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
          >
            <Text style={styles.saveBtnText}>Simpan Dompet</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBody: {
    paddingBottom: 12,
  },
  previewWrap: {
    marginBottom: 6,
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#DBEAFE',
    transform: [{ scale: 1.08 }],
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  saveBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
