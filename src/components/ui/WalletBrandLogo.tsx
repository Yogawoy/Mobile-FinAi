import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Banknote, Landmark, Smartphone } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { type WalletTypeKey } from '@/lib/walletTheme';
import { FontFamily } from '@/theme/tokens';

interface WalletBrandLogoProps {
  walletId: string;
  walletName?: string;
  type: WalletTypeKey;
  size?: number;
}

export function WalletBrandLogo({
  walletId,
  walletName = '',
  type,
  size = 36,
}: WalletBrandLogoProps) {
  const key = `${walletId} ${walletName}`.toLowerCase();
  const radius = Math.round(size * 0.26);

  // Bank BCA
  if (key.includes('bca')) {
    return (
      <LinearGradient
        colors={['#0066B3', '#004C91']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path
            d="M7 13 C15 8, 26 17, 37 10"
            stroke="#60A5FA"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            opacity={0.78}
          />
        </Svg>
        <Text
          allowFontScaling={false}
          style={[styles.wordmark, { fontSize: Math.round(size * 0.31), marginTop: 4 }]}
        >
          BCA
        </Text>
      </LinearGradient>
    );
  }

  // Bank BRI
  if (key.includes('bri')) {
    return (
      <LinearGradient
        colors={['#00529C', '#003B73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <View
          style={{
            position: 'absolute',
            top: Math.round(size * 0.18),
            width: Math.round(size * 0.66),
            height: Math.max(2.5, Math.round(size * 0.08)),
            borderRadius: 2,
            backgroundColor: '#F97316',
          }}
        />
        <Text
          allowFontScaling={false}
          style={[styles.wordmark, { fontSize: Math.round(size * 0.32), marginTop: 5 }]}
        >
          BRI
        </Text>
      </LinearGradient>
    );
  }

  // Bank Mandiri
  if (key.includes('mandiri')) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: '#003D79' },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path
            d="M5 16 C14 8, 25 18, 39 9 L39 14.5 C26 22.5, 14 13, 5 20.5 Z"
            fill="#FDB813"
          />
        </Svg>
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            {
              fontSize: Math.max(7.5, Math.round(size * 0.21)),
              marginTop: Math.round(size * 0.28),
              letterSpacing: -0.2,
            },
          ]}
        >
          mandiri
        </Text>
      </View>
    );
  }

  // Bank BNI
  if (key.includes('bni')) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: '#005E6A' },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path d="M27 0 L44 0 L44 17 C36 14, 30 9, 27 0 Z" fill="#F15A23" />
        </Svg>
        <Text
          allowFontScaling={false}
          style={[styles.wordmark, { fontSize: Math.round(size * 0.31), marginTop: 3 }]}
        >
          BNI
        </Text>
      </View>
    );
  }

  // BSI (Bank Syariah Indonesia)
  if (key.includes('bsi')) {
    return (
      <LinearGradient
        colors={['#00A39D', '#007E7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path d="M31 7 L34.5 11.5 L31 16 L27.5 11.5 Z" fill="#F8AD3C" />
        </Svg>
        <Text
          allowFontScaling={false}
          style={[styles.wordmark, { fontSize: Math.round(size * 0.31), marginTop: 4 }]}
        >
          BSI
        </Text>
      </LinearGradient>
    );
  }

  // CIMB Niaga
  if (key.includes('cimb')) {
    return (
      <LinearGradient
        colors={['#B91C1C', '#790008']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            { fontSize: Math.round(size * 0.25), letterSpacing: 0.1 },
          ]}
        >
          CIMB
        </Text>
      </LinearGradient>
    );
  }

  // SeaBank
  if (key.includes('seabank')) {
    return (
      <LinearGradient
        colors={['#FF6B35', '#EE4D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            { fontSize: Math.round(size * 0.28), marginBottom: Math.round(size * 0.14) },
          ]}
        >
          Sea
        </Text>
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path
            d="M10 31 C15 26.5, 19 26.5, 22 29.5 C25 32.5, 29 32.5, 34 28"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </LinearGradient>
    );
  }

  // Bank Jago
  if (key.includes('jago')) {
    return (
      <LinearGradient
        colors={['#FCD34D', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            {
              color: '#0F172A',
              fontSize: Math.round(size * 0.27),
              letterSpacing: -0.2,
            },
          ]}
        >
          Jago
        </Text>
      </LinearGradient>
    );
  }

  // GoPay
  if (key.includes('gopay')) {
    return (
      <LinearGradient
        colors={['#00AED6', '#008BB3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44">
          <Rect x="10" y="14" width="24" height="17" rx="5" fill="#FFFFFF" />
          <Path
            d="M14 14 L25 9.5 C26.6 8.9 28.4 9.9 28.6 11.6 L29 14 Z"
            fill="#BAE6FD"
          />
          <Rect x="24" y="19.5" width="11" height="6" rx="3" fill="#0095BA" />
          <Circle cx="27.5" cy="22.5" r="1.6" fill="#FFFFFF" />
        </Svg>
      </LinearGradient>
    );
  }

  // DANA
  if (key.includes('dana')) {
    return (
      <LinearGradient
        colors={['#189BFF', '#118EEA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44">
          <Path
            d="M10 17 C15 13, 21 15, 25 18 C29 21, 32 19, 34 16 L34 21 C31 24, 27 25, 23 22 C19 19, 14 19, 10 22 Z"
            fill="#FFFFFF"
          />
          <Path
            d="M10 24 C15 21, 20 22, 24 25 C28 28, 31 26, 34 23 L34 28 C31 31, 26 32, 22 29 C18 26, 14 26, 10 29 Z"
            fill="#FFFFFF"
            opacity={0.85}
          />
        </Svg>
      </LinearGradient>
    );
  }

  // OVO
  if (key.includes('ovo')) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: '#4C3494' },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={[styles.wordmark, { fontSize: Math.round(size * 0.31) }]}
        >
          OVO
        </Text>
      </View>
    );
  }

  // ShopeePay
  if (key.includes('shopeepay') || key.includes('shopee')) {
    return (
      <LinearGradient
        colors={['#FF6633', '#EE4D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Svg width={size} height={size} viewBox="0 0 44 44" style={styles.abs}>
          <Path
            d="M17 15 C17 11, 27 11, 27 15"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            fill="none"
          />
          <Rect x="12" y="15" width="20" height="18" rx="4" fill="#FFFFFF" />
        </Svg>
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            {
              color: '#EE4D2D',
              fontSize: Math.round(size * 0.31),
              marginTop: Math.round(size * 0.14),
            },
          ]}
        >
          S
        </Text>
      </LinearGradient>
    );
  }

  // LinkAja
  if (key.includes('linkaja')) {
    return (
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.wordmark,
            { fontSize: Math.max(7.5, Math.round(size * 0.22)), letterSpacing: -0.2 },
          ]}
        >
          LinkAja
        </Text>
      </LinearGradient>
    );
  }

  // Uang Tunai (Cash)
  if (type === 'CASH' || key.includes('tunai') || key.includes('cash')) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: '#ECFDF5' },
        ]}
      >
        <Banknote size={Math.round(size * 0.5)} color="#10B981" strokeWidth={2} />
      </View>
    );
  }

  // Fallback for custom wallets
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radius, backgroundColor: '#EBF2FF' },
      ]}
    >
      {type === 'EWALLET' || type === 'E_WALLET' ? (
        <Smartphone size={Math.round(size * 0.48)} color="#3B7AF5" strokeWidth={1.9} />
      ) : (
        <Landmark size={Math.round(size * 0.48)} color="#3B7AF5" strokeWidth={1.9} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abs: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wordmark: {
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
