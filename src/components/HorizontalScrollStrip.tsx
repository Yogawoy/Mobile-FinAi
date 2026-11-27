import { Colors, FontFamily } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

interface HorizontalScrollStripProps {
  children: React.ReactNode;
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  fadeColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
}

function toTransparentColor(hexOrColor: string): string {
  const trimmed = hexOrColor.trim();
  if (trimmed.startsWith('#')) {
    const raw = trimmed.slice(1);
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((c) => c + c)
            .join('')
        : raw;
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, 0)`;
      }
    }
  }
  return 'rgba(255, 255, 255, 0)';
}

export function HorizontalScrollStrip({
  children,
  label,
  labelStyle,
  fadeColor = '#FFFFFF',
  contentContainerStyle,
  containerStyle,
  headerStyle,
  headerRight,
}: HorizontalScrollStripProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const isOverflowing =
    containerWidth > 0 && contentWidth > containerWidth + 6;
  const canScrollRight =
    isOverflowing && scrollX + containerWidth < contentWidth - 8;
  const canScrollLeft = scrollX > 8;

  const transparentFade = toTransparentColor(fadeColor);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  const showHeaderRow = Boolean(label || headerRight || isOverflowing);

  return (
    <View style={containerStyle}>
      {showHeaderRow ? (
        <View
          style={[
            styles.headerRow,
            !label && !headerRight && styles.headerRowCompact,
            headerStyle,
          ]}
        >
          {label ? (
            <Text style={[styles.label, labelStyle]} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}

          <View style={styles.rightCluster}>
            <View
              style={[styles.hintRow, !canScrollRight && styles.hintRowHidden]}
              pointerEvents="none"
            >
              <Text style={styles.hintText}>Geser</Text>
              <ChevronRight size={13} color="#94A3B8" strokeWidth={2.2} />
            </View>
            {headerRight}
          </View>
        </View>
      ) : null}

      <View
        style={styles.stripWrap}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onContentSizeChange={(w) => setContentWidth(w)}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {children}
        </ScrollView>

        {canScrollLeft ? (
          <LinearGradient
            colors={[fadeColor, transparentFade]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            pointerEvents="none"
            style={styles.leftFade}
          />
        ) : null}

        {canScrollRight ? (
          <LinearGradient
            colors={[transparentFade, fadeColor]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            pointerEvents="none"
            style={styles.rightFade}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  headerRowCompact: {
    marginBottom: 6,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hintRowHidden: {
    opacity: 0,
  },
  hintText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  stripWrap: {
    position: 'relative',
  },
  scrollContent: {
    paddingRight: 16,
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
});
