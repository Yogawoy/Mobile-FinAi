import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Spacing, TouchTarget } from '@/theme/tokens';

interface MobileHeaderProps {
  isHome?: boolean;
  title?: string;
}

export function MobileHeader({ isHome = false, title = 'Beranda' }: MobileHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleNotificationPress = () => {
    Alert.alert('Notifikasi', 'Semua aktivitas keuangan Anda terpantau aman.');
  };

  const handleProfilePress = () => {
    Alert.alert('Profil Pengguna', 'Yoga Saputra · Smart Finance');
  };

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.row}>
        <View style={styles.titleContainer}>
          {isHome ? (
            <Text style={styles.titleText} numberOfLines={1}>
              Selamat Pagi, <Text style={styles.titleHighlight}>Yoga!</Text>
            </Text>
          ) : (
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            style={({ pressed }) => [styles.iconTarget, pressed && styles.pressed]}
          >
            <View style={styles.bellBox}>
              <Bell size={20} color={Colors.textPrimary} strokeWidth={1.75} />
              <View style={styles.badgeDot} />
            </View>
          </Pressable>

          <Pressable
            onPress={handleProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Profil Yoga Saputra"
            style={({ pressed }) => [styles.iconTarget, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>YS</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TouchTarget.minSize,
  },
  titleContainer: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  titleText: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  titleHighlight: {
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconTarget: {
    minWidth: TouchTarget.minSize,
    minHeight: TouchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.7,
  },
  bellBox: {
    position: 'relative',
    padding: 4,
  },
  badgeDot: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.expense,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
});
