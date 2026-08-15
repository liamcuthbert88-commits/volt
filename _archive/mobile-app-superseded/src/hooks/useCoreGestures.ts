import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useCoreEvent } from "../core/hooks";

export interface CoreGestureHandlers {
  onTap: () => void;
  onSwipeUp: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeDown: () => void;
}

const SWIPE_DISTANCE = 40;
const SWIPE_VELOCITY = 300;

export function useCoreGestures(handlers: CoreGestureHandlers) {
  const dispatch = useCoreEvent();

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (!success) return;
      runOnJS(dispatch)({ type: "USER_TOUCH" });
      runOnJS(handlers.onTap)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      runOnJS(dispatch)({ type: "USER_LONG_PRESS" });
    })
    .onEnd(() => {
      runOnJS(dispatch)({ type: "AI_FINISHED" });
    });

  const pan = Gesture.Pan()
    .minDistance(15)
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;
      if (Math.abs(translationY) > Math.abs(translationX)) {
        if (translationY < -SWIPE_DISTANCE || velocityY < -SWIPE_VELOCITY) {
          runOnJS(handlers.onSwipeUp)();
        } else if (translationY > SWIPE_DISTANCE || velocityY > SWIPE_VELOCITY) {
          runOnJS(handlers.onSwipeDown)();
        }
        return;
      }
      if (translationX < -SWIPE_DISTANCE || velocityX < -SWIPE_VELOCITY) {
        runOnJS(handlers.onSwipeLeft)();
      } else if (translationX > SWIPE_DISTANCE || velocityX > SWIPE_VELOCITY) {
        runOnJS(handlers.onSwipeRight)();
      }
    });

  return Gesture.Race(longPress, pan, tap);
}
