import { HorizontalScrollStrip } from '@/components/HorizontalScrollStrip';
import { useToast } from '@/components/ui/ToastProvider';
import { RealisticWalletCard } from '@/components/wallets/RealisticWalletCard';
import { useFinance } from '@/context/FinanceContext';
import { useKeyboardFocusScroll } from '@/hooks/useKeyboardFocusScroll';
import { type WalletItem } from '@/lib/mockData';
import {
  getWalletTheme,
  WALLET_COLOR_OPTIONS,
  type WalletColorKey,
  type WalletTheme,
  type WalletTypeKey,
} from '@/lib/walletTheme';
import { walletService } from '@/services/wallet.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ColorSwatchButton({
  option,
  selected,
  onSelect,
}: {
  option: WalletTheme;
  selected: boolean;
  onSelect: (key: WalletColorKey) => void;
}) {
  return (
    <View style={styles.colorCell}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onSelect(option.key)}
        accessibilityRole="button"
        accessibilityLabel={`Pilih warna ${option.label}`}
        accessibilityState={{ selected }}
        style={[
          styles.colorRing,
          selected && { borderColor: option.primary },
        ]}
      >
        <View style={[styles.colorCircle, { backgroundColor: option.primary }]}>
          {selected ? <Check size={16} color="#FFFFFF" strokeWidth={2.5} /> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const WALLET_TYPES: {
  key: WalletTypeKey;
  label: string;
  defaultColor: WalletColorKey;
}[] = [
  { key: 'BANK', label: 'Bank', defaultColor: 'royal' },
  { key: 'EWALLET', label: 'E-Wallet', defaultColor: 'teal' },
  { key: 'SAVINGS', label: 'Tabungan', defaultColor: 'navy' },
  { key: 'CASH', label: 'Tunai', defaultColor: 'obsidian' },
];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function WalletFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollViewRef, keyboardHeight, scrollToInput, onScroll } =
    useKeyboardFocusScroll({ stickyBottomHeight: 80 + insets.bottom });
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { wallets, setWallets, refreshAllData } = useFinance();
  const { showToast } = useToast();

  const editingWallet = useMemo(
    () => (id ? wallets.find((w) => w.id === id) ?? null : null),
    [id, wallets]
  );
  const isEditing = Boolean(editingWallet || id);

  const [name, setName] = useState('');
  const [type, setType] = useState<WalletTypeKey>('BANK');
  const [balanceText, setBalanceText] = useState('');
  const [last4, setLast4] = useState('');
  const [colorKey, setColorKey] = useState<WalletColorKey>('royal');
  const [focusedField, setFocusedField] = useState<'name' | 'balance' | 'last4' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
  }, [editingWallet]);

  const numericBalance = Number(balanceText.replace(/[^0-9]/g, '')) || 0;
  const activeTheme = getWalletTheme(type, colorKey);

  const previewWallet: WalletItem = {
    id: editingWallet?.id || 'preview',
    name: name.trim() || 'Nama Dompet',
    type,
    balance: numericBalance,
    last4: last4.trim()
      ? `**** ${last4.trim().padStart(4, '0')}`
      : type === 'CASH'
        ? 'Dompet Fisik'
        : '**** 0000',
    colorKey,
    gradient: activeTheme.gradient,
  };

  const handleTypeSelect = (nextType: WalletTypeKey, defaultColor: WalletColorKey) => {
    setType(nextType);
    if (!isEditing) {
      setColorKey(defaultColor);
    }
  };

  const handleColorSelect = (nextColor: WalletColorKey) => {
    setColorKey(nextColor);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Masukkan nama dompet atau rekening', 'error');
      return;
    }
    if (submitting) return;

    const formattedLast4 = last4.trim()
      ? `**** ${last4.trim().padStart(4, '0')}`
      : type === 'CASH'
        ? 'Dompet Fisik'
        : `**** ${String(Math.floor(1000 + Math.random() * 9000))}`;

    const theme = getWalletTheme(type, colorKey);
    const normalizedType = type === 'E_WALLET' ? 'EWALLET' : type;

    setSubmitting(true);
    try {
      if (isEditing && (editingWallet?.id || id)) {
        const targetId = editingWallet?.id || String(id);
        setWallets((prev) =>
          prev.map((w) =>
            w.id === targetId
              ? {
                  ...w,
                  name: trimmed,
                  shortName: trimmed,
                  type: normalizedType,
                  last4: formattedLast4,
                  colorKey,
                  dotColor: theme.dotColor,
                  gradient: theme.gradient,
                }
              : w
          )
        );
        await walletService.updateWallet(targetId, {
          name: trimmed,
          type: normalizedType,
          color: theme.dotColor,
          accountNumber: formattedLast4,
        });
        await refreshAllData();
        showToast(`Dompet "${trimmed}" diperbarui`);
      } else {
        await walletService.createWallet({
          name: trimmed,
          type: normalizedType,
          initialBalance: numericBalance,
          color: theme.dotColor,
          accountNumber: formattedLast4,
        });
        await refreshAllData();
        showToast(`Dompet "${trimmed}" ditambahkan`);
      }
      router.back();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan dompet',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 120 + insets.bottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 12 }]}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                style={styles.backBtn}
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Dompet' : 'Tambah Dompet'}
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.previewOverlap}>
              <RealisticWalletCard wallet={previewWallet} compact />
            </View>

            <View style={styles.surfaceCard}>
              <View style={styles.colorHeaderRow}>
                <Text style={styles.sectionLabel}>Warna Kartu</Text>
                <Text style={styles.colorSelectedName}>{activeTheme.label}</Text>
              </View>
              <View style={styles.colorGrid}>
                {WALLET_COLOR_OPTIONS.map((opt) => (
                  <ColorSwatchButton
                    key={opt.key}
                    option={opt}
                    selected={colorKey === opt.key}
                    onSelect={handleColorSelect}
                  />
                ))}
              </View>
            </View>

            <View style={styles.surfaceCard}>
              <Text style={styles.sectionLabel}>Nama Dompet</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused,
                ]}
                placeholder="Contoh: Bank BCA, OVO, Dana Darurat"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                onFocus={(e) => {
                  setFocusedField('name');
                  scrollToInput(e);
                }}
                onBlur={() => setFocusedField(null)}
              />

              <HorizontalScrollStrip
                label="Tipe Rekening"
                labelStyle={styles.sectionLabel}
                fadeColor="#FFFFFF"
                containerStyle={{ marginTop: 16 }}
                contentContainerStyle={styles.typeScroll}
              >
                {WALLET_TYPES.map((item) => {
                  const selected = type === item.key;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      key={item.key}
                      onPress={() => handleTypeSelect(item.key, item.defaultColor)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HorizontalScrollStrip>

              {!isEditing ? (
                <>
                  <Text style={[styles.sectionLabel, styles.fieldTopGap]}>
                    Saldo Awal (Rp)
                  </Text>
                  <View
                    style={[
                      styles.amountBox,
                      focusedField === 'balance' && styles.inputFocused,
                    ]}
                  >
                    <Text style={styles.rpPrefix}>Rp</Text>
                    <TextInput
                      style={[styles.amountInput, Typography.tabularNums]}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={balanceText}
                      onChangeText={(val) => setBalanceText(formatThousands(val))}
                      onFocus={(e) => {
                        setFocusedField('balance');
                        scrollToInput(e);
                      }}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </>
              ) : null}

              <Text style={[styles.sectionLabel, styles.fieldTopGap]}>
                4 Digit Akhir (Opsional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  Typography.tabularNums,
                  focusedField === 'last4' && styles.inputFocused,
                ]}
                placeholder="Contoh: 4821"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={4}
                value={last4}
                onChangeText={(val) => setLast4(val.replace(/[^0-9]/g, ''))}
                onFocus={(e) => {
                  setFocusedField('last4');
                  scrollToInput(e);
                }}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSave}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Simpan Perubahan' : 'Simpan Dompet'}
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Simpan Perubahan' : 'Simpan Dompet'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const SOFT_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 16,
  elevation: 2,
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 68,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    paddingHorizontal: 18,
    gap: 14,
  },
  previewOverlap: {
    marginTop: -48,
  },
  surfaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...SOFT_SHADOW,
  },
  colorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fieldTopGap: {
    marginTop: 16,
    marginBottom: 8,
  },
  colorSelectedName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorCell: {
    width: '16.666%',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EEF2F7',
    paddingHorizontal: 14,
    height: 50,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  typeScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  chipSelected: {
    backgroundColor: '#EBF2FF',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EEF2F7',
    paddingHorizontal: 14,
    height: 52,
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(246, 247, 251, 0.96)',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  saveBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SHADOW,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
