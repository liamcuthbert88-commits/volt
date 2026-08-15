import React, { useEffect, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SendButton } from "../../components/SendButton";
import { theme } from "../../theme";

interface ComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  autoFocus: boolean;
}

export function Composer({ value, onChangeText, onSend, disabled, autoFocus }: ComposerProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <View style={styles.row}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Message VOLT..."
        placeholderTextColor={theme.textMuted}
        style={styles.input}
        multiline
        editable={!disabled}
        onSubmitEditing={onSend}
        returnKeyType="send"
        blurOnSubmit
      />
      <SendButton onPress={onSend} disabled={disabled || !value.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)"
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12
  }
});
