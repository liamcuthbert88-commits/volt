import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import type { Point } from "../types";

interface ScreenPulseProps {
  origin: Point;
  token: number;
}

/** A soft ring that ripples outward from a point and fades. Used for the idle
 * ritual pulse and the commit ritual's screen-wide pulse — nothing flashes,
 * nothing blinks, it just breathes outward once and disappears. */
export function ScreenPulse({ origin, token }: ScreenPulseProps) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (token === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [token, progress]);

  const diagonal = Math.sqrt(width * width + height * height);
  const size = diagonal * 2;

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.2,
    transform: [
      { translateX: origin.x - size / 2 },
      { translateY: origin.y - size / 2 },
      { scale: 0.08 + progress.value }
    ]
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="screenPulse" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={theme.green} stopOpacity={0} />
            <Stop offset="72%" stopColor={theme.green} stopOpacity={0} />
            <Stop offset="88%" stopColor={theme.green} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={theme.green} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#screenPulse)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0
  }
});
