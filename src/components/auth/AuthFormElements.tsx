import {
  Colors,
  FontFamily,
  TouchTarget,
} from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Play } from 'lucide-react-native';
import React, {
  type ComponentRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface AuthInputProps extends TextInputProps {
  icon: React.ReactNode;
  error?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export const AuthInput = forwardRef<ComponentRef<typeof TextInput>, AuthInputProps>(function AuthInput(
  {
    icon,
    error,
    isPassword = false,
    showPassword = false,
    onTogglePassword,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const internalRef = useRef<ComponentRef<typeof TextInput>>(null);

  useImperativeHandle(ref, () => internalRef.current as ComponentRef<typeof TextInput>);

  return (
    <View style={styles.fieldGroup}>
      <Pressable
        onPress={() => internalRef.current?.focus()}
        accessible={false}
        style={[
          styles.inputBox,
          focused && styles.inputBoxFocused,
          error ? styles.inputBoxError : undefined,
        ]}
      >
        <View style={styles.leadingIcon} pointerEvents="none">{icon}</View>
        <TextInput
          ref={internalRef}
          style={styles.input}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword && onTogglePassword ? (
          <Pressable
            onPress={onTogglePassword}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.65 }]}
          >
            {showPassword ? (
              <EyeOff size={19} color="#6B7280" strokeWidth={1.85} />
            ) : (
              <Eye size={19} color="#6B7280" strokeWidth={1.85} />
            )}
          </Pressable>
        ) : null}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

interface AuthPrimaryButtonProps {
  label: string;
  loading?: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AuthPrimaryButton({
  label,
  loading = false,
  onPress,
}: AuthPrimaryButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={loading}
      onPressIn={() => {
        if (!reducedMotion && !loading) {
          scale.value = withTiming(0.97, { duration: 100 });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      style={[styles.primaryShadowWrap, animatedStyle, loading && { opacity: 0.9 }]}
    >
      <LinearGradient
        colors={['#38BDF8', '#3B7AF5', '#1D4ED8']}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryGradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

function GoogleIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="#111827"
      />
    </Svg>
  );
}

function SocialTileButton({
  onPress,
  accessibilityLabel,
  extraStyle,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  extraStyle?: object;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!reducedMotion) {
          scale.value = withTiming(0.97, { duration: 100 });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.socialBox, extraStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function AuthSocialRow({
  onGooglePress,
  onApplePress,
}: {
  onGooglePress: () => void;
  onApplePress: () => void;
}) {
  return (
    <View style={styles.socialSection}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>atau lanjutkan dengan</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <SocialTileButton
          onPress={onGooglePress}
          accessibilityLabel="Lanjutkan dengan Google"
        >
          <GoogleIcon />
        </SocialTileButton>

        <SocialTileButton
          onPress={onApplePress}
          accessibilityLabel="Lanjutkan dengan Apple"
        >
          <AppleIcon />
        </SocialTileButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 15,
    height: 54,
    paddingLeft: 14,
    paddingRight: 4,
  },
  inputBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B7AF5',
    borderWidth: 1.5,
    shadowColor: '#3B7AF5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  leadingIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14.5,
    color: Colors.textPrimary,
    height: '100%',
    paddingRight: 4,
  },
  eyeBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#EF4444',
    paddingLeft: 4,
  },
  primaryShadowWrap: {
    borderRadius: 15,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryGradient: {
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.24)',
  },
  primaryBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15.5,
    color: '#FFFFFF',
  },
  socialSection: {
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: '#94A3B8',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  socialBox: {
    width: 72,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  demoBox: {
    gap: 2,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FAFF',
  },
  demoLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: '#3B7AF5',
    letterSpacing: 0.1,
  },
  socialBoxPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.97 }],
  },
});
