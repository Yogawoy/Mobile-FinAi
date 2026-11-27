import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  PieChart,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CircularProgressRing,
  HexNetworkLines,
} from '@/components/onboarding/OnboardingIllustrations';
import {
  Colors,
  FontFamily,
  TouchTarget,
  Typography,
} from '@/theme/tokens';

interface SlideItem {
  id: 'cashflow' | 'network' | 'budget' | 'ai';
  title: string;
  description: string;
}

const SLIDES: SlideItem[] = [
  {
    id: 'cashflow',
    title: 'Pantau Arus Kas\nReal-Time',
    description:
      'Catat pemasukan, pengeluaran, dan transfer lintas dompet dengan pembaruan saldo otomatis.',
  },
  {
    id: 'network',
    title: 'Semua Dompet\nTerhubung',
    description:
      'Satukan rekening bank, e-wallet, uang tunai, anggaran, dan target tabungan dalam satu aplikasi.',
  },
  {
    id: 'budget',
    title: 'Kontrol Anggaran\n& Pemborosan',
    description:
      'Atur batas pengeluaran tiap kategori dan terima peringatan dini sebelum anggaran terlewati.',
  },
  {
    id: 'ai',
    title: 'Analisis Cerdas\nBerbasis AI',
    description:
      'Dapatkan proyeksi saldo akhir bulan dan 3 rekomendasi penghematan personal dari AI Advisor.',
  },
];

