import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CalendarClock, CheckCheck, ShieldAlert } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { Colors, FontFamily, Radius } from '@/theme/tokens';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  unread: boolean;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Anggaran Belanja Terlampaui',
    message: 'Belanja melebihi batas 108% (lebih Rp 40.000 dari batas bulanan).',
    time: '15 mnt lalu',
    severity: 'HIGH',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'Peringatan Anggaran Makanan',
    message: 'Makanan mencapai 82% anggaran bulan November 2026.',
    time: '2 jam lalu',
    severity: 'MEDIUM',
    unread: true,
  },
  {
    id: 'notif-3',
    title: 'Pengingat Tagihan Rutin',
    message: 'Tagihan Server Cloud Rp 150.000 jatuh tempo 3 hari lagi.',
    time: 'Hari ini, 08:00',
    severity: 'INFO',
    unread: true,
  },
];

interface NotificationSheetProps {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

export function NotificationSheet({
  visible,
  notifications,
  onClose,
  onMarkAllRead,
}: NotificationSheetProps) {
  const { showToast } = useToast();
  const hasUnread = notifications.some((n) => n.unread);

  const handleMarkAll = () => {
    onMarkAllRead();
    showToast('Semua notifikasi ditandai sudah dibaca');
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title="Notifikasi"
      onClose={onClose}
      footer={
        hasUnread ? (
          <Pressable
            onPress={handleMarkAll}
            accessibilityRole="button"
            accessibilityLabel="Tandai Semua Dibaca"
            style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.85 }]}
          >
            <CheckCheck size={17} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.markBtnText}>Tandai Semua Dibaca</Text>
          </Pressable>
        ) : null
      }
    >
      <View style={styles.list}>
        {notifications.map((item) => {
          const palette =
            item.severity === 'HIGH'
              ? { bg: Colors.expenseSoft, color: Colors.expense }
              : item.severity === 'MEDIUM'
                ? { bg: Colors.warningSoft, color: Colors.warning }
                : { bg: Colors.primarySoft, color: Colors.primary };

          return (
            <View
              key={item.id}
              style={[styles.card, item.unread && styles.cardUnread]}
            >
              {item.unread ? <View style={styles.unreadStrip} /> : null}

              <View style={[styles.iconBox, { backgroundColor: palette.bg }]}>
                {item.severity === 'HIGH' ? (
                  <ShieldAlert size={18} color={palette.color} strokeWidth={1.9} />
                ) : item.severity === 'MEDIUM' ? (
                  <AlertTriangle size={18} color={palette.color} strokeWidth={1.9} />
                ) : (
                  <CalendarClock size={18} color={palette.color} strokeWidth={1.9} />
                )}
              </View>

              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.unread ? (
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>Baru</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: '#F8FBFF',
    borderColor: '#BFDBFE',
    paddingLeft: 16,
  },
  unreadStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: Colors.primary,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  newPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  newPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.primaryDark,
  },
  itemMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  itemTime: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  markBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
