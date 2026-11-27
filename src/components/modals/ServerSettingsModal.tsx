import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { FocusTextInput } from '@/components/ui/FocusTextInput';
import { FinColors, FinRadius } from '@/constants/theme';
import { DEFAULT_PRODUCTION_API_URL, getApiBaseUrl } from '@/lib/api-client';
import { setApiUrlOverride } from '@/lib/storage';

interface ServerSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdated?: (url: string) => void;
}

const PRESETS = [
  { label: 'Production (Vercel)', url: DEFAULT_PRODUCTION_API_URL },
  { label: 'Local Wi-Fi (PC LAN)', url: 'http://192.168.1.106:3000' },
  { label: 'Android Emulator', url: 'http://10.0.2.2:3000' },
];

export function ServerSettingsModal({ visible, onClose, onUpdated }: ServerSettingsModalProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!visible) return;
    getApiBaseUrl().then(setUrl);
  }, [visible]);

  const handleSave = async () => {
    await setApiUrlOverride(url);
    const active = await getApiBaseUrl();
    onUpdated?.(active);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Konfigurasi Server API</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            Untuk HP fisik yang terhubung di Wi-Fi sama dengan PC, pilih Local Wi-Fi lalu jalankan
            backend lokal (`npm run dev`). Atau gunakan Production Vercel langsung.
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.url}
                style={[styles.presetBtn, url === preset.url && styles.presetBtnActive]}
                onPress={() => setUrl(preset.url)}
              >
                <Text
                  style={[styles.presetLabel, url === preset.url && styles.presetLabelActive]}
                >
                  {preset.label}
                </Text>
                <Text style={styles.presetUrl}>{preset.url}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FocusTextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://api.finai.app"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Simpan Server</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 38, 54, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: FinColors.surface,
    borderRadius: FinRadius.lg,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: FinColors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
  },
  desc: {
    fontSize: 12,
    color: FinColors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  presets: {
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    padding: 10,
    borderRadius: FinRadius.md,
    backgroundColor: FinColors.canvas,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  presetBtnActive: {
    backgroundColor: FinColors.lavenderSoft,
    borderColor: FinColors.periwinkle,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: FinColors.textPrimary,
  },
  presetLabelActive: {
    color: FinColors.periwinkleDark,
  },
  presetUrl: {
    fontSize: 11,
    color: FinColors.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: FinColors.canvas,
    borderRadius: FinRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: FinColors.textPrimary,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  saveBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
