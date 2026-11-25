import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export function CircularProgressRing({
  size = 46,
  strokeWidth = 4.5,
  progress = 0.84,
  color = '#3B7AF5',
}: {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E2E8F0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

/**
 * Slide 1: Flat vector character with laptop, 4-panel analytics dashboard, and sprouting money bag.
 */
export function CashflowCharacterIllustration() {
  return (
    <Svg width={200} height={166} viewBox="0 0 240 200">
      <Defs>
        <SvgLinearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#3B7AF5" />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </SvgLinearGradient>
      </Defs>

      {/* Soft ground shadow */}
      <Path
        d="M22 178 Q120 185 218 178"
        stroke="#CBD5E1"
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Analytics Dashboard Board */}
      <Rect x={74} y={34} width={126} height={96} rx={12} fill="url(#boardGrad)" />

      {/* Panel 1 (Top-Left White): Bar Chart + Trend Line + $ */}
      <Rect x={82} y={42} width={54} height={40} rx={6} fill="#FFFFFF" />
      <Rect x={88} y={64} width={7} height={13} rx={2} fill="#38BDF8" />
      <Rect x={99} y={58} width={7} height={19} rx={2} fill="#EF4444" />
      <Rect x={110} y={61} width={7} height={16} rx={2} fill="#EF4444" />
      <Rect x={121} y={51} width={7} height={26} rx={2} fill="#06B6D4" />
      <Path
        d="M89 60 L102 53 L113 57 L125 46"
        stroke="#1E3A8A"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={125} cy={46} r={2} fill="#10B981" />

      {/* Panel 2 (Top-Right): Pie Chart + 3 Checklist Bars */}
      <Rect x={142} y={42} width={50} height={40} rx={6} fill="#60A5FA" opacity={0.35} />
      <Circle cx={157} cy={62} r={11} fill="#FFFFFF" />
      <Path d="M157 62 L157 51 A11 11 0 0 1 167 57 Z" fill="#FBBF24" />
      <Path d="M157 62 L147 67 A11 11 0 0 1 157 51 Z" fill="#EF4444" />
      <Rect x={173} y={52} width={5} height={5} rx={1.5} fill="#FBBF24" />
      <Rect x={180} y={53.5} width={9} height={2.5} rx={1} fill="#DBEAFE" />
      <Rect x={173} y={60} width={5} height={5} rx={1.5} fill="#FBBF24" />
      <Rect x={180} y={61.5} width={9} height={2.5} rx={1} fill="#DBEAFE" />
      <Rect x={173} y={68} width={5} height={5} rx={1.5} fill="#FBBF24" />
      <Rect x={180} y={69.5} width={9} height={2.5} rx={1} fill="#DBEAFE" />

      {/* Panel 3 (Bottom-Left): Multi-bar Chart + Curve */}
      <Rect x={82} y={88} width={54} height={34} rx={6} fill="#60A5FA" opacity={0.35} />
      <Rect x={87} y={108} width={5} height={10} rx={1.5} fill="#FBBF24" />
      <Rect x={95} y={103} width={5} height={15} rx={1.5} fill="#FBBF24" />
      <Rect x={103} y={106} width={5} height={12} rx={1.5} fill="#FBBF24" />
      <Rect x={111} y={99} width={5} height={19} rx={1.5} fill="#38BDF8" />
      <Rect x={119} y={96} width={5} height={22} rx={1.5} fill="#FBBF24" />
      <Rect x={127} y={93} width={5} height={25} rx={1.5} fill="#38BDF8" />
      <Path
        d="M87 104 Q108 112 131 92"
        stroke="#1E3A8A"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />

      {/* Panel 4 (Bottom-Right): Two Donut Rings */}
      <Rect x={142} y={88} width={50} height={34} rx={6} fill="#60A5FA" opacity={0.35} />
      <Circle cx={157} cy={102} r={7.5} stroke="#FFFFFF" strokeWidth={3.5} fill="none" />
      <Path d="M157 94.5 A7.5 7.5 0 0 1 164.5 102" stroke="#EF4444" strokeWidth={3.5} fill="none" />
      <Circle cx={178} cy={102} r={7.5} stroke="#FFFFFF" strokeWidth={3.5} fill="none" />
      <Path d="M178 94.5 A7.5 7.5 0 0 1 185.5 102" stroke="#10B981" strokeWidth={3.5} fill="none" />
      <Rect x={149} y={114} width={36} height={2.5} rx={1} fill="#DBEAFE" />

      {/* Money Bag + Sprouting $ Coin (Bottom-Right) */}
      <G>
        {/* Sprout stem & leaves */}
        <Line x1={206} y1={104} x2={206} y2={126} stroke="#10B981" strokeWidth={2.4} />
        <Path d="M206 119 Q195 114 196 108 Q203 109 206 119 Z" fill="#34D399" />
        <Path d="M206 119 Q217 114 216 108 Q209 109 206 119 Z" fill="#10B981" />
        {/* Gold Coin */}
        <Circle cx={206} cy={98} r={9} fill="#FBBF24" />
        <Circle cx={206} cy={98} r={6.5} fill="#F59E0B" />
        <Path d="M206 94 V102 M204 96 H208 M204 100 H208" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
        {/* Bag */}
        <Path d="M198 124 L214 124 L210 133 L202 133 Z" fill="#2563EB" />
        <Path
          d="M202 132 C188 138 184 156 188 168 C192 176 220 176 224 168 C228 156 224 138 210 132 Z"
          fill="#1E40AF"
        />
        <Path
          d="M206 146 V162 M202 150 C202 148 210 148 210 151 C210 154 202 154 202 157 C202 160 210 160 210 158"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </G>

      {/* Standing Person on Left (Yellow Sweater, Blue Trousers, Laptop) */}
      <G>
        {/* Legs & Shoes */}
        <Rect x={26} y={114} width={12} height={54} rx={4} fill="#2563EB" />
        <Rect x={41} y={114} width={12} height={54} rx={4} fill="#1D4ED8" />
        <Rect x={24} y={166} width={16} height={7} rx={3.5} fill="#111827" />
        <Rect x={41} y={166} width={17} height={7} rx={3.5} fill="#111827" />

        {/* Yellow Sweater Torso */}
        <Path
          d="M22 72 C22 64 30 60 40 60 C50 60 56 66 56 76 L55 116 L24 116 Z"
          fill="#FBBF24"
        />
        {/* Arm holding laptop */}
        <Path
          d="M30 76 L46 92 L58 92"
          stroke="#F59E0B"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Head & Hair */}
        <Circle cx={40} cy={49} r={9.5} fill="#FCD5B5" />
        <Path
          d="M30 47 C30 38 38 35 45 37 C50 38 51 43 48 46 C44 43 36 43 30 47 Z"
          fill="#111827"
        />

        {/* Laptop */}
        <Path d="M52 93 L71 93 L77 77 L61 77 Z" fill="#3B7AF5" />
        <Rect x={48} y={91} width={22} height={4} rx={2} fill="#1E3A8A" />
      </G>
    </Svg>
  );
}

