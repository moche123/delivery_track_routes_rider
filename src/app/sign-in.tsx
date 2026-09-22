import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { ComponentType } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/services/auth/session-context';

const CompatibleActivityIndicator = ActivityIndicator as unknown as ComponentType;

export default function SignInScreen() {
  const { signIn, isSigningIn, canSignIn } = useSession();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Ridera
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Iniciá sesión con tu cuenta de Google para ver los pedidos disponibles.
        </ThemedText>

        <Pressable
          disabled={!canSignIn || isSigningIn}
          onPress={signIn}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.buttonInner}>
            {isSigningIn ? (
              <CompatibleActivityIndicator />
            ) : (
              <ThemedText type="smallBold">Continuar con Google</ThemedText>
            )}
          </ThemedView>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  button: { marginTop: Spacing.four },
  buttonInner: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: { opacity: 0.7 },
});
