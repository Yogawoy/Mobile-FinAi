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
import { extractErrorMessage } from '@/lib/api-client';
import { formatIDR } from '@/lib/format';
import { walletService } from '@/services/wallet.service';
import type { Wallet } from '@/types/api';

interface TransferModalProps {
  visible: boolean;
  wallets: Wallet[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ visible, wallets, onClose, onSuccess }: TransferModalProps) {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFromWalletId(wallets[0]?.id || '');
    setToWalletId(wallets[1]?.id || wallets[0]?.id || '');
    setAmount('');
    setNote('');
  }, [visible, wallets]);

  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!fromWalletId || !toWalletId) {
      Alert.alert('Pilih dompet', 'Dompet asal dan tujuan wajib dipilih.');
      return;
    }
    if (fromWalletId === toWalletId) {
      Alert.alert('Dompet sama', 'Dompet asal dan tujuan tidak boleh sama.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Nominal tidak valid', 'Masukkan nominal transfer lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      await walletService.transfer({
        fromWalletId,
        toWalletId,
        amount: numericAmount,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Transfer gagal', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Transfer Antar Dompet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Dari Dompet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {wallets.map((w) => {
                const selected = w.id === fromWalletId;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setFromWalletId(w.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {w.name} ({formatIDR(w.balance)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Ke Dompet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {wallets.map((w) => {
                const selected = w.id === toWalletId;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setToWalletId(w.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Nominal Transfer (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 250000"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Topup GoPay"
              placeholderTextColor={FinColors.textMuted}
              value={note}
              onChangeText={setNote}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Kirim Transfer</Text>
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
    maxHeight: '85%',
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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: FinColors.lavender,
    borderColor: FinColors.periwinkle,
  },
  chipText: {
    fontSize: 13,
    color: FinColors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: FinColors.periwinkleDark,
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
  submitBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