function useGentleFloat(delayMs: number) {
  const reducedMotion = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    y.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
          withTiming(4, { duration: 1700, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [delayMs, reducedMotion, y]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
}

function Slide1Stage() {
  const floatWallet = useGentleFloat(0);
  const floatRing = useGentleFloat(450);
  const floatPill = useGentleFloat(900);

  return (
    <View style={styles.stage}>
      <View style={styles.pastelCircle} />

      <Image
        source={require('../../assets/images/onboarding-slide1.png')}
        style={styles.slide1Character}
        resizeMode="contain"
        accessibilityLabel="Ilustrasi manajemen arus kas dan investasi"
      />

      <Animated.View style={[styles.squareIcon48, { left: 4, top: 14 }, floatWallet]}>
        <Wallet size={21} color="#3B7AF5" strokeWidth={1.8} />
      </Animated.View>

      <Animated.View style={[styles.kpiRingCard, { right: 0, top: -18 }, floatRing]}>
        <View style={styles.ringCenter}>
          <CircularProgressRing size={46} strokeWidth={4.5} progress={0.84} color="#3B7AF5" />
          <Text style={[styles.ringPct, Typography.tabularNums]}>84%</Text>
        </View>
        <Text style={styles.kpiMicroLabel}>Skor Sehat</Text>
        <View style={styles.detailPill}>
          <Text style={styles.detailPillText}>Detail</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.slide1BottomCard, floatPill]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bottomBalanceTitle, Typography.tabularNums]}>
            Total Saldo Rp 4,85jt
          </Text>
          <Text style={styles.bottomBalanceSub}>BCA, GoPay, Tunai</Text>
        </View>
        <View style={styles.slide1RightGroup}>
          <View style={styles.softBluePctPill}>
            <Text style={[styles.softBluePctText, Typography.tabularNums]}>+12.5%</Text>
          </View>
          <View style={styles.roundBlueArrow}>
            <ArrowUpRight size={14} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const HEX_NODES = [
  {
    key: 'top',
    x: 150,
    y: 42,
    size: 48,
    bg: '#FFFFFF',
    icon: <Building2 size={20} color="#3B7AF5" strokeWidth={1.8} />,
    delay: 0,
  },
  {
    key: 'tr',
    x: 242,
    y: 94,
    size: 52,
    bg: '#F0FDFA',
    icon: <Smartphone size={21} color="#0D9488" strokeWidth={1.8} />,
    delay: 280,
  },
  {
    key: 'br',
    x: 242,
    y: 196,
    size: 52,
    bg: '#F8FAFC',
    icon: <Banknote size={21} color="#475569" strokeWidth={1.8} />,
    delay: 560,
  },
  {
    key: 'bottom',
    x: 150,
    y: 248,
    size: 44,
    bg: '#ECFDF5',
    icon: <Target size={19} color="#10B981" strokeWidth={1.8} />,
    delay: 840,
  },
  {
    key: 'bl',
    x: 58,
    y: 196,
    size: 52,
    bg: '#FFFBEB',
    icon: <PieChart size={21} color="#F59E0B" strokeWidth={1.8} />,
    delay: 1120,
  },
  {
    key: 'tl',
    x: 58,
    y: 94,
    size: 48,
    bg: '#EBF2FF',
    icon: <CalendarClock size={20} color="#2563EB" strokeWidth={1.8} />,
    delay: 1400,
  },
];

function HexNode({ node }: { node: (typeof HEX_NODES)[number] }) {
  const floatStyle = useGentleFloat(node.delay);
  return (
    <Animated.View
      style={[
        styles.hexNodeCircle,
        {
          width: node.size,
          height: node.size,
          borderRadius: node.size / 2,
          left: node.x - node.size / 2,
          top: node.y - node.size / 2,
          backgroundColor: node.bg,
        },
        floatStyle,
      ]}
    >
      {node.icon}
    </Animated.View>
  );
}

function Slide2Stage() {
  return (
    <View style={styles.stage}>
      <View style={styles.hexLinesWrap}>
        <HexNetworkLines />
      </View>

      {/* Center Hub: x: 150, y: 145, size: 66 (+ soft outer ring #DBEAFE) */}
      <View style={styles.hexCenterOuterRing}>
        <View style={styles.hexCenterInner}>
          <Sparkles size={26} color="#FFFFFF" strokeWidth={1.8} />
        </View>
      </View>

      {HEX_NODES.map((node) => (
        <HexNode key={node.key} node={node} />
      ))}
    </View>
  );
}

function Slide3Stage() {
  const floatShield = useGentleFloat(100);
  const floatProgress = useGentleFloat(500);
  const floatPill = useGentleFloat(900);

  return (
    <View style={styles.stage}>
      <View style={styles.pastelCircle} />

      <Image
        source={require('../../assets/images/onboarding-slide3.png')}
        style={styles.slide3IllustWrap}
        resizeMode="contain"
        accessibilityLabel="Ilustrasi kontrol anggaran dan analitik"
      />

      <Animated.View style={[styles.squareIcon48, { left: 4, top: 14 }, floatShield]}>
        <ShieldCheck size={22} color="#10B981" strokeWidth={1.8} />
      </Animated.View>

      <Animated.View style={[styles.slide3ProgressCard, { right: 2, top: -6 }, floatProgress]}>
        <Text style={[styles.slide3Pct, Typography.tabularNums]}>34%</Text>
        <View style={styles.thinTrack}>
          <View style={styles.thinFill} />
        </View>
        <Text style={styles.kpiMicroLabel}>Batas Aman</Text>
      </Animated.View>

      <Animated.View style={[styles.centeredBottomPill, floatPill]}>
        <View style={styles.greenDot} />
        <Text style={styles.pillBottomText}>Deteksi Pemborosan Aktif</Text>
      </Animated.View>
    </View>
  );
}

function Slide4Stage() {
  const floatSparkle = useGentleFloat(120);
  const floatMini = useGentleFloat(540);
  const floatPill = useGentleFloat(960);

  return (
    <View style={styles.stage}>
      <View style={styles.pastelCircle} />

      <Image
        source={require('../../assets/images/onboarding-slide4.png')}
        style={styles.slide4Image}
        resizeMode="contain"
        accessibilityLabel="Ilustrasi asisten keuangan AI"
      />

      <Animated.View style={[styles.squareIcon54, { left: 4, top: 14 }, floatSparkle]}>
        <View style={styles.blueCircle36}>
          <Sparkles size={18} color="#FFFFFF" strokeWidth={1.8} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.slide4MiniCard, { right: 2, top: -6 }, floatMini]}>
        <View style={styles.greenPill}>
          <Text style={[styles.greenPillText, Typography.tabularNums]}>Hemat 12%</Text>
        </View>
        <View style={styles.metricLineA} />
        <View style={styles.metricLineB} />
      </Animated.View>

      <Animated.View style={[styles.centeredBottomPill, floatPill]}>
        <View style={styles.greenPill}>
          <Text style={styles.greenPillText}>Proyeksi: Aman</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function SlideStage({ id }: { id: SlideItem['id'] }) {
  switch (id) {
    case 'cashflow':
      return <Slide1Stage />;
    case 'network':
      return <Slide2Stage />;
    case 'budget':
      return <Slide3Stage />;
    case 'ai':
      return <Slide4Stage />;
  }
}

function OnboardingSlideView({
  item,
  index,
  scrollX,
  screenWidth,
  screenHeight,
}: {
  item: SlideItem;
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
}) {
  const reducedMotion = useReducedMotion();
  const stageScale = Math.min(
    1,
    (screenWidth - 32) / 300,
    (screenHeight * 0.4) / 290
  );
  const isShort = screenHeight < 700;

  const stageStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];
    const scale = reducedMotion
      ? 1
      : interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], 'clamp');

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];
    const translateX = reducedMotion
      ? 0
      : interpolate(scrollX.value, inputRange, [22, 0, -22], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], 'clamp');

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.slideContainer, { width: screenWidth, paddingHorizontal: screenWidth < 375 ? 16 : 24 }]}>
      <View
        style={{
          height: Math.round(290 * stageScale),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ transform: [{ scale: stageScale }] }}>
          <Animated.View style={stageStyle}>
            <SlideStage id={item.id} />
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.textZone,
          isShort && { marginTop: 12 },
          textStyle,
        ]}
      >
        <Text
          style={[
            styles.slideTitle,
            isShort && { fontSize: 22, lineHeight: 28 },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.slideDesc,
            isShort && { fontSize: 13.5, lineHeight: 20 },
          ]}
        >
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
}

