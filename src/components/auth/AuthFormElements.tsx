import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  Colors,
  FontFamily,
  Motion,
  TouchTarget,
} from '@/theme/tokens';

interface AuthInputProps extends TextInputProps {
  icon: React.ReactNode;
  error?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export function AuthInput({
  icon,
  error,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  ...inputProps
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <View
        style={[
          styles.inputBox,
          focused && styles.inputBoxFocused,
          error ? styles.inputBoxError : undefined,
        ]}
      >
        <View style={styles.leadingIcon}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {isPassword && onTogglePassword ? (
          <Pressable
            onPress={onTogglePassword}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            style={styles.eyeBtn}
          >
            {showPassword ? (
              <EyeOff size={19} color="#6B7280" strokeWidth={1.8} />
            ) : (
              <Eye size={19} color="#6B7280" strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

interface AuthPrimaryButtonProps {
  label: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AuthPrimaryButton({ label, onPress }: AuthPrimaryButtonProps) {
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
          scale.value = withTiming(0.98, { duration: Motion.pressMs });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withTiming(1, { duration: Motion.pressMs });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.primaryShadowWrap, animatedStyle]}
    >
      <LinearGradient
        colors={['#4B89FF', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryGradient}
      >
        <Text style={styles.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function GoogleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
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
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="#111827"
      />
    </Svg>
  );
}

export function AuthSocialRow({ onDemoPress }: { onDemoPress: () => void }) {
  return (
    <View style={styles.socialSection}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>atau lanjutkan dengan</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <Pressable
          onPress={onDemoPress}
          accessibilityRole="button"
          accessibilityLabel="Lanjutkan dengan Google"
          style={({ pressed }) => [styles.socialBox, pressed && styles.socialBoxPressed]}
        >
          <GoogleIcon />
        </Pressable>

        <Pressable
          onPress={onDemoPress}
          accessibilityRole="button"
          accessibilityLabel="Lanjutkan dengan Apple"
          style={({ pressed }) => [styles.socialBox, pressed && styles.socialBoxPressed]}
        >
          <AppleIcon />
        </Pressable>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderRadius: 16,
    height: 54,
    paddingLeft: 16,
    paddingRight: 6,
  },
  inputBoxFocused: {
    borderColor: '#3B7AF5',
    borderWidth: 1.5,
  },
  inputBoxError: {
    borderColor: Colors.expense,
    backgroundColor: Colors.expenseSoft,
  },
  leadingIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14.5,
    color: Colors.textPrimary,
    height: '100%',
  },
  eyeBtn: {
    minWidth: TouchTarget.minSize,
    minHeight: TouchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.expenseText,
    paddingLeft: 4,
  },
  primaryShadowWrap: {
    borderRadius: 16,
    shadowColor: '#3B7AF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryGradient: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15.5,
    color: '#FFFFFF',
  },
  socialSection: {
    marginTop: 22,
    gap: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EDF5',
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
    width: 68,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  socialBoxPressed: {
    backgroundColor: '#F8FAFC',
  },
});
