import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { FinColors, FinRadius } from '@/constants/theme';
import { WALLET_THEMES, type WalletThemeKey } from '@/constants/walletTheme';
import { extractErrorMessage } from '@/lib/api-client';
import { walletService } from '@/services/wallet.service';
import type { Wallet, WalletType } from '@/types/api';

interface WalletModalProps {
  visible: boolean;
  initialWallet?: Wallet | null;
  onClose: () => void;
  onSaved: () => void;
}

const WALLET_TYPES: { key: WalletType; label: string }[] = [
  { key: 'BANK', label: 'Bank' },
  { key: 'E_WALLET', label: 'E-Wallet' },
  { key: 'CASH', label: 'Tunai' },
];

export function WalletModal({ visible, initialWallet, onClose, onSaved }: WalletModalProps) {
  const isEditing = Boolean(initialWallet);
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('BANK');
  const [institution, setInstitution] = useState('');
  const [accountLast4, setAccountLast4] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState<WalletThemeKey>('periwinkle');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialWallet) {
      setName(initialWallet.name);
      setType(initialWallet.type);
      setInstitution(initialWallet.institution || '');
      setAccountLast4(initialWallet.accountLast4 || '');
      setBalance('');
      setColor((initialWallet.color as WalletThemeKey) || 'periwinkle');
    } else {
      setName('');
      setType('BANK');
      setInstitution('');
      setAccountLast4('');
      setBalance('0');
      setColor('periwinkle');
    }
  }, [visible, initialWallet]);

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Nama dompet terlalu pendek', 'Minimal 2 karakter.');
      return;
    }

    const parsedBalance = Number((balance || '0').replace(/[^0-9]/g, ''));
    if (!isEditing && (!Number.isFinite(parsedBalance) || parsedBalance < 0)) {
      Alert.alert('Saldo awal tidak valid', 'Saldo minimal 0.');
      return;
    }

    setSubmitting(true);
    try {
      const icon = type === 'E_WALLET' ? 'Wallet' : type === 'CASH' ? 'Cash' : 'Bank';
      if (isEditing && initialWallet) {
        await walletService.updateWallet(initialWallet.id, {
          name: name.trim(),
          type,
          institution: institution.trim() || null,
          accountLast4: accountLast4.trim() || null,
          color,
          icon,
        });
      } else {
        await walletService.createWallet({
          name: name.trim(),
          type,
          institution: institution.trim() || null,
          accountLast4: accountLast4.trim() || null,
          balance: parsedBalance,
          color,
          icon,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Gagal menyimpan dompet', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Dompet' : 'Tambah Dompet'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Jenis Dompet</Text>
            <View style={styles.row}>
              {WALLET_TYPES.map((item) => {
                const selected = item.key === type;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => setType(item.key)}
                  >
                    <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Nama Dompet</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: BCA Utama / GoPay"
              placeholderTextColor={FinColors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Institusi / Penyedia (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: BCA, Mandiri, Gojek"
              placeholderTextColor={FinColors.textMuted}
              value={institution}
              onChangeText={setInstitution}
            />

            <Text style={styles.label}>4 Digit Terakhir Rekening/No HP (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 4821"
              placeholderTextColor={FinColors.textMuted}
              maxLength={10}
              value={accountLast4}
              onChangeText={setAccountLast4}
            />

            {!isEditing ? (
              <>
                <Text style={styles.label}>Saldo Awal (Rp)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={FinColors.textMuted}
                  keyboardType="numeric"
                  value={balance}
                  onChangeText={setBalance}
                />
              </>
            ) : null}

            <Text style={styles.label}>Tema Warna Kartu</Text>
            <View style={styles.colorRow}>
              {Object.values(WALLET_THEMES).map((theme) => {
                const selected = theme.key === color;
                return (
                  <TouchableOpacity
                    key={theme.key}
                    style={[
                      styles.colorDot,
                      { backgroundColor: theme.colors[1] },
                      selected && styles.colorDotSelected,
                    ]}
                    onPress={() => setColor(theme.key)}
                  />
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? 'Simpan Perubahan' : 'Buat Dompet'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 38, 54, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: FinColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: FinColors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: FinColors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: FinRadius.md,
    backgroundColor: FinColors.canvas,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  typeChipSelected: {
    backgroundColor: FinColors.lavender,
    borderColor: FinColors.periwinkle,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: FinColors.textSecondary,
  },
  typeTextSelected: {
    color: FinColors.periwinkleDark,
    fontWeight: '700',
  },
  input: {
    backgroundColor: FinColors.canvas,
    borderRadius: FinRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: FinColors.textPrimary,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: FinColors.textPrimary,
  },
  submitBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
