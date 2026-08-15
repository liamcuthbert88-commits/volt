import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { theme } from "../theme";
import { fetchTimeline, submitCheckIn, type TimelineItem } from "../services/daily";
import { getLocalDayRange } from "../utils/day";
import { useCoreEvent } from "../core/hooks";
import type { DailySessionState } from "../hooks/useDailySession";

interface DailyModeProps {
  visible: boolean;
  daily: DailySessionState;
  onClose: () => void;
}

const SCALE_FIELDS = [
  { key: "mood", label: "MOOD" },
  { key: "energy", label: "ENERGY" },
  { key: "focus", label: "FOCUS" },
  { key: "sleepQuality", label: "SLEEP" },
  { key: "stress", label: "STRESS" }
] as const;

type ScaleKey = (typeof SCALE_FIELDS)[number]["key"];
type Scales = Record<ScaleKey, number>;

const DEFAULT_SCALES: Scales = { mood: 3, energy: 3, focus: 3, sleepQuality: 3, stress: 3 };

function formatTime(ms: number): string {
  const date = new Date(ms);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes < 10 ? "0" : ""}${minutes} ${period}`;
}

/**
 * The Daily Companion hub — Sprint 4's check-in and timeline, reached via
 * the one gesture slot the app didn't already use (swipe down; tap,
 * swipe up/left/right all had a mode before this one). One new mode, one
 * new gesture — not a redesign of the four that already existed, the same
 * visible/onClose overlay contract FocusMode.tsx already establishes.
 */
export function DailyMode({ visible, daily, onClose }: DailyModeProps) {
  const dispatch = useCoreEvent();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [scales, setScales] = useState<Scales>(DEFAULT_SCALES);
  const [thought, setThought] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadedDayKey, setLoadedDayKey] = useState<string | null>(null);

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    backdrop.value = withTiming(visible ? 1 : 0, { duration: 320, easing: Easing.inOut(Easing.quad) });
    card.value = withTiming(visible ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [visible, backdrop, card]);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const { startMs, endMs } = getLocalDayRange(daily.dayKey);
      const todayItems = await fetchTimeline(startMs, endMs);
      setItems(todayItems);
      setCheckedIn(todayItems.some((item) => item.type === "CheckIn"));
      setLoadedDayKey(daily.dayKey);
    } catch {
      // Timeline is a nicety here too — an unreachable backend shouldn't
      // block the check-in form itself from being usable.
    } finally {
      setLoading(false);
    }
  }, [daily.dayKey]);

  useEffect(() => {
    if (!visible) return;
    if (loadedDayKey === daily.dayKey) return;
    loadTimeline();
  }, [visible, daily.dayKey, loadedDayKey, loadTimeline]);

  function setScale(key: ScaleKey, value: number) {
    setScales((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCheckIn() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitCheckIn({ dayKey: daily.dayKey, ...scales, thought: thought.trim() });
      setCheckedIn(true);
      dispatch({ type: "TRACE_CREATED" });
      loadTimeline();
    } catch {
      // Stays on the form so the user can retry — nothing was lost locally.
    } finally {
      setSubmitting(false);
    }
  }

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 24 }]
  }));

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>TODAY</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.card, cardStyle]} pointerEvents="box-none">
          <ScrollView showsVerticalScrollIndicator={false}>
            {daily.yesterdaySummary && (
              <View style={styles.yesterdayBlock}>
                <Text style={styles.sectionLabel}>YESTERDAY</Text>
                <Text style={styles.yesterdayText}>{daily.yesterdaySummary.text}</Text>
              </View>
            )}

            {!checkedIn ? (
              <View style={styles.checkInBlock}>
                <Text style={styles.sectionLabel}>CHECK IN</Text>
                {SCALE_FIELDS.map((field) => (
                  <View key={field.key} style={styles.scaleRow}>
                    <Text style={styles.scaleLabel}>{field.label}</Text>
                    <View style={styles.scaleOptions}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => setScale(field.key, value)}
                          style={[styles.scaleDot, scales[field.key] === value && styles.scaleDotActive]}
                        >
                          <Text style={[styles.scaleDotText, scales[field.key] === value && styles.scaleDotTextActive]}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}

                <TextInput
                  style={styles.thoughtInput}
                  placeholder="One thought, if you have one..."
                  placeholderTextColor={theme.textMuted}
                  value={thought}
                  onChangeText={setThought}
                  multiline
                />

                <Pressable
                  onPress={handleCheckIn}
                  disabled={submitting}
                  style={({ pressed }) => [styles.checkInButton, pressed && styles.checkInButtonPressed]}
                >
                  <Text style={styles.checkInButtonText}>{submitting ? "SAVING..." : "CHECK IN"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.checkInBlock}>
                <Text style={styles.sectionLabel}>CHECK IN</Text>
                <Text style={styles.checkedInText}>Already checked in today.</Text>
              </View>
            )}

            <View style={styles.timelineBlock}>
              <Text style={styles.sectionLabel}>TIMELINE</Text>
              {loading && items.length === 0 && <Text style={styles.emptyText}>Loading...</Text>}
              {!loading && items.length === 0 && <Text style={styles.emptyText}>Nothing yet today.</Text>}
              {items.map((item) => (
                <View key={item.id} style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{formatTime(item.createdAt)}</Text>
                  <Text style={styles.timelineSummary}>{item.summary}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
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
    backgroundColor: "rgba(2,2,2,0.85)"
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
    top: 110,
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    borderRadius: 24,
    padding: 20
  },
  sectionLabel: {
    color: theme.textMuted,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 10
  },
  yesterdayBlock: {
    marginBottom: 24
  },
  yesterdayText: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 19
  },
  checkInBlock: {
    marginBottom: 24
  },
  checkedInText: {
    color: theme.textMuted,
    fontSize: 13
  },
  scaleRow: {
    marginBottom: 12
  },
  scaleLabel: {
    color: theme.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 6
  },
  scaleOptions: {
    flexDirection: "row",
    gap: 8
  },
  scaleDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    alignItems: "center",
    justifyContent: "center"
  },
  scaleDotActive: {
    backgroundColor: theme.green,
    borderColor: theme.green
  },
  scaleDotText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  scaleDotTextActive: {
    color: theme.bg
  },
  thoughtInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    color: theme.text,
    padding: 12,
    minHeight: 60,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    textAlignVertical: "top"
  },
  checkInButton: {
    backgroundColor: theme.green,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center"
  },
  checkInButtonPressed: {
    opacity: 0.85
  },
  checkInButtonText: {
    color: theme.bg,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 2
  },
  timelineBlock: {
    marginBottom: 20
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 12
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 10
  },
  timelineTime: {
    color: theme.textMuted,
    fontSize: 11,
    width: 76
  },
  timelineSummary: {
    color: theme.text,
    fontSize: 13,
    flex: 1,
    lineHeight: 18
  }
});
