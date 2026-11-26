import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import {
  CurvedBottomTabBar,
  type CurvedTabBarProps,
} from '@/components/layout/CurvedBottomTabBar';
import {
  CoachMarkOverlay,
  type CoachMarkStep,
} from '@/components/tutorial/CoachMarkOverlay';
import { useFinance } from '@/context/FinanceContext';

const TUTORIAL_STEPS: CoachMarkStep[] = [
  {
    key: 'balance',
    title: 'Pantau Total Saldo Real-Time',
    description:
      'Saldo gabungan seluruh dompetmu tampil di sini. Ketuk ikon mata kapan saja untuk menyembunyikan nominal.',
  },
  {
    key: 'actions',
    title: 'Catat Transaksi dalam 1 Ketukan',
    description:
      'Gunakan 4 pintasan ini untuk mencatat arus kas harian atau transfer antar dompet dengan cepat.',
  },
  {
    key: 'summary',
    title: 'Kontrol Anggaran & Skor AI',
    description:
      'Lihat ringkasan pemasukan, pengeluaran, progres anggaran bulanan, dan status kesehatan keuanganmu.',
  },
  {
    key: 'shortcuts',
    title: 'Akses Semua Fitur Keuangan',
    description:
      'Atur Anggaran, Target Tabungan, Tagihan Rutin, Kategori, hingga halaman khusus Prediksi Arus Kas.',
  },
  {
    key: 'ai_fab',
    title: 'Asisten AI Siap Membantu 24/7',
    description:
      'Ketuk tombol biru di tengah kapan saja untuk bertanya soal kondisi keuangan, pemborosan, atau tips hemat.',
  },
];

export default function TabsLayout() {
  const {
    tutorialVisible,
    tutorialStep,
    tutorialTargetRect,
    setTutorialStep,
    completeTutorial,
  } = useFinance();

  const handleNext = () => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      completeTutorial();
      return;
    }
    setTutorialStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (tutorialStep <= 0) return;
    setTutorialStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    completeTutorial();
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => (
          <CurvedBottomTabBar {...(props as unknown as CurvedTabBarProps)} />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
        <Tabs.Screen name="transactions" options={{ title: 'Transaksi' }} />
        <Tabs.Screen name="ai" options={{ title: 'AI' }} />
        <Tabs.Screen name="wallets" options={{ title: 'Dompet' }} />
        <Tabs.Screen name="budgets" options={{ title: 'Anggaran' }} />
      </Tabs>

      <CoachMarkOverlay
        visible={tutorialVisible}
        stepIndex={tutorialStep}
        totalSteps={TUTORIAL_STEPS.length}
        step={TUTORIAL_STEPS[tutorialStep] ?? TUTORIAL_STEPS[0]}
        targetRect={tutorialTargetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
