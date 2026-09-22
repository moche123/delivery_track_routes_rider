import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/services/auth/session-context';
import { SesionExpiradaError } from '@/services/api';
import { cancelarAsignacion, listarMios, lugarDeDestino, type Pedido } from '@/services/pedidos/pedidos-client';

export default function PedidoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clearLocalSession } = useSession();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  // No hay GET /pedidos/:id todavía (ver PLAN_PASO0.md) — se busca dentro de "mis
  // pedidos", que es de donde siempre se llega a esta pantalla.
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const mios = await listarMios();
      setPedido(mios.find((p) => String(p.id) === id) ?? null);
    } catch (error) {
      if (error instanceof SesionExpiradaError) {
        clearLocalSession();
        return;
      }
      Alert.alert('Error', 'No se pudo cargar el pedido');
    } finally {
      setCargando(false);
    }
  }, [id, clearLocalSession]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function cancelar() {
    if (!pedido) {
      return;
    }
    setCancelando(true);
    try {
      await cancelarAsignacion(pedido.id);
      router.back();
    } catch (error) {
      if (error instanceof SesionExpiradaError) {
        clearLocalSession();
        return;
      }
      Alert.alert('No se pudo cancelar', 'Intentá de nuevo.');
    } finally {
      setCancelando(false);
    }
  }

  if (cargando) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} />
      </ThemedView>
    );
  }

  if (!pedido) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Pedido no encontrado.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="title" style={styles.title}>
          {pedido.nombre}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{lugarDeDestino(pedido.destino)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.estado}>
          Estado: {pedido.estado}
        </ThemedText>

        <Pressable
          disabled={cancelando}
          onPress={cancelar}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.buttonInner}>
            <ThemedText type="smallBold">
              {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  loader: { marginTop: Spacing.six },
  title: { marginBottom: Spacing.one },
  estado: { marginTop: Spacing.two },
  button: { marginTop: Spacing.four },
  buttonInner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
});
