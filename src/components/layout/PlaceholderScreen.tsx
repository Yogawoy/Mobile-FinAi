import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileHeader } from '@/src/components/layout/MobileHeader';
import { Colors, FontFamily, Radius, Spacing } from '@/src/theme/tokens';

interface PlaceholderScreenProps {
  isHome?: boolean;
  headerTitle?: string;
  badgeText: string;
  cardTitle: string;
  cardDescription: string;
}

export function PlaceholderScreen({
  isHome = false,
  headerTitle,
  badgeText,
  cardTitle,
  cardDescription,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.root}>
      <MobileHeader isHome={isHome} title={headerTitle} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
          <Text style={styles.cardTitle}>{cardTitle}</Text>
          <Text style={styles.cardDescription}>{cardDescription}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
