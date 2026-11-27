import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Banknote, Landmark, Smartphone } from 'lucide-react-native';
import { getWalletTypeLabels, resolveWalletTheme } from '@/constants/walletTheme';
import { formatIDR } from '@/lib/format';
import { FinRadius } from '@/constants/theme';
import type { Wallet } from '@/types/api';

interface WalletCardProps {
  wallet: Wallet;
  isDefault?: boolean;
  compact?: boolean;
  onPress?: () => void;
}

export function WalletCard({ wallet, isDefault, compact = false, onPress }: WalletCardProps) {
  const theme = resolveWalletTheme(wallet.color, wallet.type);
  const labels = getWalletTypeLabels(wallet.type);

  const IconComponent =
    wallet.type === 'E_WALLET' ? Smartphone : wallet.type === 'CASH' ? Banknote : Landmark;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrapper, compact && styles.compactWrapper]}
    >
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.compactCard]}
      >
        <View style={styles.topRow}>
          <View style={styles.typeChip}>
            <IconComponent size={13} color="#FFFFFF" />
            <Text style={styles.typeChipText}>{labels.typeLabel}</Text>
          </View>
          {isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Utama</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.middle}>
          <Text style={styles.name} numberOfLines={1}>
            {wallet.name}
          </Text>
          <Text style={styles.subText} numberOfLines={1}>
            {[wallet.institution, wallet.accountLast4 ? `•••• ${wallet.accountLast4}` : null]
              .filter(Boolean)
              .join(', ') || labels.subLabel}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.balanceLabel}>Saldo</Text>
          <Text style={[styles.balance, compact && styles.compactBalance]} numberOfLines={1}>
            {formatIDR(wallet.balance)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: FinRadius.lg,
    shadowColor: '#30334A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  compactWrapper: {
    width: 240,
  },
  card: {
    borderRadius: FinRadius.lg,
    padding: 18,
    minHeight: 146,
    justifyContent: 'space-between',
  },
  compactCard: {
    padding: 16,
    minHeight: 132,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: FinRadius.full,
  },
  typeChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: FinRadius.full,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  middle: {
    marginVertical: 10,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  subText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 2,
  },
  bottomRow: {
    gap: 2,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  compactBalance: {
    fontSize: 18,
  },
});
