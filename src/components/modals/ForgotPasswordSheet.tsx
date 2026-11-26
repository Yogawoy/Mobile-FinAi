import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { Colors, FontFamily } from '@/theme/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordSheetProps {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export function ForgotPasswordSheet({
  visible,
  initialEmail = '',
  onClose,
}: ForgotPasswordSheetProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setEmail(initialEmail);
    setError(undefined);
  }, [visible, initialEmail]);

  const handleSend = () => {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    showToast(`Link reset dikirim ke ${trimmed}`);
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title="Lupa Password"
      onClose={onClose}
      footer={
        <Pressable
          onPress={handleSend}
          accessibilityRole="button"
          accessibilityLabel="Kirim Link Reset"
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { backgroundColor: Colors.primaryDark },
          ]}
        >
          <Text style={styles.submitText}>Kirim Link Reset</Text>
        </Pressable>
      }
    >
      <Text style={styles.desc}>
        Masukkan email terdaftar Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
      </Text>

      <Text style={styles.label}>Alamat Email</Text>
      <View style={[styles.inputBox, error && styles.inputBoxError]}>
        <Mail size={18} color={Colors.primary} strokeWidth={1.9} />
        <TextInput
          style={styles.input}
          placeholder="nama@email.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (error) setError(undefined);
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputBoxError: {
    borderColor: Colors.expense,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.expense,
    marginTop: 6,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
