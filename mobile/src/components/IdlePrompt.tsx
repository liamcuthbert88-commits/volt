import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";

interface IdlePromptProps {
  text: string;
  visible: boolean;
}

export function IdlePrompt({ text, visible }: IdlePromptProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 2400 }),
        withTiming(0, { duration: 2200, easing: Easing.in(Easing.cubic) })
      );
    } else {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) });
    }
  }, [visible, text, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    paddingHorizontal: 32
  },
  text: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.3,
    textAlign: "center"
  }
});
