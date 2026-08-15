import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../theme";

interface SendButtonProps {
  onPress: () => void;
  disabled: boolean;
}

export function SendButton({ onPress, disabled }: SendButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M3 11.5 20.5 4 13 21.5 10.5 13.5 3 11.5Z"
          fill={theme.bg}
          stroke={theme.bg}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.green,
    shadowColor: theme.green,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6
  },
  disabled: {
    opacity: 0.3
  },
  pressed: {
    transform: [{ scale: 0.95 }]
  }
});
