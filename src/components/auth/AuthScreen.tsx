import React, { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  type TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, Mail, User } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
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
const MORPH_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const MORPH_LAYOUT = LinearTransition.duration(320).easing(MORPH_EASING);

export type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  initialMode?: AuthMode;
}

export function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isShortHeight = height <= 680;
  const { setPendingRegistration, resetDemoData } = useFinance();

  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const isRegister = mode === 'register';

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode || submitting) return;
    setErrors({});
    setMode(nextMode);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'register') {
        setErrors({});
        setMode('login');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [mode]);

  const handleSubmit = () => {
    if (submitting) return;
    const nextErrors: typeof errors = {};

    if (isRegister && name.trim().length < 2) {
      nextErrors.name = 'Nama lengkap minimal 2 karakter.';
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (!password || password.length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }
    if (isRegister && (!confirmPassword || confirmPassword !== password)) {
      nextErrors.confirmPassword = 'Konfirmasi password tidak cocok.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setTimeout(() => {
      if (isRegister) {
        setPendingRegistration(name.trim(), email.trim());
        router.replace('/setup');
      } else {
        resetDemoData();
        router.replace('/(tabs)');
      }
    }, 180);
  };

  const handleDemoLogin = () => {
    if (submitting) return;
    setErrors({});
    setSubmitting(true);
    setTimeout(() => {
      resetDemoData();
      router.replace('/(tabs)');
    }, 140);
  };

  const handleBack = () => {
    if (isRegister) {
      switchMode('login');
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <AuthCurvedHeader
            title={isRegister ? 'Buat Akun' : 'Selamat Datang'}
            subtitle={
              isRegister
                ? 'Daftar untuk mulai mengelola keuangan'
                : 'Masuk untuk melanjutkan'
            }
            compact={isRegister}
            modeKey={mode}
            onBack={handleBack}
          />

          <LinearGradient
            colors={['#FFFFFF', '#F6F9FF', '#E8F0FE']}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.formArea,
              {
                paddingTop: isShortHeight ? (isRegister ? 24 : 32) : isRegister ? 34 : 46,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <Animated.View layout={MORPH_LAYOUT}>
              <Animated.View layout={MORPH_LAYOUT} style={styles.inputsStack}>
                {isRegister ? (
                  <Animated.View
                    key="name-field"
                    entering={FadeInDown.duration(280).easing(MORPH_EASING)}
                    exiting={FadeOutUp.duration(200)}
                    layout={MORPH_LAYOUT}
                  >
                    <AuthInput
                      icon={<User size={19} color="#3B7AF5" strokeWidth={1.9} />}
                      placeholder="Nama Lengkap"
                      accessibilityLabel="Nama Lengkap"
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailRef.current?.focus()}
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      error={errors.name}
                    />
                  </Animated.View>
                ) : null}

                <Animated.View key="email-field" layout={MORPH_LAYOUT}>
                  <AuthInput
                    ref={emailRef}
                    icon={<Mail size={19} color="#3B7AF5" strokeWidth={1.9} />}
                    placeholder="Email"
                    accessibilityLabel="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    error={errors.email}
                  />
                </Animated.View>

                <Animated.View key="password-field" layout={MORPH_LAYOUT}>
                  <AuthInput
                    ref={passwordRef}
                    icon={<Lock size={19} color="#3B7AF5" strokeWidth={1.9} />}
                    placeholder="Password"
                    accessibilityLabel="Password"
                    isPassword
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((prev) => !prev)}
                    returnKeyType={isRegister ? 'next' : 'done'}
                    blurOnSubmit={!isRegister}
                    onSubmitEditing={() => {
                      if (isRegister) {
                        confirmRef.current?.focus();
                      } else {
                        handleSubmit();
                      }
                    }}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={errors.password}
                  />
                </Animated.View>

                {isRegister ? (
                  <Animated.View
                    key="confirm-field"
                    entering={FadeInDown.duration(280).easing(MORPH_EASING)}
                    exiting={FadeOutUp.duration(200)}
                    layout={MORPH_LAYOUT}
                  >
                    <AuthInput
                      ref={confirmRef}
                      icon={<Lock size={19} color="#3B7AF5" strokeWidth={1.9} />}
                      placeholder="Konfirmasi Password"
                      accessibilityLabel="Konfirmasi Password"
                      isPassword
                      showPassword={showConfirm}
                      onTogglePassword={() => setShowConfirm((prev) => !prev)}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
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
                ) : null}
              </Animated.View>

              {!isRegister ? (
                <Animated.View
                  key="forgot-row"
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(150)}
                  layout={MORPH_LAYOUT}
                  style={styles.forgotRow}
                >
                  <Pressable
                    onPress={() => setForgotVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Lupa Password"
                    style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.65 }]}
                  >
                    <Text style={styles.forgotText}>Lupa Password?</Text>
                  </Pressable>
                </Animated.View>
              ) : null}

              <Animated.View
                layout={MORPH_LAYOUT}
                style={isRegister ? styles.ctaWrapRegister : undefined}
              >
                <AuthPrimaryButton
                  label={isRegister ? 'Daftar Sekarang' : 'Masuk'}
                  loading={submitting}
                  onPress={handleSubmit}
                />

                <AuthSocialRow onDemoPress={handleDemoLogin} />
              </Animated.View>
            </Animated.View>

            <Animated.View layout={MORPH_LAYOUT} style={styles.footer}>
              <Text style={styles.footerText}>
                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
              </Text>
              <Pressable
                onPress={() => switchMode(isRegister ? 'login' : 'register')}
                accessibilityRole="button"
                accessibilityLabel={isRegister ? 'Masuk' : 'Daftar'}
                style={({ pressed }) => [styles.footerLinkBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.footerLinkText}>
                  {isRegister ? 'Masuk' : 'Daftar'}
                </Text>
              </Pressable>
            </Animated.View>
          </LinearGradient>
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
    backgroundColor: '#E8F0FE',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#E8F0FE',
  },
  formArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  inputsStack: {
    gap: 14,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 20,
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
  ctaWrapRegister: {
    marginTop: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 5,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: '#64748B',
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