function IndicatorDot({
  index,
  scrollX,
  screenWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];
    const width = interpolate(scrollX.value, inputRange, [5, 24, 5], 'clamp');
    const backgroundColor = interpolateColor(scrollX.value, inputRange, [
      '#CBD5E1',
      '#2563EB',
      '#CBD5E1',
    ]);

    return { width, backgroundColor };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<SlideItem>>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToLogin = () => {
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      goToLogin();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={['#EBF2FF', '#F5F8FF', '#FFFFFF']}
      locations={[0, 0.48, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goToLogin}
            accessibilityRole="button"
            accessibilityLabel="Lewati onboarding"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.65 }]}
          >
            <Text style={styles.skipText}>Lewati</Text>
          </Pressable>
        </View>

        <Animated.FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <OnboardingSlideView
              item={item}
              index={index}
              scrollX={scrollX}
              screenWidth={width}
              screenHeight={height}
            />
          )}
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 0) + 20 }]}>
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, idx) => (
              <IndicatorDot key={slide.id} index={idx} scrollX={scrollX} screenWidth={width} />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Mulai Sekarang' : 'Lanjut'}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Text style={styles.primaryBtnText}>{isLast ? 'Mulai Sekarang' : 'Lanjut'}</Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

      const SHADOW_CARD = {
        shadowColor: '#0F172A',
      shadowOffset: {width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
};

      const styles = StyleSheet.create({
        gradientBg: {
        flex: 1,
  },
      safe: {
        flex: 1,
        backgroundColor: 'transparent',
  },
      topBar: {
        flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingTop: 8,
  },
      skipBtn: {
        minWidth: TouchTarget.minSize,
      minHeight: TouchTarget.minSize,
      alignItems: 'flex-end',
      justifyContent: 'center',
  },
      skipText: {
        fontFamily: FontFamily.semibold,
      fontSize: 14,
      color: '#6B7280',
  },
      slideContainer: {
        alignItems: 'center',
      justifyContent: 'center',
  },
      stage: {
        width: 300,
        height: 290,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        overflow: 'visible',
      },
      pastelCircle: {
        position: 'absolute',
        width: 196,
        height: 196,
        borderRadius: 98,
        backgroundColor: '#DBEAFE',
        top: 50,
        left: 52,
      },
      slide1Character: {
        position: 'absolute',
        top: 74,
        left: 30,
        width: 240,
        height: 146,
      },
      squareIcon48: {
        position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E8EDF5',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW_CARD,
  },
      squareIcon54: {
        position: 'absolute',
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E8EDF5',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW_CARD,
  },
      blueCircle36: {
        width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#3B7AF5',
      alignItems: 'center',
      justifyContent: 'center',
  },
      kpiRingCard: {
        position: 'absolute',
      width: 96,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E8EDF5',
      padding: 10,
      alignItems: 'center',
      gap: 4,
      ...SHADOW_CARD,
  },
      ringCenter: {
        width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
  },
      ringPct: {
        position: 'absolute',
      fontFamily: FontFamily.bold,
      fontSize: 11,
      color: '#111827',
  },
      kpiMicroLabel: {
        fontFamily: FontFamily.semibold,
      fontSize: 10,
      color: '#6B7280',
  },
      detailPill: {
        backgroundColor: '#EBF2FF',
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 2,
  },
      detailPillText: {
        fontFamily: FontFamily.semibold,
      fontSize: 10,
      color: '#2563EB',
  },
      slide1BottomCard: {
        position: 'absolute',
      bottom: 14,
      left: 24,
      right: 24,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E8EDF5',
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...SHADOW_CARD,
  },
      bottomBalanceTitle: {
        fontFamily: FontFamily.bold,
      fontSize: 12,
      color: '#111827',
  },
      bottomBalanceSub: {
        fontFamily: FontFamily.regular,
      fontSize: 10,
      color: '#6B7280',
      marginTop: 1,
  },
      slide1RightGroup: {
        flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
      softBluePctPill: {
        backgroundColor: '#EBF2FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
  },
      softBluePctText: {
        fontFamily: FontFamily.bold,
      fontSize: 10,
      color: '#2563EB',
  },
      roundBlueArrow: {
        width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#3B7AF5',
      alignItems: 'center',
      justifyContent: 'center',
  },
      hexLinesWrap: {
        position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
  },
      hexCenterOuterRing: {
        position: 'absolute',
      width: 78,
      height: 78,
      borderRadius: 39,
      left: 150 - 39,
      top: 145 - 39,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
  },
      hexCenterInner: {
        width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: '#3B7AF5',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW_CARD,
  },
      hexNodeCircle: {
        position: 'absolute',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW_CARD,
  },
      slide3IllustWrap: {
        position: 'absolute',
        top: 56,
        left: 22,
        width: 256,
        height: 172,
      },
      slide3ProgressCard: {
        position: 'absolute',
      width: 104,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E8EDF5',
      padding: 10,
      gap: 5,
      ...SHADOW_CARD,
  },
      slide3Pct: {
        fontFamily: FontFamily.bold,
      fontSize: 14,
      color: '#111827',
  },
      thinTrack: {
        height: 5,
      borderRadius: 99,
      backgroundColor: '#E2E8F0',
      overflow: 'hidden',
  },
      thinFill: {
        width: '34%',
      height: '100%',
      borderRadius: 99,
      backgroundColor: '#3B7AF5',
  },
      centeredBottomPill: {
        position: 'absolute',
      bottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E8EDF5',
      borderRadius: 99,
      paddingHorizontal: 16,
      paddingVertical: 8,
      ...SHADOW_CARD,
  },
      greenDot: {
        width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
  },
      pillBottomText: {
        fontFamily: FontFamily.semibold,
      fontSize: 11.5,
      color: '#111827',
  },
      slide4Image: {
    position: 'absolute',
    top: 46,
    left: 22,
    width: 256,
    height: 188,
  },
  miniPhoneFrame: {
        position: 'absolute',
      top: 66,
      left: 108,
      width: 84,
      height: 154,
      borderRadius: 16,
      backgroundColor: '#111827',
      padding: 4,
      ...SHADOW_CARD,
  },
      miniPhoneScreen: {
        flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 5,
      paddingTop: 5,
      paddingBottom: 6,
      alignItems: 'center',
      justifyContent: 'space-between',
  },
      miniPhoneNotch: {
        width: 24,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
  },
      miniPhoneLabel: {
        fontFamily: FontFamily.bold,
      fontSize: 8.5,
      color: '#2563EB',
  },
      miniPhoneBar: {
        width: '80%',
      height: 5,
      borderRadius: 3,
      backgroundColor: '#EBF2FF',
  },
      slide4MiniCard: {
        position: 'absolute',
      width: 108,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E8EDF5',
      padding: 10,
      gap: 6,
      alignItems: 'flex-start',
      ...SHADOW_CARD,
  },
      greenPill: {
        backgroundColor: '#ECFDF5',
      borderRadius: 99,
      paddingHorizontal: 9,
      paddingVertical: 3,
  },
      greenPillText: {
        fontFamily: FontFamily.bold,
      fontSize: 10.5,
      color: '#047857',
  },
      metricLineA: {
        width: '88%',
      height: 4.5,
      borderRadius: 3,
      backgroundColor: '#E2E8F0',
  },
      metricLineB: {
        width: '56%',
      height: 4.5,
      borderRadius: 3,
      backgroundColor: '#EBF2FF',
  },
      textZone: {
        marginTop: 20,
      paddingHorizontal: 32,
      alignItems: 'center',
  },
      slideTitle: {
        fontSize: 24,
      lineHeight: 31,
      fontFamily: FontFamily.bold,
      color: '#2563EB',
      textAlign: 'center',
      letterSpacing: -0.3,
  },
      slideDesc: {
        marginTop: 12,
      fontSize: 13.5,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: '#6B7280',
      textAlign: 'center',
  },
      footer: {
        paddingHorizontal: 24,
  },
      dotsRow: {
        flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginBottom: 18,
  },
      dot: {
        height: 5,
      borderRadius: 99,
  },
      primaryBtn: {
        width: '100%',
      height: 52,
      borderRadius: 14,
      backgroundColor: '#3B7AF5',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
  },
      primaryBtnPressed: {
        backgroundColor: '#2563EB',
  },
      primaryBtnText: {
        fontFamily: FontFamily.semibold,
      fontSize: 15.5,
      color: '#FFFFFF',
  },
});
