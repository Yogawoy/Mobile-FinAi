import { HorizontalScrollStrip } from '@/components/HorizontalScrollStrip';
import { ChatRichCard } from '@/components/ai/ChatRichCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  formatNowTime,
  type ChatMessage,
  type ChatRichCardType,
} from '@/lib/mockAiChat';
import {
  aiService,
  type AiWalletOption,
  type ChatActionCard,
  type ChatChoiceCard,
  type ChatDraftCard,
  type ChatSummaryCard,
} from '@/services/ai.service';
import { budgetService } from '@/services/budget.service';
import { goalService } from '@/services/goal.service';
import { transactionService } from '@/services/transaction.service';
import { getWalletTheme, resolveWalletColorKey } from '@/lib/walletTheme';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowUp,
  BarChart3,
  ChevronRight,
  PieChart,
  PiggyBank,
  Receipt,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LocalChatMessage extends ChatMessage {
  isError?: boolean;
  retryText?: string;
  choiceResolved?: boolean;
}

const EMPTY_SHORTCUTS = [
  {
    key: 'expense',
    title: 'Catat Pengeluaran',
    example: 'Makan siang 35rb',
    prefill: 'Beli makan siang 35rb pakai ',
    autoSend: false,
    icon: 'expense' as const,
    accent: '#EF4444',
    softBg: '#FEF2F2',
  },
  {
    key: 'budget',
    title: 'Atur Anggaran',
    example: 'Makan 50rb per hari',
    prefill: 'Buat anggaran makan 50rb per hari',
    autoSend: false,
    icon: 'budget' as const,
    accent: '#2563EB',
    softBg: '#EBF2FF',
  },
  {
    key: 'saving',
    title: 'Nabung Cepat',
    example: 'Obat orang tua 100rb 7 hari',
    prefill: 'Nabung beli obat orang tua 100rb 7 hari',
    autoSend: false,
    icon: 'saving' as const,
    accent: '#10B981',
    softBg: '#ECFDF5',
  },
  {
    key: 'summary',
    title: 'Cek Keuangan',
    example: 'Ringkasan bulan ini',
    prefill: 'Bagaimana kondisi keuanganku bulan ini?',
    autoSend: true,
    icon: 'summary' as const,
    accent: '#D97706',
    softBg: '#FEF3C7',
  },
];

const QUICK_SUGGESTIONS = [
  'Cek anggaran',
  'Pengeluaran bulan ini',
  'Tips hemat',
];

