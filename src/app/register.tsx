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
import { Lock, Mail, User } from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCurvedHeader } from '@/components/auth/AuthCurvedHeader';
import {
  AuthInput,
  AuthPrimaryButton,
  AuthSocialRow,
} from '@/components/auth/AuthFormElements';
import { useFinance } from '@/context/FinanceContext';
import { FontFamily, TouchTarget } from '@/theme/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPendingRegistration } = useFinance();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleRegister = () => {
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Nama lengkap minimal 2 karakter.';
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (!password || password.length < 6) {
      nextErrors.password = 'Password minimal 6 karakter.';
    }
    if (!confirmPassword || confirmPassword !== password) {
      nextErrors.confirmPassword = 'Konfirmasi password tidak cocok.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPendingRegistration(name.trim(), email.trim());
    router.replace('/setup');
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
            title="Buat Akun"
            subtitle="Daftar untuk mulai mengelola keuangan"
            compact
            onBack={() => router.back()}
          />

          <View style={styles.formArea}>
            <Animated.View
              entering={FadeInDown.duration(340).easing(Easing.out(Easing.cubic))}
            >
              <AuthInput
                icon={<User size={19} color="#3B7AF5" strokeWidth={1.9} />}
                placeholder="Nama Lengkap"
                accessibilityLabel="Nama Lengkap"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={errors.name}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(60).duration(340).easing(Easing.out(Easing.cubic))}
              style={styles.inputGap}
            >
              <AuthInput
                icon={<Mail size={19} color="#3B7AF5" strokeWidth={1.9} />}
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
              entering={FadeInDown.delay(120).duration(340).easing(Easing.out(Easing.cubic))}
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

            <Animated.View
              entering={FadeInDown.delay(180).duration(340).easing(Easing.out(Easing.cubic))}
              style={styles.inputGap}
            >
              <AuthInput
                icon={<Lock size={19} color="#3B7AF5" strokeWidth={1.9} />}
                placeholder="Konfirmasi Password"
                accessibilityLabel="Konfirmasi Password"
                isPassword
                showPassword={showConfirm}
                onTogglePassword={() => setShowConfirm((prev) => !prev)}
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={errors.confirmPassword}
              />
            </Animated.View>

            <View style={styles.ctaWrap}>
              <AuthPrimaryButton label="Daftar Sekarang" onPress={handleRegister} />
            </View>

            <AuthSocialRow onDemoPress={() => router.replace('/(tabs)')} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Sudah punya akun?</Text>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Masuk"
                style={({ pressed }) => [styles.footerLinkBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.footerLinkText}>Masuk</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 10,
  },
  inputGap: {
    marginTop: 12,
  },
  ctaWrap: {
    marginTop: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
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