/**
 * Slide 2: Exact 300x290 hexagonal dashed network connecting (150,145) to 6 outer nodes.
 */
export function HexNetworkLines() {
  const cx = 150;
  const cy = 145;
  const nodes = [
    { x: 150, y: 42 },
    { x: 242, y: 94 },
    { x: 242, y: 196 },
    { x: 150, y: 248 },
    { x: 58, y: 196 },
    { x: 58, y: 94 },
  ];

  return (
    <Svg width={300} height={290} viewBox="0 0 300 290">
      {nodes.map((pt, idx) => (
        <Line
          key={`spoke-${idx}`}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke="#E2E8F0"
          strokeWidth={1.3}
          strokeDasharray="4 4"
        />
      ))}
      {nodes.map((pt, idx) => {
        const next = nodes[(idx + 1) % nodes.length];
        return (
          <Line
            key={`hex-${idx}`}
            x1={pt.x}
            y1={pt.y}
            x2={next.x}
            y2={next.y}
            stroke="#E2E8F0"
            strokeWidth={1.3}
            strokeDasharray="4 4"
          />
        );
      })}
    </Svg>
  );
}

/**
 * Slide 3: Clean flat analytics board with 3 bars and blue protection shield.
 */
export function BudgetControlIllustration() {
  return (
    <Svg width={145} height={155} viewBox="0 0 145 155">
      <Rect
        x={14}
        y={26}
        width={102}
        height={88}
        rx={14}
        fill="#FFFFFF"
        stroke="#DBEAFE"
        strokeWidth={2}
      />
      <Rect x={26} y={40} width={40} height={5} rx={2.5} fill="#CBD5E1" />

      {/* 3 Bars */}
      <Rect x={30} y={76} width={16} height={26} rx={5} fill="#DBEAFE" />
      <Rect x={54} y={60} width={16} height={42} rx={5} fill="#3B7AF5" />
      <Rect x={78} y={68} width={16} height={34} rx={5} fill="#10B981" />

      <Line
        x1={25}
        y1={104}
        x2={104}
        y2={104}
        stroke="#E2E8F0"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Protection Shield */}
      <Path
        d="M110 74 L134 83 V103 C134 118 123 129 110 135 C97 129 86 118 86 103 V83 L110 74 Z"
        fill="#2563EB"
      />
      <Path
        d="M101 105 L107 111 L119 98"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Slide 4: Mini blue cashflow curve for inside the minimalist phone mockup.
 */
export function MiniPhoneCurveSvg() {
  return (
    <Svg width={66} height={68} viewBox="0 0 66 68">
      <Path
        d="M4 50 C14 48, 20 32, 31 35 C42 38, 48 16, 62 14 L62 60 L4 60 Z"
        fill="#EBF2FF"
      />
      <Path
        d="M4 50 C14 48, 20 32, 31 35 C42 38, 48 16, 62 14"
        stroke="#3B7AF5"
        strokeWidth={2.8}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={62} cy={14} r={3.5} fill="#10B981" />
    </Svg>
  );
}
