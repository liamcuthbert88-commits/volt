import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import type { Point } from "../types";

const DOT_SIZE = 14;
const TRAIL = [
  { lag: 0.09, size: 0.7, opacity: 0.55 },
  { lag: 0.17, size: 0.5, opacity: 0.35 },
  { lag: 0.26, size: 0.34, opacity: 0.2 }
];

interface CommitPulseProps {
  from: Point;
  to: Point;
  playToken: number;
  onArrive: () => void;
}

export function CommitPulse({ from, to, playToken, onArrive }: CommitPulseProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (playToken === 0) return;
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: 520, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onArrive)();
      }
    );
  }, [onArrive, playToken, progress]);

  return (
    <>
      {TRAIL.map((echo, i) => (
        <BeamPoint
          key={i}
          progress={progress}
          from={from}
          to={to}
          lag={echo.lag}
          size={DOT_SIZE * echo.size}
          maxOpacity={echo.opacity}
        />
      ))}
      <BeamPoint progress={progress} from={from} to={to} lag={0} size={DOT_SIZE} maxOpacity={1} />
    </>
  );
}

interface BeamPointProps {
  progress: SharedValue<number>;
  from: Point;
  to: Point;
  lag: number;
  size: number;
  maxOpacity: number;
}

function BeamPoint({ progress, from, to, lag, size, maxOpacity }: BeamPointProps) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(progress.value - lag, 0);
    const controlX = (from.x + to.x) / 2;
    const controlY = Math.min(from.y, to.y) - 70;
    const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * controlX + t * t * to.x;
    const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * controlY + t * t * to.y;
    const visible = progress.value > 0 && progress.value < 1 + lag && t < 1;
    return {
      opacity: visible ? maxOpacity : 0,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: 0.6 + Math.sin(Math.min(t, 1) * Math.PI) * 0.7 }
      ]
    };
  });

  return (
    <Animated.View style={[styles.dot, { width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="pulseDot" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="50%" stopColor={theme.greenBright} stopOpacity={0.95} />
            <Stop offset="100%" stopColor={theme.green} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#pulseDot)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: 0,
    left: 0
  }
});
