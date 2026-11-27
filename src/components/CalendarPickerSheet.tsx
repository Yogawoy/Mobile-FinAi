import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { Colors, FontFamily, Typography } from '@/theme/tokens';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const FULL_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

interface CalendarPickerSheetProps {
  visible: boolean;
  initialDate?: Date | null;
  accentColor?: string;
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  onClear?: () => void;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function formatIndonesianFullDate(date: Date): string {
  return `${date.getDate()} ${FULL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function CalendarPickerSheet({
  visible,
  initialDate,
  accentColor = '#2563EB',
  allowPastDates = false,
  allowFutureDates = true,
  onClose,
  onSelect,
  onClear,
}: CalendarPickerSheetProps) {
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const slideX = useSharedValue(0);
  const stageOpacity = useSharedValue(1);
  const chevronRotate = useSharedValue(0);

  useEffect(() => {
    chevronRotate.value = withTiming(yearPickerOpen ? 180 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [yearPickerOpen, chevronRotate]);

  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value}deg` }],
  }));

  const stageAnimStyle = useAnimatedStyle(() => ({
    opacity: stageOpacity.value,
    transform: [{ translateX: slideX.value }],
  }));

  const animateMonthTransition = (direction: 'next' | 'prev' | 'fade') => {
    const offset = direction === 'next' ? 18 : direction === 'prev' ? -18 : 0;
    slideX.value = offset;
    stageOpacity.value = 0.45;
    slideX.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    stageOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  };

  useEffect(() => {
    if (!visible) return;
    setYearPickerOpen(false);
    slideX.value = 0;
    stageOpacity.value = 1;

    const validInitial =
      initialDate &&
      !Number.isNaN(initialDate.getTime()) &&
      initialDate.getFullYear() < 2090 &&
      (allowPastDates || startOfLocalDay(initialDate) >= today) &&
      (allowFutureDates || startOfLocalDay(initialDate) <= today)
        ? startOfLocalDay(initialDate)
        : today;

    setSelectedDate(validInitial);
    setViewYear(validInitial.getFullYear());
    setViewMonth(validInitial.getMonth());
  }, [visible, initialDate, today, allowPastDates, allowFutureDates, slideX, stageOpacity]);

  const isAtMinMonth = allowPastDates
    ? viewYear <= currentYear - 5 && viewMonth === 0
    : viewYear === currentYear && viewMonth <= currentMonth;
  const isAtMaxMonth = !allowFutureDates
    ? viewYear === currentYear && viewMonth >= currentMonth
    : viewYear >= currentYear + 10 && viewMonth === 11;

  const handlePrevMonth = () => {
    if (isAtMinMonth) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    animateMonthTransition('prev');
  };

  const handleNextMonth = () => {
    if (isAtMaxMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    animateMonthTransition('next');
  };

  const handleToggleYearPicker = () => {
    setYearPickerOpen((prev) => !prev);
    animateMonthTransition('fade');
  };

  const handlePickYear = (year: number) => {
    setViewYear(year);
    if (!allowPastDates && year === currentYear && viewMonth < currentMonth) {
      setViewMonth(currentMonth);
    }
    if (!allowFutureDates && year === currentYear && viewMonth > currentMonth) {
      setViewMonth(currentMonth);
    }
    setYearPickerOpen(false);
    animateMonthTransition('fade');
  };

  // Selalu 42 sel (6 baris tetap) agar tinggi kalender tidak melompat saat pindah bulan
  const calendarCells = useMemo(() => {
    const daysCount = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstWeekday(viewYear, viewMonth);
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysCount; d++) {
      cells.push(d);
    }
    while (cells.length < 42) {
      cells.push(null);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    if (allowPastDates && !allowFutureDates) {
      return Array.from({ length: 6 }, (_, idx) => currentYear - 5 + idx);
    }
    if (allowPastDates && allowFutureDates) {
      return Array.from({ length: 11 }, (_, idx) => currentYear - 5 + idx);
    }
    return Array.from({ length: 11 }, (_, idx) => currentYear + idx);
  }, [currentYear, allowPastDates, allowFutureDates]);

  const daysDiff = useMemo(() => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round(
      (startOfLocalDay(selectedDate).getTime() - today.getTime()) / msPerDay
    );
  }, [selectedDate, today]);

  return (
    <BaseBottomSheet
      visible={visible}
      title="Pilih Tanggal Target"
      onClose={onClose}
      footer={
        <View style={styles.footerWrap}>
          <View style={styles.previewBanner}>
            <View style={styles.previewLeft}>
              <Calendar size={15} color={accentColor} strokeWidth={2.2} />
              <Text style={styles.previewDateText}>
                {formatIndonesianFullDate(selectedDate)}
              </Text>
            </View>
            <Text style={[styles.previewDaysText, Typography.tabularNums, { color: accentColor }]}>
              {daysDiff === 0
                ? 'Hari ini'
                : daysDiff > 0
                  ? `${daysDiff} hari lagi`
                  : `${Math.abs(daysDiff)} hari lalu`}
            </Text>
          </View>

          <View style={styles.footerBtnRow}>
            {onClear ? (
              <Pressable
                onPress={() => {
                  onClear();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Tanpa Batas"
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.78 }]}
              >
                <Text style={styles.clearBtnText}>Tanpa Batas</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                onSelect(selectedDate);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Pilih Tanggal"
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: accentColor },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={styles.confirmBtnText}>Pilih Tanggal</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      {/* NAVIGASI BULAN & TAHUN */}
      <View style={styles.navRow}>
        <Pressable
          disabled={isAtMinMonth || yearPickerOpen}
          onPress={handlePrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
          style={({ pressed }) => [
            styles.navArrowBtn,
            (isAtMinMonth || yearPickerOpen) && { opacity: 0.3 },
            pressed && { opacity: 0.65, transform: [{ scale: 0.92 }] },
          ]}
        >
          <ChevronLeft size={19} color={Colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={handleToggleYearPicker}
          accessibilityRole="button"
          accessibilityLabel="Pilih tahun cepat"
          style={({ pressed }) => [styles.monthYearBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.monthYearText}>
            {FULL_MONTHS[viewMonth]} {viewYear}
          </Text>
          <Animated.View style={chevronAnimStyle}>
            <ChevronDown size={15} color={Colors.textSecondary} strokeWidth={2.2} />
          </Animated.View>
        </Pressable>

        <Pressable
          disabled={yearPickerOpen || isAtMaxMonth}
          onPress={handleNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
          style={({ pressed }) => [
            styles.navArrowBtn,
            (yearPickerOpen || isAtMaxMonth) && { opacity: 0.3 },
            pressed && { opacity: 0.65, transform: [{ scale: 0.92 }] },
          ]}
        >
          <ChevronRight size={19} color={Colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* STAGE KALENDER DENGAN TINGGI TETAP (ANTI-LOMPAT) */}
      <Animated.View style={[styles.calendarStage, stageAnimStyle]}>
        {yearPickerOpen ? (
          <View style={styles.yearGrid}>
            {yearOptions.map((y) => {
              const active = y === viewYear;
              return (
                <Pressable
                  key={y}
                  accessibilityRole="button"
                  accessibilityLabel={`Tahun ${y}`}
                  onPress={() => handlePickYear(y)}
                  style={({ pressed }) => [
                    styles.yearChip,
                    active && {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    },
                    pressed && { transform: [{ scale: 0.93 }], opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      Typography.tabularNums,
                      active && { color: '#FFFFFF' },
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((day) => (
                <View key={day} style={styles.weekCell}>
                  <Text style={styles.weekText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.dayCellWrap} />;
                }

                const cellDate = new Date(viewYear, viewMonth, day);
                const isDisabled =
                  (!allowPastDates && cellDate < today) ||
                  (!allowFutureDates && cellDate > today);
                const isToday =
                  day === today.getDate() &&
                  viewMonth === today.getMonth() &&
                  viewYear === today.getFullYear();
                const isSelected =
                  day === selectedDate.getDate() &&
                  viewMonth === selectedDate.getMonth() &&
                  viewYear === selectedDate.getFullYear();

                return (
                  <View key={`cell-${index}`} style={styles.dayCellWrap}>
                    <Pressable
                      disabled={isDisabled}
                      onPress={() => setSelectedDate(cellDate)}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${FULL_MONTHS[viewMonth]} ${viewYear}`}
                      style={({ pressed }) => [
                        styles.dayCircle,
                        isToday && !isSelected && styles.todayCircle,
                        isSelected && { backgroundColor: accentColor },
                        pressed && !isDisabled && { transform: [{ scale: 0.9 }], opacity: 0.78 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          Typography.tabularNums,
                          isDisabled && styles.dayTextPast,
                          isToday && !isSelected && { color: '#3B7AF5', fontFamily: FontFamily.bold },
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Animated.View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthYearText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  calendarStage: {
    minHeight: 284,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
  },
  yearChip: {
    width: '23%',
    height: 46,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrap: {
    width: '14.285%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: '#3B7AF5',
  },
  dayText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  dayTextPast: {
    color: '#CBD5E1',
  },
  dayTextSelected: {
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  footerWrap: {
    gap: 10,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 2,
    paddingBottom: 10,
    gap: 8,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  previewDateText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  previewDaysText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clearBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
