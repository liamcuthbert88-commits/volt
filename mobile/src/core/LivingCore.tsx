import React, { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS
} from "react-native-reanimated";
import { useCoreAnimation } from "./hooks";
import { useCoreGestures, type CoreGestureHandlers } from "../hooks/useCoreGestures";
import { theme } from "../theme";

const REFERENCE_SIZE = 260;
const OUTER_R_REF = 100;
const INNER_R_REF = 74;
const PLASMA_R_REF = 40;
const PARTICLE_COUNT = 7;
const BOLT_COUNT = 2;

const SCREEN_FRACTION = 0.45;
const MIN_CORE_SIZE = 170;
const MAX_CORE_SIZE = 340;

interface LivingCoreProps {
  gestures: CoreGestureHandlers;
}

export function LivingCore({ gestures }: LivingCoreProps) {
  const { width, height } = useWindowDimensions();
  const coreSize = Math.round(
    Math.min(Math.max(Math.min(width, height) * SCREEN_FRACTION, MIN_CORE_SIZE), MAX_CORE_SIZE)
  );
  const scale = coreSize / REFERENCE_SIZE;
  const outerR = OUTER_R_REF * scale;
  const innerR = INNER_R_REF * scale;
  const plasmaR = PLASMA_R_REF * scale;

  const { dims, motion } = useCoreAnimation();
  const gesture = useCoreGestures(gestures);

  const coreScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dims.zoom.value }]
  }));

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: dims.energy.value
  }));

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${motion.outerAngle.value}deg` }],
    opacity: dims.glow.value * 0.5 + 0.2
  }));

  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${motion.innerAngle.value}deg` }],
    opacity: dims.glow.value * 0.42 + 0.12
  }));

  const pulseRingStyle = useAnimatedStyle(() => {
    const frac = motion.pulsePhase.value;
    return {
      transform: [{ scale: 1 + frac * 1.1 }],
      opacity: (1 - frac) * (0.15 + dims.pulse.value * 0.4)
    };
  });

  const plasmaStyle = useAnimatedStyle(() => {
    const amplitude = 0.05 + dims.breathing.value * 0.13;
    const breatheScale = 1 + Math.sin(motion.breathePhase.value) * amplitude;
    const flashPunch = 1 + Math.max(0, dims.glow.value - 1) * 0.9;
    return {
      transform: [{ scale: breatheScale * flashPunch }],
      opacity: Math.min(dims.glow.value, 1) * 0.35 + 0.55
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, { width: coreSize, height: coreSize }, coreScaleStyle]}>
        <View style={styles.inner} pointerEvents="none">
          <Animated.View style={[styles.fill, ambientStyle]}>
            <Svg width={coreSize} height={coreSize}>
              <Defs>
                <RadialGradient id="ambient" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={theme.green} stopOpacity={0.2} />
                  <Stop offset="100%" stopColor={theme.green} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={coreSize / 2} cy={coreSize / 2} r={coreSize / 2} fill="url(#ambient)" />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.fill, pulseRingStyle]}>
            <Svg width={coreSize} height={coreSize}>
              <Circle
                cx={coreSize / 2}
                cy={coreSize / 2}
                r={outerR}
                stroke={theme.green}
                strokeWidth={1.5}
                fill="none"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.fill, outerRingStyle]}>
            <Svg width={coreSize} height={coreSize}>
              <Circle
                cx={coreSize / 2}
                cy={coreSize / 2}
                r={outerR}
                stroke={theme.green}
                strokeWidth={2}
                strokeDasharray="6 14"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.fill, innerRingStyle]}>
            <Svg width={coreSize} height={coreSize}>
              <Circle
                cx={coreSize / 2}
                cy={coreSize / 2}
                r={innerR}
                stroke={theme.greenBright}
                strokeWidth={1.2}
                strokeDasharray="2 10"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          <Particles coreSize={coreSize} />

          {Array.from({ length: BOLT_COUNT }).map((_, i) => (
            <Bolt key={i} seed={i} coreSize={coreSize} />
          ))}

          <Animated.View style={[styles.plasmaWrap, plasmaStyle]}>
            <Svg width={plasmaR * 2} height={plasmaR * 2}>
              <Defs>
                <RadialGradient id="plasma" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
                  <Stop offset="35%" stopColor={theme.greenBright} stopOpacity={0.9} />
                  <Stop offset="100%" stopColor={theme.green} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={plasmaR} cy={plasmaR} r={plasmaR} fill="url(#plasma)" />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function randomBoltPath(coreSize: number): string {
  const scale = coreSize / REFERENCE_SIZE;
  const cx = coreSize / 2;
  const cy = coreSize / 2;
  const angle = Math.random() * Math.PI * 2;
  const start = (16 + Math.random() * 10) * scale;
  const length = (55 + Math.random() * 55) * scale;
  const x1 = cx + Math.cos(angle) * start;
  const y1 = cy + Math.sin(angle) * start;
  const x2 = cx + Math.cos(angle) * (start + length);
  const y2 = cy + Math.sin(angle) * (start + length);
  const segments = 4 + Math.floor(Math.random() * 2);

  let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const bx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20 * scale;
    const by = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20 * scale;
    d += ` L ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return d;
}

function Bolt({ seed, coreSize }: { seed: number; coreSize: number }) {
  const { motion } = useCoreAnimation();
  const [path, setPath] = useState(() => randomBoltPath(coreSize));
  const flash = useSharedValue(0);

  useEffect(() => {
    setPath(randomBoltPath(coreSize));
  }, [coreSize]);

  useAnimatedReaction(
    () => motion.boltTrigger.value,
    (current, previous) => {
      if (previous === null || current === previous) return;
      runOnJS(setPath)(randomBoltPath(coreSize));
      flash.value = withSequence(
        withTiming(1, { duration: 55, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 170 + seed * 40, easing: Easing.in(Easing.quad) })
      );
    }
  );

  const style = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View style={[styles.fill, style]} pointerEvents="none">
      <Svg width={coreSize} height={coreSize}>
        <Path d={path} stroke={theme.greenBright} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Particles({ coreSize }: { coreSize: number }) {
  return (
    <View style={styles.fill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} coreSize={coreSize} />
      ))}
    </View>
  );
}

function Particle({ index, coreSize }: { index: number; coreSize: number }) {
  const { motion } = useCoreAnimation();
  const scale = coreSize / REFERENCE_SIZE;
  const radius = (26 + ((index * 37) % 32)) * scale;
  const dotSize = 4 * scale;
  const phase = index * ((Math.PI * 2) / PARTICLE_COUNT);

  const style = useAnimatedStyle(() => {
    const angle = motion.particleAngle.value + phase;
    const wobble = Math.sin(motion.particleAngle.value * 2.3 + phase * 3) * 7 * scale;
    const r = radius + wobble;
    return {
      transform: [
        { translateX: coreSize / 2 + Math.cos(angle) * r - dotSize / 2 },
        { translateY: coreSize / 2 + Math.sin(angle) * r - dotSize / 2 }
      ],
      opacity: 0.25 + 0.45 * Math.abs(Math.sin(angle * 2.7 + phase))
    };
  });

  return (
    <Animated.View
      style={[styles.particle, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center"
  },
  inner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center"
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  plasmaWrap: {
    justifyContent: "center",
    alignItems: "center"
  },
  particle: {
    position: "absolute",
    backgroundColor: theme.greenBright
  }
});
