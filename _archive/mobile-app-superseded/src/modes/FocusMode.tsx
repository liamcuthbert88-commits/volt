import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import { getActiveMission } from "../services/missions";
import { useCoreEvent } from "../core/hooks";

interface FocusModeProps {
  visible: boolean;
  onClose: () => void;
}

export function FocusMode({ visible, onClose }: FocusModeProps) {
  const dispatch = useCoreEvent();
  const [mission] = useState(getActiveMission);
  const [completed, setCompleted] = useState(false);
  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    backdrop.value = withTiming(visible ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) });
    card.value = withTiming(visible ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
    if (!visible) setCompleted(false);
  }, [visible, backdrop, card]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 24 }]
  }));

  function handleClose() {
    dispatch({ type: "AI_FINISHED" });
    onClose();
  }

  function handleComplete() {
    if (completed) return;
    setCompleted(true);
    dispatch({ type: "MISSION_COMPLETED" });
    setTimeout(handleClose, 1800);
  }

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>FOCUS</Text>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.card, cardStyle]} pointerEvents="box-none">
          <Text style={styles.missionLabel}>ACTIVE MISSION</Text>
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Text style={styles.missionDetail}>{mission.detail}</Text>

          <Pressable
            onPress={handleComplete}
            disabled={completed}
            style={({ pressed }) => [
              styles.completeButton,
              completed && styles.completeButtonDone,
              pressed && !completed && styles.completeButtonPressed
            ]}
          >
            <Text style={styles.completeText}>{completed ? "COMPLETE" : "MARK COMPLETE"}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,2,2,0.72)"
  },
  header: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 4
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  closeText: {
    color: theme.textMuted,
    fontSize: 16,
    lineHeight: 18
  },
  card: {
    position: "absolute",
    top: "58%",
    left: 24,
    right: 24,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    borderRadius: 24,
    padding: 22
  },
  missionLabel: {
    color: theme.textMuted,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700"
  },
  missionTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8
  },
  missionDetail: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8
  },
  completeButton: {
    marginTop: 18,
    backgroundColor: theme.green,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center"
  },
  completeButtonDone: {
    backgroundColor: "#FFD25A"
  },
  completeButtonPressed: {
    opacity: 0.85
  },
  completeText: {
    color: theme.bg,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 2
  }
});
