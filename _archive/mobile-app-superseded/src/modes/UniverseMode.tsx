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
import type { Trace } from "../types";

interface UniverseModeProps {
  visible: boolean;
  traces: Trace[];
  onClose: () => void;
}

interface Placed {
  trace: Trace;
  x: number;
  y: number;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function UniverseMode({ visible, traces, onClose }: UniverseModeProps) {
  const { width, height } = useWindowDimensions();
  const dispatch = useCoreEvent();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    backdrop.value = withTiming(visible ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) });
    if (!visible) setSelectedId(null);
  }, [visible, backdrop]);

  const placed = useMemo<Placed[]>(() => {
    const margin = 46;
    const top = 130;
    const bottom = height - 140;
    return traces.map((trace, index) => ({
      trace,
      x: margin + pseudoRandom(index * 2 + 1) * (width - margin * 2),
      y: top + pseudoRandom(index * 2 + 2) * Math.max(bottom - top, 1)
    }));
  }, [traces, width, height]);

  const focusPoint = { x: width / 2, y: height / 2 - 40 };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  function handleClose() {
    dispatch({ type: "AI_FINISHED" });
    onClose();
  }

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />

        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {placed.map((p, index) => {
            const next = placed[(index + 1) % placed.length];
            if (!next || placed.length < 2) return null;
            return (
              <Line
                key={p.trace.id}
                x1={p.x}
                y1={p.y}
                x2={next.x}
                y2={next.y}
                stroke={theme.green}
                strokeWidth={1}
                strokeOpacity={0.18}
              />
            );
          })}
        </Svg>

        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>UNIVERSE</Text>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        {placed.length === 0 ? (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>The universe is empty. Commit a trace.</Text>
          </View>
        ) : null}

        {placed.map((p) => (
          <UniverseNode
            key={p.trace.id}
            placed={p}
            focusPoint={focusPoint}
            selected={p.trace.id === selectedId}
            dimmed={selectedId !== null && selectedId !== p.trace.id}
            onSelect={() => setSelectedId((current) => (current === p.trace.id ? null : p.trace.id))}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function UniverseNode({
  placed,
  focusPoint,
  selected,
  dimmed,
  onSelect
}: {
  placed: Placed;
  focusPoint: { x: number; y: number };
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const entrance = useSharedValue(0);
  const focus = useSharedValue(0);

  useEffect(() => {
    entrance.value = withSpring(1, { damping: 10, stiffness: 90 });
  }, [entrance]);

  useEffect(() => {
    focus.value = withSpring(selected ? 1 : 0, { damping: 12, stiffness: 100 });
  }, [selected, focus]);

  const style = useAnimatedStyle(() => {
    const x = placed.x + (focusPoint.x - placed.x) * focus.value;
    const y = placed.y + (focusPoint.y - placed.y) * focus.value;
    const scale = entrance.value * (1 + focus.value * 1.4);
    return {
      opacity: entrance.value * (dimmed ? 0.25 : 1),
      transform: [{ translateX: x - 8 }, { translateY: y - 8 }, { scale }]
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: focus.value
  }));

  return (
    <Animated.View style={[styles.node, style]}>
      <Pressable onPress={onSelect} hitSlop={10} style={styles.nodeTouch} />
      <Animated.View style={[styles.label, labelStyle]} pointerEvents="none">
        <Text style={styles.labelTitle} numberOfLines={2}>
          {placed.trace.title}
        </Text>
        <Text style={styles.labelWeight}>weight {placed.trace.weight}</Text>
      </Animated.View>
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
    backgroundColor: "rgba(2,2,2,0.68)"
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.greenBright,
    shadowColor: theme.green,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    alignItems: "center"
  },
  nodeTouch: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  label: {
    position: "absolute",
    top: 20,
    width: 140,
    left: -62,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center"
  },
  labelTitle: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center"
  },
  labelWeight: {
    color: theme.green,
    fontSize: 10,
    marginTop: 2
  }
});
