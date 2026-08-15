import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Composer } from "../components/Composer";
import { CommitPulse } from "../components/CommitPulse";
import { CoreStage } from "../components/CoreStage";
import { ScreenPulse } from "../components/ScreenPulse";
import { DriftParticles } from "../components/DriftParticles";
import { IdlePrompt } from "../components/IdlePrompt";
import { measureCenter } from "../hooks/measure";
import { useCore, useCoreEvent } from "../core/hooks";
import { MODE_ZOOM, STAGE_SPRING } from "./modeTransitions";
import type { AppMode } from "../state/appMode";
import type { CoreGestureHandlers } from "../hooks/useCoreGestures";
import type { DailySessionState } from "../hooks/useDailySession";
import type { Point } from "../types";

const ORIGIN: Point = { x: 0, y: 0 };
const COMMIT_PAUSE_MS = 400;
const TYPING_STOP_DELAY_MS = 800;
const RITUAL_MIN_DELAY_MS = 8000;
const RITUAL_MAX_DELAY_MS = 12000;

const RITUAL_PROMPTS = [
  "What deserves your attention?",
  "What is on your mind?",
  "Tell me what changed.",
  "What feels heavy today?"
];

interface CoreModeProps {
  mode: AppMode;
  worldError: string | null;
  onCommitTrace: (title: string) => Promise<void>;
  gestures: CoreGestureHandlers;
  fieldRef: React.RefObject<View | null>;
  daily: DailySessionState;
}

export function CoreMode({ mode, worldError, onCommitTrace, gestures, fieldRef, daily }: CoreModeProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState<{ from: Point; to: Point; token: number }>({
    from: ORIGIN,
    to: ORIGIN,
    token: 0
  });
  const [screenPulse, setScreenPulse] = useState<{ origin: Point; token: number }>({
    origin: ORIGIN,
    token: 0
  });
  const [drift, setDrift] = useState<{ target: Point; token: number }>({ target: ORIGIN, token: 0 });
  const [promptText, setPromptText] = useState(RITUAL_PROMPTS[0]);
  const [promptVisible, setPromptVisible] = useState(false);

  const coreState = useCore();
  const dispatch = useCoreEvent();
  const coreStateRef = useRef(coreState);
  useEffect(() => {
    coreStateRef.current = coreState;
  }, [coreState]);

  const buttonRef = useRef<View>(null);
  const arriveResolveRef = useRef<(() => void) | null>(null);

  const stageScale = useSharedValue(1);
  const composerOpacity = useSharedValue(1);

  useEffect(() => {
    stageScale.value = withSpring(MODE_ZOOM[mode], STAGE_SPRING);
    composerOpacity.value = withTiming(mode === "CORE" ? 1 : 0.12, { duration: 260 });
  }, [mode, stageScale, composerOpacity]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stageScale.value }]
  }));

  const composerStyle = useAnimatedStyle(() => ({
    opacity: composerOpacity.value
  }));

  // The idle ritual: every 8-12s, if truly idle, emit a gentle pulse + prompt.
  useEffect(() => {
    if (mode !== "CORE") return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (coreStateRef.current.mode === "idle") {
        const origin = await measureCenter(fieldRef);
        setScreenPulse((prev) => ({ origin, token: prev.token + 1 }));
        setPromptText(RITUAL_PROMPTS[Math.floor(Math.random() * RITUAL_PROMPTS.length)]);
        setPromptVisible(true);
      }
      timer = setTimeout(tick, RITUAL_MIN_DELAY_MS + Math.random() * (RITUAL_MAX_DELAY_MS - RITUAL_MIN_DELAY_MS));
    };
    timer = setTimeout(tick, RITUAL_MIN_DELAY_MS + Math.random() * (RITUAL_MAX_DELAY_MS - RITUAL_MIN_DELAY_MS));
    return () => clearTimeout(timer);
  }, [mode, fieldRef]);

  // Sprint 4's quiet welcome: the first time today's DailySession is
  // created (not every app open — daily.sessionCreated is only true once
  // per calendar day, backend-decided), show the computed greeting through
  // the same IdlePrompt the idle ritual already uses, ahead of the random
  // rotation. This is an observation, not a conversation — no chat bubble,
  // no reply expected, just text and MEMORY_FOUND, an existing CoreEvent
  // that already means "something remembered surfaced."
  const greetingShownRef = useRef(false);
  useEffect(() => {
    if (greetingShownRef.current) return;
    if (!daily.sessionCreated || !daily.greeting) return;
    greetingShownRef.current = true;

    setPromptText(daily.greeting);
    setPromptVisible(true);
    dispatch({ type: "MEMORY_FOUND" });
  }, [daily.sessionCreated, daily.greeting, dispatch]);

  // Typing pauses drift a few particles inward, once per pause.
  useEffect(() => {
    if (!title.trim()) return;
    const timer = setTimeout(async () => {
      const target = await measureCenter(fieldRef);
      setDrift((prev) => ({ target, token: prev.token + 1 }));
    }, TYPING_STOP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, fieldRef]);

  const handleChangeTitle = useCallback(
    (value: string) => {
      const wasEmpty = title.trim().length === 0;
      const isEmpty = value.trim().length === 0;

      if (wasEmpty && !isEmpty) {
        setPromptVisible(false);
        dispatch({ type: "USER_LONG_PRESS" });
      } else if (!wasEmpty && isEmpty) {
        dispatch({ type: "AI_FINISHED" });
      }

      setTitle(value);
    },
    [title, dispatch]
  );

  const handleArrive = useCallback(() => {
    arriveResolveRef.current?.();
    arriveResolveRef.current = null;
  }, []);

  const handleCommit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    setPromptVisible(false);

    const [from, to] = await Promise.all([measureCenter(buttonRef), measureCenter(fieldRef)]);

    const arrival = new Promise<void>((resolve) => {
      arriveResolveRef.current = resolve;
    });

    setPulse((prev) => ({ from, to, token: prev.token + 1 }));
    setTitle("");

    // The thought arrives and is absorbed: the Core spirals and brightens.
    await arrival;
    dispatch({ type: "TRACE_CREATED" });

    // Everything pauses, then a soft pulse travels across the screen.
    await new Promise((resolve) => setTimeout(resolve, COMMIT_PAUSE_MS));
    setScreenPulse((prev) => ({ origin: to, token: prev.token + 1 }));

    try {
      await onCommitTrace(trimmed);
    } catch {
      setError("Commit failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, title, onCommitTrace, fieldRef, dispatch]);

  return (
    <>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.fieldWrap}>
            <View style={styles.coreGroup}>
              <Animated.View style={stageStyle}>
                <CoreStage ref={fieldRef} gestures={gestures} />
              </Animated.View>
              <IdlePrompt text={promptText} visible={promptVisible && mode === "CORE"} />
            </View>
          </View>

          <Animated.View style={composerStyle} pointerEvents={mode === "CORE" ? "auto" : "none"}>
            <Composer
              ref={buttonRef}
              title={title}
              onChangeTitle={handleChangeTitle}
              onCommit={handleCommit}
              submitting={submitting}
              error={error ?? worldError}
              ritualPulse={screenPulse.token}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <View style={styles.overlay} pointerEvents="none">
        <CommitPulse from={pulse.from} to={pulse.to} playToken={pulse.token} onArrive={handleArrive} />
        <ScreenPulse origin={screenPulse.origin} token={screenPulse.token} />
        <DriftParticles target={drift.target} token={drift.token} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  fieldWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  coreGroup: {
    alignItems: "center"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
});
