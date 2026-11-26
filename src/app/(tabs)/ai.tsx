import React, { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RotateCcw, Send, Sparkles } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatRichCard } from '@/components/ai/ChatRichCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import {
  formatNowTime,
  generateAiReply,
  getWelcomeMessage,
  QUICK_PROMPTS,
  type ChatMessage,
} from '@/lib/mockAiChat';
import { Colors, FontFamily, Radius, TouchTarget } from '@/theme/tokens';

function BouncingDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.typingDot, animStyle]} />;
}

function AiSenderHeader({ timestamp }: { timestamp?: string }) {
  return (
    <View style={styles.aiSenderHeader}>
      <View style={styles.aiMiniBadge}>
        <Sparkles size={13} color={Colors.primary} strokeWidth={2.1} />
      </View>
      <Text style={styles.aiSenderName}>Smart Finance AI</Text>
      {timestamp ? <Text style={styles.aiSenderTime}>{timestamp}</Text> : null}
    </View>
  );
}

function TypingIndicatorBubble() {
  return (
    <View style={styles.aiBlock}>
      <AiSenderHeader />
      <View style={styles.typingBubble}>
        <BouncingDot delay={0} />
        <BouncingDot delay={140} />
        <BouncingDot delay={280} />
      </View>
    </View>
  );
}

export default function AiChatbotScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    wallets,
    budgets,
    transactions,
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    remainingDailySafeLimit,
    hasCompletedSetup,
  } = useFinance();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveContext = {
    userProfile,
    wallets,
    budgets,
    transactions,
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    remainingDailySafeLimit,
    hasCompletedSetup,
  };

  const welcomeProfile = {
    name: userProfile.name,
    financialChallenge: userProfile.financialChallenge,
    budgetRule: userProfile.budgetRule,
    safeDailyLimit: userProfile.safeDailyLimit,
    hasCompletedSetup,
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    getWelcomeMessage(welcomeProfile),
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'msg-welcome') {
        return [
          getWelcomeMessage({
            name: userProfile.name,
            financialChallenge: userProfile.financialChallenge,
            budgetRule: userProfile.budgetRule,
            safeDailyLimit: userProfile.safeDailyLimit,
            hasCompletedSetup,
          }),
        ];
      }
      return prev;
    });
  }, [
    hasCompletedSetup,
    userProfile.name,
    userProfile.financialChallenge,
    userProfile.budgetRule,
    userProfile.safeDailyLimit,
  ]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const subHide = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping]);

  const sendMessage = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: trimmed,
      timestamp: formatNowTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    replyTimerRef.current = setTimeout(() => {
      const reply = generateAiReply(trimmed, liveContext);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: reply.text,
        timestamp: formatNowTime(),
        richCard: reply.richCard,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleResetChat = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setIsTyping(false);
    setInputText('');
    setMessages([getWelcomeMessage(welcomeProfile)]);
    showToast('Obrolan baru dimulai');
  };

  const canSend = inputText.trim().length > 0 && !isTyping;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* HEADER CHAT BIRU KOMPAK */}
      <LinearGradient
        colors={['#4B89FF', '#3B7AF5', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 10 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Smart Finance AI</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Online • Terhubung ke Data Nov 2026
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => setResetConfirmOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Mulai obrolan baru"
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.75 }]}
          >
            <RotateCcw size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* BODY + KEYBOARD AVOIDING */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'USER';

            if (isUser) {
              return (
                <Animated.View
                  key={msg.id}
                  entering={FadeInUp.duration(220)}
                  style={styles.userRow}
                >
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                  <Text style={styles.timeRight}>{msg.timestamp}</Text>
                </Animated.View>
              );
            }

            return (
              <Animated.View
                key={msg.id}
                entering={FadeInUp.duration(260)}
                style={styles.aiBlock}
              >
                <AiSenderHeader timestamp={msg.timestamp} />

                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>{msg.text}</Text>
                  {msg.richCard ? (
                    <ChatRichCard type={msg.richCard} live={liveContext} />
                  ) : null}
                </View>
              </Animated.View>
            );
          })}

          {isTyping ? <TypingIndicatorBubble /> : null}
        </ScrollView>

        {/* QUICK PROMPT CHIPS + INPUT BAR */}
        <View
          style={[
            styles.composerDock,
            { paddingBottom: isKeyboardOpen ? 12 : 104 + insets.bottom },
          ]}
        >
          {!isKeyboardOpen ? (
            <View style={styles.promptsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.promptsScroll}
              >
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => sendMessage(prompt)}
                    disabled={isTyping}
                    style={({ pressed }) => [
                      styles.promptChip,
                      pressed && { backgroundColor: Colors.primarySoft },
                    ]}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                inputFocused && styles.textInputFocused,
              ]}
              placeholder="Tanya soal keuanganmu..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => sendMessage(inputText)}
              returnKeyType="send"
              multiline={false}
            />

            <Pressable
              onPress={() => sendMessage(inputText)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Kirim pesan"
              style={({ pressed }) => [
                styles.sendBtn,
                !canSend && styles.sendBtnDisabled,
                pressed && canSend && { opacity: 0.85 },
              ]}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.1} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={resetConfirmOpen}
        title="Mulai Obrolan Baru?"
        message="Riwayat percakapan saat ini akan direset ke pesan awal."
        confirmLabel="Reset"
        variant="primary"
        icon="reset"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          handleResetChat();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  blueHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.88)',
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatContainer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },

  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: Colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  timeRight: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 4,
    marginRight: 4,
  },

  aiBlock: {
    alignItems: 'flex-start',
  },
  aiSenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiMiniBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSenderName: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#475569',
  },
  aiSenderTime: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  aiBubble: {
    width: '94%',
    maxWidth: '94%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  aiText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 21,
  },

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },

  composerDock: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 10,
  },
  promptsWrap: {
    height: 36,
  },
  promptsScroll: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  promptChip: {
    height: 34,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 96,
    backgroundColor: Colors.canvas,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textInputFocused: {
    borderColor: Colors.primary,
  },
  sendBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
});
