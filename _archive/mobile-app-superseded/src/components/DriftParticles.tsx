import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import type { Point } from "../types";

const DOT_COUNT = 5;

interface DriftParticlesProps {
  target: Point;
  token: number;
}

/** A few tiny dots that gather inward toward the Core, once, when typing
 * pauses. Fully local and one-shot — not part of the Core's own physiology. */
export function DriftParticles({ target, token }: DriftParticlesProps) {
  if (token === 0) return null;

  return (
    <React.Fragment key={token}>
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <DriftDot key={index} index={index} target={target} />
      ))}
    </React.Fragment>
  );
}

function DriftDot({ index, target }: { index: number; target: Point }) {
  const progress = useSharedValue(0);
  const angle = (index / DOT_COUNT) * Math.PI * 2 + Math.random() * 0.6;
  const startRadius = 90 + Math.random() * 70;
  const startX = target.x + Math.cos(angle) * startRadius;
  const startY = target.y + Math.sin(angle) * startRadius;

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1100 + index * 60,
      easing: Easing.inOut(Easing.quad)
    });
  }, [progress, index]);

  const style = useAnimatedStyle(() => {
    const x = startX + (target.x - startX) * progress.value;
    const y = startY + (target.y - startY) * progress.value;
    return {
      opacity: (1 - progress.value) * 0.8,
      transform: [{ translateX: x - 2 }, { translateY: y - 2 }, { scale: 1 - progress.value * 0.4 }]
    };
  });

  return <Animated.View style={[styles.dot, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.greenBright
  }
});
