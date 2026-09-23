import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/services/auth/session-context';
import { SesionExpiradaError } from '@/services/api';
import { asignar, listarDisponibles, lugarDeDestino, type Pedido } from '@/services/pedidos/pedidos-client';

export default function DisponiblesScreen() {
  const { clearLocalSession } = useSession();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tomando, setTomando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPedidos(await listarDisponibles());
    } catch (error) {
      if (error instanceof SesionExpiradaError) {
        clearLocalSession();
        return;
      }
      Alert.alert('Error', 'No se pudieron cargar los pedidos disponibles');
    } finally {
      setCargando(false);
    }
  }, [clearLocalSession]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function tomar(pedido: Pedido) {
    setTomando(pedido.id);
    try {
      await asignar(pedido.id);
      setPedidos((actuales) => actuales.filter((p) => p.id !== pedido.id));
    } catch (error) {
      if (error instanceof SesionExpiradaError) {
        clearLocalSession();
        return;
      }
      Alert.alert('No se pudo tomar el pedido', 'Puede que ya lo haya tomado otro driver.');
      void cargar();
    } finally {
      setTomando(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Pedidos disponibles
        </ThemedText>

        {cargando && pedidos.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.loader}>
            Cargando…
          </ThemedText>
        ) : (
          <FlatList
            data={pedidos}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshing={cargando}
            onRefresh={cargar}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No hay pedidos disponibles por ahora.
              </ThemedText>
            }
            renderItem={({ item }: { item: Pedido }) => (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{item.nombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {lugarDeDestino(item.destino).lugar}
                </ThemedText>
                <Pressable
                  disabled={tomando === item.id}
                  onPress={() => tomar(item)}
                  style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                  <ThemedView type="backgroundSelected" style={styles.buttonInner}>
                    <ThemedText type="smallBold">
                      {tomando === item.id ? 'Tomando…' : 'Tomar pedido'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </ThemedView>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  title: { paddingVertical: Spacing.three },
  loader: { marginTop: Spacing.six },
  list: { gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  button: { marginTop: Spacing.two, alignSelf: 'flex-start' },
  buttonInner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
