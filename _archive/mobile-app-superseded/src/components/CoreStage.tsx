import React, { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { LivingCore } from "../core/LivingCore";
import type { CoreGestureHandlers } from "../hooks/useCoreGestures";

interface CoreStageProps {
  gestures: CoreGestureHandlers;
}

/**
 * The home view around the Core. Deliberately empty otherwise — traces,
 * labels, weights and orbit trails only appear inside Memory / Universe
 * mode. This is just a measurable, centered wrapper for the Core itself.
 */
export const CoreStage = forwardRef<View, CoreStageProps>(function CoreStage({ gestures }, ref) {
  return (
    <View ref={ref} style={styles.stage} collapsable={false}>
      <LivingCore gestures={gestures} />
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center"
  }
});
