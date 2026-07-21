import type { View } from "react-native";
import type { Point } from "../types";

const ORIGIN: Point = { x: 0, y: 0 };

export function measureCenter(ref: React.RefObject<View | null>): Promise<Point> {
  return new Promise((resolve) => {
    if (!ref.current) {
      resolve(ORIGIN);
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      resolve({ x: x + width / 2, y: y + height / 2 });
    });
  });
}
