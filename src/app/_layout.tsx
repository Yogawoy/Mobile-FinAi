import React, { useEffect, useState } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { FinanceProvider } from '@/context/FinanceContext';
import { Colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <ToastProvider>
          <StatusBar style={splashFinished ? 'dark' : 'light'} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade_from_bottom',
              animationDuration: 300,
              contentStyle: { backgroundColor: Colors.canvas },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen
              name="login"
              options={{ animation: 'fade', animationDuration: 260 }}
            />
            <Stack.Screen
              name="register"
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="setup"
              options={{ animation: 'slide_from_right', gestureEnabled: false }}
            />
            <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="recurring" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="forecast" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          </Stack>
          {!splashFinished ? (
            <AnimatedSplash onFinish={() => setSplashFinished(true)} />
          ) : null}
        </ToastProvider>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
