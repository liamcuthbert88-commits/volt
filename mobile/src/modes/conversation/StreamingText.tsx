import React, { useEffect } from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { theme } from "../../theme";

interface StreamingTextProps {
  text: string;
  active: boolean;
  style?: TextStyle;
}

export function StreamingText({ text, active, style }: StreamingTextProps) {
  const blink = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [active, blink]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.25 + blink.value * 0.75 : 0
  }));

  return (
    <View style={styles.row}>
      <Text style={[styles.text, style]}>{text}</Text>
      {active ? <Animated.View style={[styles.cursor, cursorStyle]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end"
  },
  text: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 21
  },
  cursor: {
    width: 6,
    height: 14,
    borderRadius: 2,
    backgroundColor: theme.green,
    marginLeft: 2,
    marginBottom: 2
  }
});
