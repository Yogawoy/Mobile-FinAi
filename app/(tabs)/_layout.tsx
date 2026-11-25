import React from 'react';
import { Tabs } from 'expo-router';
import {
  CurvedBottomTabBar,
  type CurvedTabBarProps,
} from '@/src/components/layout/CurvedBottomTabBar';

export default function TabsLayout() {
  return (
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
  );
}
