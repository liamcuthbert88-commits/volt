import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { StreamingText } from "./StreamingText";
import { theme } from "../../theme";
import type { ConversationMessage } from "../../types/conversation";

interface MessageBubbleProps {
  message: ConversationMessage;
  streaming: boolean;
}

export function MessageBubble({ message, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [entrance]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: (1 - entrance.value) * 12 },
      { scale: 0.96 + entrance.value * 0.04 }
    ]
  }));

  return (
    <Animated.View style={[styles.row, isUser ? styles.rowUser : styles.rowVolt, rowStyle]}>
      <Animated.View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleVolt]}>
        {isUser ? (
          <Text style={styles.textUser}>{message.text}</Text>
        ) : (
          <StreamingText text={message.text} active={streaming} style={styles.textVolt} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 6
  },
  rowUser: {
    justifyContent: "flex-end"
  },
  rowVolt: {
    justifyContent: "flex-start"
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  bubbleUser: {
    backgroundColor: "rgba(57, 255, 154, 0.09)",
    borderColor: "rgba(57, 255, 154, 0.45)",
    borderBottomRightRadius: 6
  },
  bubbleVolt: {
    backgroundColor: theme.glass,
    borderColor: theme.glassBorder,
    borderBottomLeftRadius: 6
  },
  textUser: {
    color: theme.greenBright,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600"
  },
  textVolt: {
    color: theme.text
  }
});
