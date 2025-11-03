import { Stack } from "expo-router";
import { useEffect } from "react";
import { ensureSchema } from "../db";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        await ensureSchema();
      } catch (e) {
        console.error("DB init failed", e);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
