import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useFinance } from '@/context/FinanceContext';
import { Colors } from '@/theme/tokens';

export default function Index() {
  const { isBootstrapping, isAuthenticated, hasCompletedSetup } = useFinance();

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.canvas,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={hasCompletedSetup ? '/(tabs)' : '/setup'} />;
}
