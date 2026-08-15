import React, { forwardRef, useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";

interface ComposerProps {
  title: string;
  onChangeTitle: (value: string) => void;
  onCommit: () => void;
  submitting: boolean;
  error: string | null;
  ritualPulse: number;
}

export const Composer = forwardRef<View, ComposerProps>(function Composer(
  { title, onChangeTitle, onCommit, submitting, error, ritualPulse },
  buttonRef
) {
  const disabled = submitting || title.trim().length === 0;
  const glow = useSharedValue(0);

  useEffect(() => {
    if (ritualPulse === 0) return;
    glow.value = withSequence(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 2200, easing: Easing.in(Easing.cubic) })
    );
  }, [ritualPulse, glow]);

  const panelStyle = useAnimatedStyle(() => ({
    borderColor: theme.glassBorder,
    shadowOpacity: glow.value * 0.4,
    opacity: 1
  }));

  const glowOverlayStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5
  }));

  return (
    <Animated.View style={[styles.panel, panelStyle]}>
      <Animated.View style={[styles.glowOverlay, glowOverlayStyle]} pointerEvents="none" />

      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder="Create a Trace..."
        placeholderTextColor={theme.textMuted}
        style={styles.input}
        editable={!submitting}
        onSubmitEditing={onCommit}
        returnKeyType="send"
      />

      <Pressable
        ref={buttonRef}
        onPress={onCommit}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed
        ]}
      >
        <Text style={styles.buttonText}>COMMIT</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.glass,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: theme.green,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 }
  },
  glowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.green
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: theme.text,
    fontSize: 17,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  button: {
    backgroundColor: theme.green,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.green,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }]
  },
  buttonDisabled: {
    opacity: 0.35
  },
  buttonText: {
    color: theme.bg,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 3
  },
  error: {
    color: theme.danger,
    fontSize: 12,
    textAlign: "center"
  }
});
