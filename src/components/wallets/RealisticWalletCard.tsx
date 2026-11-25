import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wifi } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { formatIDR } from '@/src/lib/format';
import { type WalletItem } from '@/src/lib/mockData';
import { getWalletTheme } from '@/src/lib/walletTheme';
import { FontFamily, Motion, Typography } from '@/src/theme/tokens';

interface RealisticWalletCardProps {
  wallet: WalletItem;
  hideBalance?: boolean;
  compact?: boolean;
  onPress?: () => void;
}

function EmvChipSvg({ compact }: { compact?: boolean }) {
  const w = compact ? 30 : 38;
  const h = compact ? 22 : 28;
  return (
    <Svg width={w} height={h} viewBox="0 0 38 28">
      <Defs>
        <SvgGradient id="emvGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="0.5" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgGradient>
      </Defs>
      <Rect x="0.5" y="0.5" width="37" height="27" rx="5" fill="url(#emvGold)" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
      <Path
        d="M 12 1 V 27 M 26 1 V 27 M 1 10 H 12 M 1 18 H 12 M 26 10 H 37 M 26 18 H 37 M 12 14 H 26"
        stroke="rgba(120, 53, 15, 0.45)"
        strokeWidth="1"
        fill="none"
      />
    </Svg>
  );
}

function formatEmbossedNumber(last4: string): string {
  const digits = last4.replace(/[^0-9]/g, '').slice(-4);
  if (digits.length === 4) {
    return `••••  ••••  ••••  ${digits}`;
  }
  return last4.toUpperCase();
}

export function RealisticWalletCard({
  wallet,
  hideBalance = false,
  compact = false,
  onPress,
}: RealisticWalletCardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const theme = getWalletTheme(wallet.type, wallet.colorKey);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardContent = (
    <View
      style={[
        styles.shadowWrap,
        { shadowColor: theme.shadowColor },
        compact && styles.shadowWrapCompact,
      ]}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.cardCompact]}
      >
        {/* Diagonal translucent sheen */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.diagonalSheen}
          pointerEvents="none"
        />

        {/* Security SVG curve lines */}
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 340 196"
          style={styles.securitySvg}
          pointerEvents="none"
        >
          <Path
            d="M -20 155 Q 110 75 220 130 T 360 80"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.2"
            fill="none"
          />
          <Path
            d="M -10 175 Q 130 100 245 148 T 365 105"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            fill="none"
          />
          <Path
            d="M 160 -15 Q 250 65 355 30"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
            fill="none"
          />
        </Svg>

        {/* Top Row: Name + Sublabel | Platinum Emblem */}
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text style={[styles.walletName, compact && styles.walletNameCompact]} numberOfLines={1}>
              {wallet.name || 'Nama Dompet'}
            </Text>
            <Text style={styles.subLabel}>{theme.subLabel}</Text>
          </View>

          <View style={styles.emblemGroup}>
            <View style={styles.circlesWrap}>
              <View style={[styles.emblemCircle, styles.circleLeft]} />
              <View style={[styles.emblemCircle, styles.circleRight]} />
            </View>
            <Text style={styles.platinumText}>PLATINUM</Text>
          </View>
        </View>

        {/* Middle Row: EMV Chip + Contactless | Available Balance */}
        <View style={styles.middleRow}>
          <View style={styles.chipRow}>
            <EmvChipSvg compact={compact} />
            <View style={styles.contactlessWrap}>
              <Wifi size={compact ? 14 : 17} color="rgba(255,255,255,0.78)" strokeWidth={2} />
            </View>
          </View>

          <View style={styles.balanceCol}>
            <Text style={styles.balanceCaption}>SALDO TERSEDIA</Text>
            <Text
              style={[
                styles.balanceValue,
                compact && styles.balanceValueCompact,
                Typography.tabularNums,
              ]}
              numberOfLines={1}
            >
              {hideBalance ? 'Rp ••••••••' : formatIDR(wallet.balance)}
            </Text>
          </View>
        </View>

        {/* Bottom Row: Embossed Number + Holder | Valid Thru */}
        {!compact ? (
          <View style={styles.bottomRow}>
            <View>
              <Text style={[styles.embossedNumber, Typography.tabularNums]}>
                {formatEmbossedNumber(wallet.last4)}
              </Text>
              <Text style={styles.holderText}>CARD HOLDER · YOGA</Text>
            </View>

            <View style={styles.validWrap}>
              <Text style={styles.validCaption}>VALID THRU</Text>
              <Text style={[styles.validDate, Typography.tabularNums]}>11/29</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );

  if (!onPress) {
    return cardContent;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reducedMotion) {
          scale.value = withTiming(0.98, { duration: Motion.pressMs });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withTiming(1, { duration: Motion.pressMs });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`Buka detail ${wallet.name}`}
    >
      <Animated.View style={animatedStyle}>{cardContent}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  shadowWrapCompact: {
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    height: 196,
    borderRadius: 22,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardCompact: {
    height: 132,
    borderRadius: 18,
    padding: 16,
  },
  diagonalSheen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  securitySvg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameBlock: {
    flex: 1,
  },
  walletName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  walletNameCompact: {
    fontSize: 14.5,
  },
  subLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  emblemGroup: {
    alignItems: 'flex-end',
    gap: 3,
  },
  circlesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  circleLeft: {
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  circleRight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginLeft: -7,
  },
  platinumText: {
    fontFamily: FontFamily.semibold,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1.1,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactlessWrap: {
    transform: [{ rotate: '90deg' }],
  },
  balanceCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  balanceCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.9,
  },
  balanceValue: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  balanceValueCompact: {
    fontSize: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  embossedNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1,
  },
  holderText: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  validWrap: {
    alignItems: 'flex-end',
  },
  validCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: 0.7,
  },
  validDate: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },
});
