import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import { useCoreEvent } from "../core/hooks";
import type { Point, Trace } from "../types";

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);
const RADIUS = 150;

interface MemoryModeProps {
  visible: boolean;
  traces: Trace[];
  anchor: Point;
  onClose: () => void;
}

interface Placed {
  trace: Trace;
  x: number;
  y: number;
}

export function MemoryMode({ visible, traces, anchor, onClose }: MemoryModeProps) {
  const { width, height } = useWindowDimensions();
  const dispatch = useCoreEvent();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    backdrop.value = withTiming(visible ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) });
    if (visible) dispatch({ type: "MEMORY_FOUND" });
    if (!visible) setSelectedId(null);
  }, [visible, backdrop, dispatch]);

  const placed = useMemo<Placed[]>(() => {
    return traces.map((trace, index) => {
      const jitter = ((index * 53) % 40) - 20;
      const r = RADIUS + jitter;
      const angle = index * GOLDEN_ANGLE;
      return {
        trace,
        x: anchor.x + Math.cos(angle) * r,
        y: anchor.y + Math.sin(angle) * r
      };
    });
  }, [traces, anchor]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value
  }));

  function handleClose() {
    dispatch({ type: "AI_FINISHED" });
    onClose();
  }

  const selected = placed.find((p) => p.trace.id === selectedId);

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {placed.map((p) => (
            <Line
              key={p.trace.id}
              x1={anchor.x}
              y1={anchor.y}
              x2={p.x}
              y2={p.y}
              stroke={theme.green}
              strokeWidth={1}
              strokeOpacity={0.25}
            />
          ))}
        </Svg>

        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>MEMORY</Text>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        {placed.length === 0 ? (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>No memories yet.</Text>
          </View>
        ) : null}

        {placed.map((p) => (
          <MemoryNode
            key={p.trace.id}
            placed={p}
            selected={p.trace.id === selectedId}
            onSelect={() => setSelectedId((current) => (current === p.trace.id ? null : p.trace.id))}
          />
        ))}

        {selected ? (
          <View style={[styles.labelChip, { left: selected.x - 60, top: selected.y + 20 }]} pointerEvents="none">
            <Text style={styles.labelTitle} numberOfLines={2}>
              {selected.trace.title}
            </Text>
            <Text style={styles.labelWeight}>weight {selected.trace.weight}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function MemoryNode({
  placed,
  selected,
  onSelect
}: {
  placed: Placed;
  selected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 90 });
  }, [scale]);

  const style = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [
      { translateX: placed.x - 9 },
      { translateY: placed.y - 9 },
      { scale: scale.value * (selected ? 1.35 : 1) }
    ]
  }));

  return (
    <Animated.View style={[styles.node, style]}>
      <Pressable onPress={onSelect} hitSlop={10} style={styles.nodeTouch} />
    </Animated.View>
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
    backgroundColor: "rgba(2,2,2,0.6)"
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
  empty: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center"
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 13
  },
  node: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.greenBright,
    shadowColor: theme.green,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  nodeTouch: {
    flex: 1,
    borderRadius: 9
  },
  labelChip: {
    position: "absolute",
    width: 120,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  labelTitle: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "600"
  },
  labelWeight: {
    color: theme.green,
    fontSize: 10,
    marginTop: 2
  }
});
