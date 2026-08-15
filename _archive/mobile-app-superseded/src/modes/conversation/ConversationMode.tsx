import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { IntelligenceEngine } from "../../intelligence/IntelligenceEngine";
import { PatternEngine } from "../../intelligence/proactive/PatternEngine";
import { ObservationEngine } from "../../intelligence/proactive/ObservationEngine";
import { InsightEngine } from "../../intelligence/proactive/InsightEngine";
import { SuggestionEngine } from "../../intelligence/proactive/SuggestionEngine";
import { worldEngine } from "../../world/WorldEngine";
import { useCoreEvent } from "../../core/hooks";
import { theme } from "../../theme";
import type { ConversationTurn } from "../../intelligence/types";
import type { ConversationMessage } from "../../types/conversation";

const PANEL_SPRING = { damping: 22, stiffness: 210, mass: 0.9 } as const;
const DISMISS_THRESHOLD = 120;
// Held briefly after the reply finishes so "speaking" reads as a real beat,
// not a flicker — not simulated latency (the real latency is now whatever
// the AI provider actually took, reflected live by AI_THINKING/AI_STREAMING
// firing exactly when the request starts and the first token arrives).
const SPEAKING_SETTLE_MS = 500;
const MIN_SUGGESTION_CONFIDENCE = 0.5;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toTurn(message: ConversationMessage): ConversationTurn {
  return { role: message.role === "volt" ? "assistant" : "user", text: message.text };
}

interface ConversationModeProps {
  visible: boolean;
  onClose: () => void;
}

export function ConversationMode({ visible, onClose }: ConversationModeProps) {
  const dispatch = useCoreEvent();
  const { height } = useWindowDimensions();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const abortedRef = useRef(false);
  const engineRef = useRef(new IntelligenceEngine());
  const conversationIdRef = useRef(nextId("conversation"));
  const conversationEntityIdRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  const translateY = useSharedValue(height);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : height, PANEL_SPRING);
  }, [visible, height, translateY]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages]);

  // Proactive Intelligence: if the World already holds enough evidence for
  // a confident suggestion, open with it instead of an empty room. Runs
  // once per mount, only against an empty conversation, using exactly the
  // chain the Proactive Intelligence README documents as the recommended
  // way to call it — Pattern -> Observation -> Insight -> Suggestion.
  useEffect(() => {
    if (!visible || messages.length > 0 || seededRef.current) return;
    seededRef.current = true;

    const world = worldEngine.getWorld();
    const patterns = new PatternEngine().detect(world);
    const observations = new ObservationEngine().generate(patterns);
    const insights = new InsightEngine(world).generate(observations);
    const suggestions = new SuggestionEngine().generate(insights, observations);

    const best = [...suggestions].sort((a, b) => b.confidence.score - a.confidence.score)[0];
    if (best && best.confidence.score >= MIN_SUGGESTION_CONFIDENCE) {
      setMessages([{ id: nextId("volt"), role: "volt", text: best.prompt }]);
    }
  }, [visible, messages.length]);

  const closeToIdle = useCallback(() => {
    abortedRef.current = true;
    setStreamingId(null);
    setBusy(false);
    dispatch({ type: "AI_FINISHED" });
    onClose();
  }, [dispatch, onClose]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, dragStart.value + event.translationY);
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 800) {
        translateY.value = withSpring(height, PANEL_SPRING);
        runOnJS(closeToIdle)();
      } else {
        translateY.value = withSpring(0, PANEL_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  async function handleSend() {
    const text = draft.trim();
    if (!text || busy) return;

    abortedRef.current = false;
    setDraft("");
    setBusy(true);

    const history = messages.map(toTurn);
    const userMessage: ConversationMessage = { id: nextId("user"), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);

    if (!conversationEntityIdRef.current) {
      const entity = worldEngine.createEntity({
        type: "Conversation",
        attributes: { startedAt: Date.now(), messageCount: 0 }
      });
      conversationEntityIdRef.current = entity.id;
    }

    // Fired the instant the request starts, not after a fixed delay — the
    // real latency the user sees from here on is whatever the AI provider
    // actually takes, not a simulated one (Phase 4).
    dispatch({ type: "AI_THINKING" });

    const voltId = nextId("volt");
    setMessages((prev) => [...prev, { id: voltId, role: "volt", text: "" }]);
    setStreamingId(voltId);

    const stream = engineRef.current.process({
      conversationId: conversationIdRef.current,
      userInput: text,
      history
    });

    let streamingStarted = false;
    let failed = false;

    try {
      for await (const chunk of stream) {
        if (abortedRef.current) {
          await stream.return(undefined);
          break;
        }
        if (chunk.done) break;

        if (!streamingStarted) {
          streamingStarted = true;
          dispatch({ type: "AI_STREAMING" });
        }

        setMessages((prev) =>
          prev.map((message) => (message.id === voltId ? { ...message, text: message.text + chunk.token } : message))
        );
      }
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : "I couldn't reach the rest of my mind just now. Try again in a moment.";
      setMessages((prev) => prev.map((m) => (m.id === voltId ? { ...m, text: message } : m)));
      dispatch({ type: "AI_ERROR" });
    }
    if (abortedRef.current) return;
    setStreamingId(null);

    if (!failed) {
      dispatch({ type: "AI_SPEAKING" });
    }
    await sleep(SPEAKING_SETTLE_MS);
    if (abortedRef.current) return;

    // Whether the turn succeeded or failed, this is what returns the Core
    // to idle — "recovering" (on failure) and "speaking" (on success) both
    // transition to idle on AI_FINISHED (see coreReducer.ts).
    dispatch({ type: "AI_FINISHED" });

    if (!failed && conversationEntityIdRef.current) {
      const entity = worldEngine.getEntity(conversationEntityIdRef.current);
      const priorCount = typeof entity?.attributes.messageCount === "number" ? entity.attributes.messageCount : 0;
      worldEngine.updateEntity(conversationEntityIdRef.current, {
        attributes: { messageCount: priorCount + 1, lastMessageAt: Date.now() }
      });
    }

    setBusy(false);
  }

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeToIdle} />

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} pointerEvents="none" />

        <GestureDetector gesture={panGesture}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>VOLT</Text>
              <Pressable onPress={closeToIdle} hitSlop={12} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
          </View>
        </GestureDetector>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(message) => message.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} streaming={item.id === streamingId} />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Say something. The Core is listening.</Text>
              </View>
            }
          />

          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            disabled={busy}
            autoFocus={visible}
          />
        </KeyboardAvoidingView>
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
  flex: {
    flex: 1
  },
  sheet: {
    position: "absolute",
    top: "8%",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.glassBorder
  },
  tint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(2, 2, 2, 0.45)"
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)"
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  title: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 4
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  closeText: {
    color: theme.textMuted,
    fontSize: 16,
    lineHeight: 18
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 13,
    letterSpacing: 0.4
  }
});
