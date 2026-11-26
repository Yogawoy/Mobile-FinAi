import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Archive, LogOut, RotateCcw, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Colors, FontFamily, TouchTarget } from '@/theme/tokens';

export type ConfirmVariant = 'danger' | 'primary' | 'warning';
export type ConfirmIconType = 'trash' | 'logout' | 'reset' | 'archive';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  variant = 'danger',
  icon = 'trash',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const palette =
    variant === 'danger'
      ? {
          iconBg: Colors.expenseSoft,
          iconColor: Colors.expense,
          btnBg: Colors.expense,
        }
      : variant === 'warning'
        ? {
            iconBg: Colors.warningSoft,
            iconColor: Colors.warningText,
            btnBg: Colors.warning,
          }
        : {
            iconBg: Colors.primarySoft,
            iconColor: Colors.primary,
            btnBg: Colors.primary,
          };

  const renderIcon = () => {
    switch (icon) {
      case 'logout':
        return <LogOut size={24} color={palette.iconColor} strokeWidth={1.9} />;
      case 'reset':
        return <RotateCcw size={24} color={palette.iconColor} strokeWidth={1.9} />;
      case 'archive':
        return <Archive size={24} color={palette.iconColor} strokeWidth={1.9} />;
      case 'trash':
      default:
        return <Trash2 size={24} color={palette.iconColor} strokeWidth={1.9} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
          <Pressable style={styles.backdropPress} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(200).withInitialValues({
            transform: [{ scale: 0.94 }],
          })}
          style={styles.card}
        >
          <View style={[styles.iconCircle, { backgroundColor: palette.iconBg }]}>
            {renderIcon()}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { backgroundColor: Colors.canvas },
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: palette.btnBg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  backdropPress: {
    flex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 16,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    minHeight: TouchTarget.minSize,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    minHeight: TouchTarget.minSize,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
