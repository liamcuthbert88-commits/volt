import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CoreProvider } from "./src/core/CoreProvider";
import { CoreMode } from "./src/modes/CoreMode";
import { ConversationMode } from "./src/modes/conversation/ConversationMode";
import { MemoryMode } from "./src/modes/MemoryMode";
import { FocusMode } from "./src/modes/FocusMode";
import { UniverseMode } from "./src/modes/UniverseMode";
import { useTraces } from "./src/hooks/useTraces";
import { useDailySession } from "./src/hooks/useDailySession";
import { measureCenter } from "./src/hooks/measure";
import { DailyMode } from "./src/modes/DailyMode";
import { theme } from "./src/theme";
import type { AppMode } from "./src/state/appMode";
import type { Point } from "./src/types";
import type { View as RNView } from "react-native";

export default function App() {
  const [mode, setMode] = useState<AppMode>("CORE");
  const { traces, error: worldError, commit } = useTraces();
  const daily = useDailySession();
  const [coreCenter, setCoreCenter] = useState<Point>({ x: 0, y: 0 });

  const fieldRef = useRef<RNView>(null);

  useEffect(() => {
    if (mode !== "MEMORY") return;
    measureCenter(fieldRef).then(setCoreCenter);
  }, [mode]);

  const closeToCore = useCallback(() => setMode("CORE"), []);

  const gestures = {
    onTap: () => {
      if (mode === "CORE") setMode("CONVERSATION");
    },
    onSwipeUp: () => {
      if (mode !== "CORE") return;
      setMode("MEMORY");
    },
    onSwipeLeft: () => {
      if (mode !== "CORE") return;
      setMode("FOCUS");
    },
    onSwipeRight: () => {
      if (mode !== "CORE") return;
      setMode("UNIVERSE");
    },
    onSwipeDown: () => {
      if (mode !== "CORE") return;
      setMode("DAILY");
    }
  };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <CoreProvider>
        <View style={styles.appRoot}>
          <CoreMode
            mode={mode}
            worldError={worldError}
            onCommitTrace={commit}
            gestures={gestures}
            fieldRef={fieldRef}
            daily={daily}
          />

          <ConversationMode visible={mode === "CONVERSATION"} onClose={closeToCore} />

          <DailyMode visible={mode === "DAILY"} daily={daily} onClose={closeToCore} />

          <MemoryMode
            visible={mode === "MEMORY"}
            traces={traces}
            anchor={coreCenter}
            onClose={closeToCore}
          />

          <FocusMode visible={mode === "FOCUS"} onClose={closeToCore} />

          <UniverseMode visible={mode === "UNIVERSE"} traces={traces} onClose={closeToCore} />
        </View>
      </CoreProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: theme.bg
  },
  flex: {
    flex: 1
  }
});
