import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SessionProvider, useSession } from "@/services/auth/session-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <AnimatedSplashOverlay />
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    // El splash overlay sigue tapando la pantalla mientras se restaura la sesión.
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pedidos/[id]"
          options={{ headerShown: true, title: "Pedido", presentation: "card" }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