function cleanDisplayText(raw: string): string {
  return raw
    .replace(/\*\*/g, '')
    .replace(/[\u2022\u00B7]/g, '')
    .replace(/\u2014/g, '-')
    .replace(/\.{3}|\u2026/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .trim();
}

function getAccentColors(accent: ChatActionCard['accent']) {
  switch (accent) {
    case 'green':
      return { color: '#10B981', bg: '#ECFDF5' };
    case 'red':
      return { color: '#EF4444', bg: '#FEF2F2' };
    case 'amber':
      return { color: '#D97706', bg: '#FEF3C7' };
    case 'blue':
    default:
      return { color: '#2563EB', bg: '#EBF2FF' };
  }
}

function getToneColor(tone?: 'default' | 'green' | 'red' | 'blue'): string {
  switch (tone) {
    case 'green':
      return '#10B981';
    case 'red':
      return '#EF4444';
    case 'blue':
      return '#2563EB';
    default:
      return '#0F172A';
  }
}

function StructuredActionCard({
  card,
  onOpenDetail,
}: {
  card: ChatActionCard;
  onOpenDetail: (route: Href) => void;
}) {
  const palette = getAccentColors(card.accent);
  const route: Href | null = card.detailRoute
    ? (`/${card.detailRoute.type}/${encodeURIComponent(card.detailRoute.id)}` as Href)
    : null;

  return (
    <View style={styles.structuredCard}>
      <View style={styles.actionTopRow}>
        <View style={[styles.actionBadge, { backgroundColor: palette.bg }]}>
          <Text style={[styles.actionBadgeText, { color: palette.color }]}>
            {card.badge}
          </Text>
        </View>
        {card.amount > 0 ? (
          <Text
            style={[styles.actionAmount, Typography.tabularNums]}
            numberOfLines={1}
          >
            {formatIDR(card.amount)}
          </Text>
        ) : null}
      </View>

      {card.title ? (
        <Text style={styles.actionTitle} numberOfLines={2}>
          {card.title}
        </Text>
      ) : null}

      {card.rows.length > 0 ? (
        <View style={styles.rowsWrap}>
          {card.rows.slice(0, 3).map((row, idx) => (
            <View key={`${row.label}-${idx}`} style={styles.kvRow}>
              <Text style={styles.kvLabel}>{row.label}</Text>
              <Text style={styles.kvValue} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {route ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onOpenDetail(route)}
          style={styles.detailLinkBtn}
        >
          <Text style={styles.detailLinkText}>Lihat Detail</Text>
          <ChevronRight size={15} color="#2563EB" strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StructuredSummaryCard({
  card,
  onOpenBudget,
  onOpenGoal,
}: {
  card: ChatSummaryCard;
  onOpenBudget?: (budgetId: string) => void;
  onOpenGoal?: (goalId: string) => void;
}) {
  const isGoalSummary = /tabungan|target/i.test(card.title);
  const getBudgetToneColor = (tone?: 'green' | 'amber' | 'red') => {
    if (tone === 'red') return '#DC2626';
    if (tone === 'amber') return '#D97706';
    return '#059669';
  };

  return (
    <View style={styles.structuredCard}>
      <Text style={styles.summaryCardTitle}>{card.title}</Text>

      {card.metrics.length > 0 ? (
        <View style={styles.metricsGrid}>
          {card.metrics.slice(0, 4).map((m, idx) => (
            <View key={`${m.label}-${idx}`} style={styles.metricTile}>
              <Text style={styles.metricLabel} numberOfLines={1}>
                {m.label}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  Typography.tabularNums,
                  { color: getToneColor(m.tone) },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {m.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {card.items && card.items.length > 0 ? (
        <View style={styles.itemsWrap}>
          {(card.items.some((it) => Boolean(it.usableText))
            ? card.items
            : card.items.slice(0, 5)
          ).map((it, idx) => {
            if (it.usableText) {
              const rowContent = (
                <>
                  <View style={styles.budgetItemLeft}>
                    <View style={styles.budgetItemTitleRow}>
                      <Text style={styles.budgetItemTitle} numberOfLines={1}>
                        {it.label}
                      </Text>
                      {it.periodLabel ? (
                        <View style={styles.budgetPeriodBadge}>
                          <Text style={styles.budgetPeriodText}>
                            {it.periodLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {it.usageText ? (
                      <Text
                        style={[styles.budgetUsageText, Typography.tabularNums]}
                        numberOfLines={1}
                      >
                        {it.usageText}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.budgetItemRight}>
                    <Text style={styles.budgetUsableLabel}>
                      {it.isExceeded ? 'Lewat batas' : 'Bisa dipakai'}
                    </Text>
                    <Text
                      style={[
                        styles.budgetUsableValue,
                        Typography.tabularNums,
                        { color: getBudgetToneColor(it.tone) },
                      ]}
                      numberOfLines={1}
                    >
                      {it.usableText}
                    </Text>
                  </View>
                </>
              );

              if (it.id && onOpenBudget) {
                return (
                  <TouchableOpacity
                    key={it.id}
                    activeOpacity={0.7}
                    onPress={() => onOpenBudget(it.id!)}
                    style={[styles.budgetItemRow, idx > 0 && styles.itemRowDivider]}
                  >
                    {rowContent}
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={`${it.label}-${idx}`}
                  style={[styles.budgetItemRow, idx > 0 && styles.itemRowDivider]}
                >
                  {rowContent}
                </View>
              );
            }

            if (it.subtitle) {
              const content = (
                <>
                  <View style={styles.budgetItemLeft}>
                    <Text style={styles.budgetItemTitle} numberOfLines={1}>
                      {it.label}
                    </Text>
                    <Text
                      style={[styles.budgetUsageText, Typography.tabularNums]}
                      numberOfLines={1}
                    >
                      {it.subtitle}
                    </Text>
                  </View>
                  <Text
                    style={[styles.itemValue, Typography.tabularNums]}
                    numberOfLines={1}
                  >
                    {it.value}
                  </Text>
                </>
              );

              if (it.id && isGoalSummary && onOpenGoal) {
                return (
                  <TouchableOpacity
                    key={it.id}
                    activeOpacity={0.7}
                    onPress={() => onOpenGoal(it.id!)}
                    style={[styles.budgetItemRow, idx > 0 && styles.itemRowDivider]}
                  >
                    {content}
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={`${it.label}-${idx}`}
                  style={[styles.budgetItemRow, idx > 0 && styles.itemRowDivider]}
                >
                  {content}
                </View>
              );
            }

            return (
              <View
                key={`${it.label}-${idx}`}
                style={[styles.itemRow, idx > 0 && styles.itemRowDivider]}
              >
                <Text style={styles.itemLabel} numberOfLines={1}>
                  {it.label}
                </Text>
                <View style={styles.itemRight}>
                  <Text
                    style={[styles.itemValue, Typography.tabularNums]}
                    numberOfLines={1}
                  >
                    {it.value}
                  </Text>
                  {it.status ? (
                    <Text style={[styles.itemStatus, Typography.tabularNums]}>
                      {it.status}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {card.tip ? (
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>{cleanDisplayText(card.tip)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StructuredChoiceCard({
  card,
  disabled,
  wallets,
  onSelect,
}: {
  card: ChatChoiceCard;
  disabled: boolean;
  wallets: Array<{
    name: string;
    type: Parameters<typeof getWalletTheme>[0];
    colorKey?: Parameters<typeof getWalletTheme>[1];
  }>;
  onSelect: (messageToSend: string) => void;
}) {
  return (
    <View style={[styles.structuredCard, styles.choiceCard]}>
      <HorizontalScrollStrip
        label={card.title}
        labelStyle={styles.choiceTitle}
        fadeColor="#FFFFFF"
        contentContainerStyle={styles.choiceScrollContent}
      >
        {card.options.map((opt, idx) => {
          const matchedWallet = wallets.find(
            (w) => w.name.toLowerCase() === opt.label.toLowerCase()
          );
          const isWalletOption =
            opt.kind === 'wallet' || Boolean(opt.color) || Boolean(matchedWallet);

          if (isWalletOption) {
            const rawColor = opt.color?.trim() ?? '';
            const isHex = /^#[0-9a-f]{6}$/i.test(rawColor);
            const accentColor = matchedWallet
              ? getWalletTheme(matchedWallet.type, matchedWallet.colorKey).primary
              : isHex
                ? rawColor
                : rawColor
                  ? getWalletTheme(
                      'BANK',
                      resolveWalletColorKey(rawColor, 'BANK')
                    ).primary
                  : '#2563EB';

            return (
              <TouchableOpacity
                key={`${opt.label}-${idx}`}
                activeOpacity={0.75}
                disabled={disabled}
                onPress={() => onSelect(opt.messageToSend)}
                style={[
                  styles.walletChoicePill,
                  {
                    backgroundColor: `${accentColor}14`,
                    borderColor: `${accentColor}55`,
                  },
                  disabled && styles.choicePillDisabled,
                ]}
              >
                <View style={styles.walletChoiceTopRow}>
                  <View
                    style={[
                      styles.walletChoiceIconBadge,
                      { backgroundColor: `${accentColor}1F` },
                    ]}
                  >
                    <Wallet size={14} color={accentColor} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.walletChoiceName} numberOfLines={1}>
                    {opt.label}
                  </Text>
                </View>
                {opt.sublabel ? (
                  <Text
                    style={[
                      styles.walletChoiceBalance,
                      Typography.tabularNums,
                      { color: accentColor },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.sublabel}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }

          const isPrimary = idx === 0 && /^buat\s+/i.test(opt.label.trim());
          return (
            <TouchableOpacity
              key={`${opt.label}-${idx}`}
              activeOpacity={0.75}
              disabled={disabled}
              onPress={() => onSelect(opt.messageToSend)}
              style={[
                styles.choicePill,
                isPrimary && styles.choicePillPrimary,
                disabled && styles.choicePillDisabled,
              ]}
            >
              <Text
                style={[
                  styles.choicePillText,
                  isPrimary && styles.choicePillTextPrimary,
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
              {opt.sublabel ? (
                <Text
                  style={[styles.choiceSublabel, Typography.tabularNums]}
                  numberOfLines={1}
                >
                  {opt.sublabel}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </HorizontalScrollStrip>
    </View>
  );
}

function StructuredDraftCard({
  card,
  disabled,
  onOpenForm,
  onCancel,
}: {
  card: ChatDraftCard;
  disabled: boolean;
  onOpenForm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.structuredCard}>
      <View style={styles.draftHeaderRow}>
        <View style={styles.draftBadge}>
          <Text style={styles.draftBadgeText}>Draf</Text>
        </View>
        <Text style={styles.summaryCardTitle} numberOfLines={1}>
          {card.title}
        </Text>
      </View>

      <View style={styles.draftRowsWrap}>
        {card.rows.map((row, idx) => (
          <View key={`${row.label}-${idx}`} style={styles.kvRow}>
            <Text style={styles.kvLabel}>{row.label}</Text>
            <Text
              style={[
                row.isMissing ? styles.draftMissingValue : styles.kvValue,
                Typography.tabularNums,
              ]}
              numberOfLines={1}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      {card.hint ? <Text style={styles.draftHint}>{card.hint}</Text> : null}

      <View style={styles.draftFooterRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={disabled}
          onPress={onOpenForm}
          style={[styles.draftPrimaryBtn, disabled && styles.choicePillDisabled]}
        >
          <Text style={styles.draftPrimaryBtnText}>Lengkapi di Form</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={disabled}
          onPress={onCancel}
          style={[styles.draftCancelBtn, disabled && styles.choicePillDisabled]}
        >
          <Text style={styles.draftCancelBtnText}>Batal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AiChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    wallets,
    budgets,
    transactions,
    goals,
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    remainingDailySafeLimit,
    hasCompletedSetup,
    refreshAllData,
    categories,
  } = useFinance();

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

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

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [processingMsgId, setProcessingMsgId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const { activeWalletCount, readyBalance, savingsBalance } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived);
    const ready = active
      .filter((w) => w.type !== 'SAVINGS')
      .reduce((sum, w) => sum + w.balance, 0);
    const savingsWallets = active
      .filter((w) => w.type === 'SAVINGS')
      .reduce((sum, w) => sum + w.balance, 0);
    const goalsTotal = goals.reduce((sum, g) => sum + g.current, 0);
    return {
      activeWalletCount: active.length,
      readyBalance: ready,
      savingsBalance: savingsWallets > 0 ? savingsWallets : goalsTotal,
    };
  }, [wallets, goals]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, () => {
      setIsKeyboardOpen(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });
    const subHide = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !isTyping) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: LocalChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: trimmed,
      timestamp: formatNowTime(),
    };

    const history = messages.slice(-6).map((m) => ({
      role: (m.sender === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    setMessages((prev) =>
      prev.map((m) =>
        m.card?.type === 'CHOICE_CARD' ? { ...m, choiceResolved: true } : m
      ).concat(userMsg)
    );
    setInputText('');
    setIsTyping(true);

    try {
      const res = await aiService.sendAiChat({
        message: trimmed,
        history,
      });

      if (res.actionExecuted) {
        await refreshAllData();
      }

      const richCard: ChatRichCardType | undefined =
        res.cardType === 'FORECAST' ||
          res.cardType === 'ANOMALY' ||
          res.cardType === 'BUDGET' ||
          res.cardType === 'BUDGET_SET' ||
          res.cardType === 'BUDGET_UPDATED' ||
          res.cardType === 'BUDGET_DELETED' ||
          res.cardType === 'BUDGET_RESET' ||
          res.cardType === 'SPENDING_BREAKDOWN' ||
          res.cardType === 'SUMMARY' ||
          res.cardType === 'GOAL' ||
          res.cardType === 'WALLET' ||
          res.cardType === 'FINANCIAL_PLAN' ||
          res.cardType === 'WALLET_PICKER' ||
          res.cardType === 'TRANSACTION_PREVIEW' ||
          res.cardType === 'TRANSACTION_CREATED'
          ? res.cardType
          : res.cardType === 'RECOMMENDATION'
            ? 'RECOMMENDATIONS'
            : undefined;

      const aiMsg: LocalChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: cleanDisplayText(res.reply),
        timestamp: formatNowTime(),
        richCard,
        cardData: res.cardData ?? null,
        card: res.card ?? null,
        actionStatus: res.actionExecuted
          ? 'CONFIRMED'
          : res.pendingConfirmation
            ? 'PENDING'
            : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: LocalChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'AI',
        text: 'Maaf, koneksi ke asisten sedang terganggu. Silakan coba kirim ulang.',
        timestamp: formatNowTime(),
        isError: true,
        retryText: trimmed,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleShortcutPress = (item: (typeof EMPTY_SHORTCUTS)[number]) => {
    if (item.autoSend) {
      void sendMessage(item.prefill);
      return;
    }
    setInputText(item.prefill);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleChangeAiCategory = (
    msgId: string,
    category: { id: string; label: string }
  ) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.cardData
          ? {
            ...m,
            cardData: {
              ...m.cardData,
              categoryId: category.id,
              categoryName: category.label,
            },
          }
          : m
      )
    );
  };

  const handleSelectPlanWallet = async (
    msg: ChatMessage,
    destWallet: AiWalletOption
  ) => {
    const plan = msg.cardData?.plan;
    if (!plan || processingMsgId) return;
    setProcessingMsgId(msg.id);
    try {
      let goalId = plan.relatedGoalId ?? null;
      if (!goalId) {
        const deadlineDate = new Date();
        if (plan.durationDays && plan.durationDays > 0) {
          deadlineDate.setDate(deadlineDate.getDate() + plan.durationDays);
        } else {
          deadlineDate.setMonth(deadlineDate.getMonth() + Math.max(1, plan.durationMonths));
        }
        const createdGoal = await goalService.createGoal({
          name: plan.targetName,
          targetAmount: plan.targetAmount,
          currentAmount: plan.currentAmount,
          deadline: deadlineDate.toISOString(),
        });
        goalId = createdGoal.id;
        await refreshAllData();
      }

      const isDailyPlan = Boolean(plan.requiredDailySaving && plan.requiredDailySaving > 0);
      const firstSaving = Math.max(
        0,
        isDailyPlan ? plan.requiredDailySaving! : plan.requiredMonthlySaving
      );
      const periodWord = isDailyPlan ? 'hari pertama' : 'bulan pertama';
      const rawWallets =
        msg.cardData?.wallets && msg.cardData.wallets.length > 0
          ? msg.cardData.wallets
          : wallets
            .filter((w) => !w.isArchived)
            .map((w) => ({
              id: w.id,
              name: w.name,
              type: w.type,
              currentBalance: w.balance,
              sufficient: w.balance >= firstSaving,
            }));
      const sourceWallets = rawWallets.filter((w) => w.id !== destWallet.id);

      if (firstSaving > 0 && sourceWallets.length > 0) {
        const pickerMsg: LocalChatMessage = {
          id: `ai-plan-src-wallet-${Date.now()}`,
          sender: 'AI',
          text: `Target "${plan.targetName}" disimpan. Pilih dompet asal untuk setoran ${periodWord}.`,
          timestamp: formatNowTime(),
          card: {
            type: 'CHOICE_CARD',
            title: `Setoran ${formatIDR(firstSaving)} dari dompet mana?`,
            options: sourceWallets.map((w) => ({
              label: w.name,
              sublabel: formatIDR(w.currentBalance),
              messageToSend: w.name,
            })),
          },
          richCard: 'WALLET_PICKER',
          cardData: {
            intent: 'GOAL_CONTRIBUTE',
            goalId,
            type: 'TRANSFER',
            amount: firstSaving,
            note: `Setoran target ${plan.targetName}`,
            destinationWalletId: destWallet.id,
            destinationWalletName: destWallet.name,
            wallets: sourceWallets.map((w) => ({
              ...w,
              sufficient: w.currentBalance >= firstSaving,
            })),
          },
        };
        setMessages((prev) => [...prev, pickerMsg]);
      } else {
        const previewMsg: LocalChatMessage = {
          id: `ai-plan-wallet-${Date.now()}`,
          sender: 'AI',
          text: `Target "${plan.targetName}" sudah disimpan.`,
          timestamp: formatNowTime(),
          card: {
            type: 'ACTION_CARD',
            badge: 'Target Tabungan Dibuat',
            accent: 'blue',
            title: plan.targetName,
            amount: plan.targetAmount,
            rows: [{ label: 'Dompet', value: destWallet.name }],
            detailRoute: { type: 'goal', id: goalId },
          },
        };
        setMessages((prev) => [...prev, previewMsg]);
      }
      showToast(`Target "${plan.targetName}" ditambahkan`);
    } catch {
      showToast('Gagal menyimpan target tabungan', 'error');
    } finally {
      setProcessingMsgId(null);
    }
  };

  const handleSelectPickerWallet = (msg: ChatMessage, walletName: string) => {
    const data = msg.cardData;
    if (
      data?.intent === 'GOAL_CONTRIBUTE' &&
      data.goalId &&
      data.destinationWalletId &&
      data.wallets
    ) {
      const sourceWallet = data.wallets.find((w) => w.name === walletName);
      if (sourceWallet) {
        const previewMsg: LocalChatMessage = {
          id: `ai-plan-preview-${Date.now()}`,
          sender: 'AI',
          text: `Konfirmasi transfer ${formatIDR(data.amount)} dari ${sourceWallet.name}.`,
          timestamp: formatNowTime(),
          richCard: 'TRANSACTION_PREVIEW',
          actionStatus: 'PENDING',
          cardData: {
            intent: 'GOAL_CONTRIBUTE',
            goalId: data.goalId,
            type: 'TRANSFER',
            amount: data.amount,
            note: data.note,
            walletId: sourceWallet.id,
            walletName: sourceWallet.name,
            destinationWalletId: data.destinationWalletId,
            destinationWalletName: data.destinationWalletName,
            currentWalletBalance: sourceWallet.currentBalance,
            projectedWalletBalance: Math.max(0, sourceWallet.currentBalance - data.amount),
          },
        };
        setMessages((prev) => [...prev, previewMsg]);
        return;
      }
    }
    void sendMessage(walletName);
  };

  const handleConfirmAiAction = async (msg: ChatMessage) => {
    const data = msg.cardData;
    if (!data || processingMsgId) return;
    setProcessingMsgId(msg.id);
    try {
      if (data.intent === 'UPSERT_BUDGET' && (data.categoryId || data.categoryName)) {
        const now = new Date();
        const savedBudget = await budgetService.upsertBudget({
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          period: data.period ?? 'MONTHLY',
          limitAmount: data.amount,
        });
        await refreshAllData();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                ...m,
                actionStatus: 'CONFIRMED',
                card: {
                  type: 'ACTION_CARD',
                  badge: 'Anggaran Disimpan',
                  accent: 'blue',
                  title: data.categoryName || 'Anggaran',
                  amount: data.amount,
                  rows: [
                    {
                      label: 'Periode',
                      value:
                        data.period === 'DAILY'
                          ? 'Harian'
                          : data.period === 'WEEKLY'
                            ? 'Mingguan'
                            : 'Bulanan',
                    },
                  ],
                  detailRoute: savedBudget?.id
                    ? { type: 'budget', id: savedBudget.id }
                    : undefined,
                },
              }
              : m
          )
        );
        showToast('Anggaran berhasil disimpan');
        return;
      }

      if (data.intent === 'DELETE_BUDGET' && data.budgetId) {
        await budgetService.deleteBudget(data.budgetId);
        await refreshAllData();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                ...m,
                actionStatus: 'CONFIRMED',
                card: {
                  type: 'ACTION_CARD',
                  badge: 'Anggaran Dihapus',
                  accent: 'red',
                  title: data.categoryName || 'Anggaran',
                  amount: data.amount,
                  rows: [],
                },
              }
              : m
          )
        );
        showToast('Anggaran berhasil dihapus');
        return;
      }

      if (data.intent === 'DELETE_GOAL' && data.goalId) {
        await goalService.deleteGoal(data.goalId);
        await refreshAllData();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                ...m,
                actionStatus: 'CONFIRMED',
                card: {
                  type: 'ACTION_CARD',
                  badge: 'Tabungan Dihapus',
                  accent: 'red',
                  title: data.note || 'Target Tabungan',
                  amount: data.amount,
                  rows: [],
                },
              }
              : m
          )
        );
        showToast('Target tabungan berhasil dihapus');
        return;
      }

      if (data.intent === 'GOAL_CONTRIBUTE' && data.goalId) {
        await goalService.contributeGoal(data.goalId, data.amount, {
          walletId: data.walletId,
          destinationWalletId: data.destinationWalletId,
          note: data.note,
        });
        await refreshAllData();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                ...m,
                actionStatus: 'CONFIRMED',
                card: {
                  type: 'ACTION_CARD',
                  badge: 'Setoran Tabungan',
                  accent: 'green',
                  title: data.note || 'Setoran Target',
                  amount: data.amount,
                  rows: [
                    ...(data.walletName
                      ? [{ label: 'Dompet', value: data.walletName }]
                      : []),
                  ],
                  detailRoute: { type: 'goal', id: data.goalId! },
                },
              }
              : m
          )
        );
        showToast('Setoran target tabungan berhasil dicatat');
        return;
      }

      if (!data.walletId) {
        showToast('Dompet tidak ditemukan', 'error');
        return;
      }

      const created = await transactionService.createTransaction({
        type: data.type,
        amount: data.amount,
        walletId: data.walletId,
        destinationWalletId:
          data.type === 'TRANSFER' ? data.destinationWalletId ?? null : null,
        categoryId:
          data.type === 'TRANSFER' ? null : data.categoryId ?? null,
        note: data.note,
      });

      await refreshAllData();
      const isTransfer = data.type === 'TRANSFER';
      const isIncome = data.type === 'INCOME';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
              ...m,
              actionStatus: 'CONFIRMED',
              card: {
                type: 'ACTION_CARD',
                badge: isTransfer
                  ? 'Transfer Berhasil'
                  : isIncome
                    ? 'Pemasukan Tercatat'
                    : 'Pengeluaran Tercatat',
                accent: isTransfer ? 'blue' : isIncome ? 'green' : 'red',
                title: data.note || data.categoryName || 'Transaksi',
                amount: data.amount,
                rows: [
                  ...(data.categoryName && !isTransfer
                    ? [{ label: 'Kategori', value: data.categoryName }]
                    : []),
                  ...(data.walletName
                    ? [{ label: isTransfer ? 'Dari' : 'Dompet', value: data.walletName }]
                    : []),
                  ...(data.destinationWalletName && isTransfer
                    ? [{ label: 'Ke', value: data.destinationWalletName }]
                    : []),
                ].slice(0, 3),
                detailRoute: { type: 'transaction', id: created.id },
              },
            }
            : m
        )
      );
      showToast('Transaksi berhasil dicatat');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi',
        'error'
      );
    } finally {
      setProcessingMsgId(null);
    }
  };

  const handleCancelAiAction = async (msg: ChatMessage) => {
    const data = msg.cardData;
    if (!data || processingMsgId) return;

    if (msg.actionStatus === 'CONFIRMED' && data.transactionId) {
      setProcessingMsgId(msg.id);
      try {
        await transactionService.deleteTransaction(data.transactionId);
        await refreshAllData();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, actionStatus: 'CANCELLED', card: null } : m
          )
        );
        showToast('Transaksi dibatalkan');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Gagal membatalkan transaksi',
          'error'
        );
      } finally {
        setProcessingMsgId(null);
      }
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, actionStatus: 'CANCELLED', card: null } : m
      )
    );
    showToast('Pencatatan dibatalkan');
  };

  const handleResetChat = () => {
    setIsTyping(false);
    setInputText('');
    setMessages([]);
    showToast('Obrolan baru dimulai');
  };

  const canSend = inputText.trim().length > 0 && !isTyping;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* 1. HEADER FIXED ROYAL BLUE */}
      <View
        style={[
          styles.blueHeader,
          { paddingTop: Math.max(insets.top, 12) + 6 },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Sparkles size={18} color="#FFFFFF" strokeWidth={2.1} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Asisten Keuangan</Text>
              <Text style={styles.headerSubtitle}>
                Terhubung ke {activeWalletCount} dompet
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setResetConfirmOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Reset percakapan"
            style={styles.resetBtn}
          >
            <RotateCcw size={17} color="#FFFFFF" strokeWidth={2.1} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FLOATING SUMMARY PILL */}
      <View style={styles.summaryPill}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Saldo Siap Pakai</Text>
          <Text
            style={[styles.summaryValueReady, Typography.tabularNums]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {formatIDR(readyBalance)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Total Tabungan</Text>
          <Text
            style={[styles.summaryValueSavings, Typography.tabularNums]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {formatIDR(savingsBalance)}
          </Text>
        </View>
      </View>

      {/* 2. AREA DAFTAR CHAT FLEXIBLE + FOOTER TERPADU */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.messagesContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0 || isTyping) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptySquircle}>
                <Sparkles size={26} color="#2563EB" strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Ada yang bisa dibantu?</Text>
              <Text style={styles.emptySubtitle}>
                Catat transaksi, buat target tabungan, atau cek kondisi keuanganmu
              </Text>

              <View style={styles.shortcutGrid}>
                {EMPTY_SHORTCUTS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.75}
                    onPress={() => handleShortcutPress(item)}
                    style={styles.shortcutCard}
                  >
                    <View
                      style={[
                        styles.shortcutIconBox,
                        { backgroundColor: item.softBg },
                      ]}
                    >
                      {item.icon === 'expense' ? (
                        <Receipt size={17} color={item.accent} strokeWidth={2.1} />
                      ) : item.icon === 'budget' ? (
                        <PieChart size={17} color={item.accent} strokeWidth={2.1} />
                      ) : item.icon === 'saving' ? (
                        <PiggyBank size={17} color={item.accent} strokeWidth={2.1} />
                      ) : (
                        <BarChart3 size={17} color={item.accent} strokeWidth={2.1} />
                      )}
                    </View>
                    <Text style={styles.shortcutTitle}>{item.title}</Text>
                    <Text style={styles.shortcutExample} numberOfLines={1}>
                      {item.example}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'USER';

              if (isUser) {
                return (
                  <View key={msg.id} style={styles.userRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userText}>{msg.text}</Text>
                    </View>
                    <Text style={styles.timeRight}>{msg.timestamp}</Text>
                  </View>
                );
              }

              return (
                <View key={msg.id} style={styles.aiGroup}>
                  <View style={styles.aiRow}>
                    <View style={styles.aiMiniAvatar}>
                      <Sparkles size={14} color="#2563EB" strokeWidth={2.1} />
                    </View>
                    <View style={styles.aiContentCol}>
                      <View style={styles.aiBubble}>
                        <Text style={styles.aiText}>
                          {cleanDisplayText(msg.text)}
                        </Text>

                        {msg.isError && msg.retryText ? (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => void sendMessage(msg.retryText!)}
                            style={styles.retryBtn}
                          >
                            <RefreshCw size={13} color="#2563EB" strokeWidth={2.2} />
                            <Text style={styles.retryText}>Coba lagi</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {msg.card ? (
                        <View style={styles.cardSlot}>
                          {msg.card.type === 'ACTION_CARD' ? (
                            <StructuredActionCard
                              card={msg.card}
                              onOpenDetail={(route) => router.push(route)}
                            />
                          ) : msg.card.type === 'SUMMARY_CARD' ? (
                            <StructuredSummaryCard
                              card={msg.card}
                              onOpenBudget={(budgetId) => router.push(`/budget/${budgetId}`)}
                              onOpenGoal={(goalId) => router.push(`/goal/${goalId}` as Href)}
                            />
                          ) : msg.card.type === 'DRAFT_CARD' ? (
                            <StructuredDraftCard
                              card={msg.card}
                              disabled={isTyping}
                              onOpenForm={() =>
                                router.push({
                                  pathname: msg.card!.type === 'DRAFT_CARD' ? msg.card!.formRoute.pathname : '/transaction/form',
                                  params: msg.card!.type === 'DRAFT_CARD' ? msg.card!.formRoute.params : undefined,
                                } as Href)
                              }
                              onCancel={() => void sendMessage('batal')}
                            />
                          ) : (
                            <StructuredChoiceCard
                              card={msg.card}
                              disabled={Boolean(msg.choiceResolved) || isTyping}
                              wallets={wallets}
                              onSelect={(text) => void sendMessage(text)}
                            />
                          )}
                        </View>
                      ) : msg.richCard ? (
                        <View style={styles.cardSlot}>
                          <ChatRichCard
                            type={msg.richCard}
                            live={liveContext}
                            cardData={msg.cardData}
                            actionStatus={msg.actionStatus}
                            isProcessingAction={processingMsgId === msg.id}
                            categories={categories}
                            onConfirmAction={() => void handleConfirmAiAction(msg)}
                            onCancelAction={() => void handleCancelAiAction(msg)}
                            onSelectWallet={(walletName) =>
                              handleSelectPickerWallet(msg, walletName)
                            }
                            onSelectPlanWallet={(wallet) =>
                              void handleSelectPlanWallet(msg, wallet)
                            }
                            onSelectCategory={(cat) => handleChangeAiCategory(msg.id, cat)}
                          />
                        </View>
                      ) : null}

                      <Text style={styles.timeLeft}>{msg.timestamp}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {isTyping ? (
            <View style={styles.aiRow}>
              <View style={styles.aiMiniAvatar}>
                <Sparkles size={14} color="#2563EB" strokeWidth={2.1} />
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingBubbleText}>
                  Sedang menyiapkan jawaban
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* 3. FOOTER BAWAH TERPADU (ANTI TUMPANG TINDIH DENGAN TAB BAR) */}
        <View
          style={[
            styles.unifiedFooter,
            {
              marginBottom: isKeyboardOpen ? 0 : 104 + insets.bottom,
              paddingBottom: 10,
            },
          ]}
        >
          {messages.length > 0 && !isKeyboardOpen ? (
            <HorizontalScrollStrip
              fadeColor="#FFFFFF"
              contentContainerStyle={styles.promptsScroll}
            >
              {QUICK_SUGGESTIONS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  activeOpacity={0.75}
                  onPress={() => void sendMessage(prompt)}
                  disabled={isTyping}
                  style={styles.promptChip}
                >
                  <Text style={styles.promptChipText} numberOfLines={1}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </HorizontalScrollStrip>
          ) : null}

          <View
            style={[
              styles.inputBox,
              inputFocused && styles.inputBoxFocused,
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Tulis transaksi atau pertanyaan"
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setInputFocused(true);
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
              onBlur={() => setInputFocused(false)}
              multiline
              textAlignVertical="center"
            />

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => void sendMessage(inputText)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Kirim pesan"
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            >
              <ArrowUp size={19} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={resetConfirmOpen}
        title="Mulai Obrolan Baru?"
        message="Riwayat percakapan saat ini akan direset ke tampilan awal."
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

const SOFT_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  blueHeader: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    gap: 11,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 1,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...SOFT_SHADOW,
  },
  summaryCol: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  summaryValueReady: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
    marginTop: 2,
  },
  summaryValueSavings: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#2563EB',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#EEF2F7',
    marginHorizontal: 12,
  },
  chatContainer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  messagesContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptySquircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: '#0F172A',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 28,
  },
  shortcutGrid: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  shortcutCard: {
    width: '48.4%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 14,
    gap: 5,
    ...SOFT_SHADOW,
  },
  shortcutIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  shortcutTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#0F172A',
  },
  shortcutExample: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: '#2563EB',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  timeRight: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginRight: 4,
  },
  aiGroup: {
    alignItems: 'flex-start',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  aiMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiContentCol: {
    flex: 1,
    maxWidth: '92%',
    alignItems: 'flex-start',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    ...SOFT_SHADOW,
  },
  aiText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  cardSlot: {
    width: '100%',
    marginTop: 8,
  },
  timeLeft: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SOFT_SHADOW,
  },
  loadingBubbleText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#EBF2FF',
  },
  retryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#2563EB',
  },
  structuredCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 14,
    gap: 10,
    ...SOFT_SHADOW,
  },
  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  actionBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  actionAmount: {
    flexShrink: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'right',
  },
  actionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#0F172A',
  },
  rowsWrap: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  kvLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
  },
  kvValue: {
    flexShrink: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#0F172A',
    textAlign: 'right',
  },
  detailLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLinkText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#2563EB',
  },
  summaryCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: '#0F172A',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  metricLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  metricValue: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  itemsWrap: {
    paddingTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 8,
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  budgetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  budgetItemLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 3,
  },
  budgetItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetItemTitle: {
    flexShrink: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#0F172A',
  },
  budgetPeriodBadge: {
    backgroundColor: '#EBF2FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  budgetPeriodText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: '#2563EB',
  },
  budgetUsageText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  budgetItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  budgetUsableLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  budgetUsableValue: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  itemLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: '#475569',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  itemValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  itemStatus: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#2563EB',
  },
  tipBox: {
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    padding: 10,
  },
  tipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: '#1E40AF',
    lineHeight: 18,
  },
  choiceCard: {
    width: '100%',
    overflow: 'hidden',
  },
  choiceTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#0F172A',
  },
  choiceScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  choicePill: {
    flexShrink: 0,
    minHeight: 42,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  choicePillPrimary: {
    backgroundColor: '#EBF2FF',
    borderColor: '#2563EB',
  },
  choicePillDisabled: {
    opacity: 0.55,
  },
  choicePillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#0F172A',
  },
  choicePillTextPrimary: {
    color: '#2563EB',
  },
  choiceSublabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  walletChoicePill: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
    minWidth: 124,
  },
  walletChoiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  walletChoiceIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletChoiceName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#0F172A',
    flexShrink: 1,
  },
  walletChoiceBalance: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
  },
  draftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftBadge: {
    backgroundColor: '#EBF2FF',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  draftBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: '#2563EB',
  },
  draftRowsWrap: {
    gap: 8,
  },
  draftMissingValue: {
    flexShrink: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#D97706',
    textAlign: 'right',
  },
  draftHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  draftFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  draftPrimaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  draftPrimaryBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  draftCancelBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  draftCancelBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#64748B',
  },
  unifiedFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingTop: 10,
    gap: 8,
  },
  promptsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  promptChip: {
    flexShrink: 0,
    height: 32,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.full,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    marginHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 5,
    paddingRight: 5,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  inputBoxFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
    color: '#0F172A',
    paddingVertical: 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
