import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock, User } from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCurvedHeader } from '@/components/auth/AuthCurvedHeader';
import {
  AuthInput,
  AuthPrimaryButton,
  AuthSocialRow,
} from '@/components/auth/AuthFormElements';
import { ForgotPasswordSheet } from '@/components/modals/ForgotPasswordSheet';
import { useFinance } from '@/context/FinanceContext';
import { FontFamily, TouchTarget } from '@/theme/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetDemoData } = useFinance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateAndLogin = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (!password || password.length < 6) {
      nextErrors.password = 'Password minimal 6 karakter.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    resetDemoData();
    router.replace('/(tabs)');
  };

  const handleDemoLogin = () => {
    setErrors({});
    resetDemoData();
    router.replace('/(tabs)');
  };

  const handleForgotPassword = () => {
    setForgotVisible(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { flexGrow: 1, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <AuthCurvedHeader
            title="Selamat Datang"
            subtitle="Masuk untuk melanjutkan"
            onBack={() => router.replace('/onboarding')}
          />

          <View style={styles.formArea}>
            <Animated.View
              entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
            >
              <AuthInput
                icon={<User size={19} color="#3B7AF5" strokeWidth={1.9} />}
                placeholder="Email"
                accessibilityLabel="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(70).duration(360).easing(Easing.out(Easing.cubic))}
              style={styles.inputGap}
            >
              <AuthInput
                icon={<Lock size={19} color="#3B7AF5" strokeWidth={1.9} />}
                placeholder="Password"
                accessibilityLabel="Password"
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
              />
            </Animated.View>

            <View style={styles.forgotRow}>
              <Pressable
                onPress={handleForgotPassword}
                accessibilityRole="button"
                accessibilityLabel="Lupa Password"
                style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.65 }]}
              >
                <Text style={styles.forgotText}>Lupa Password?</Text>
              </Pressable>
            </View>

            <Animated.View
              entering={FadeInDown.delay(140).duration(360).easing(Easing.out(Easing.cubic))}
            >
              <AuthPrimaryButton label="Masuk" onPress={validateAndLogin} />
            </Animated.View>

            <AuthSocialRow onDemoPress={handleDemoLogin} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Belum punya akun?</Text>
              <Pressable
                onPress={() => router.push('/register')}
                accessibilityRole="button"
                accessibilityLabel="Daftar"
                style={({ pressed }) => [styles.footerLinkBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.footerLinkText}>Daftar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordSheet
        visible={forgotVisible}
        initialEmail={email}
        onClose={() => setForgotVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  formArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  inputGap: {
    marginTop: 14,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 14,
  },
  forgotBtn: {
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  forgotText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#3B7AF5',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 5,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: '#6B7280',
  },
  footerLinkBtn: {
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  footerLinkText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: '#3B7AF5',
  },
});
