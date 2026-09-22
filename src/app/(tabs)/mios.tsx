import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/services/auth/session-context';
import { SesionExpiradaError } from '@/services/api';
import { listarMios, lugarDeDestino, type Pedido } from '@/services/pedidos/pedidos-client';

export default function MiosScreen() {
  const { clearLocalSession } = useSession();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPedidos(await listarMios());
    } catch (error) {
      if (error instanceof SesionExpiradaError) {
        clearLocalSession();
        return;
      }
      Alert.alert('Error', 'No se pudieron cargar tus pedidos');
    } finally {
      setCargando(false);
    }
  }, [clearLocalSession]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Mis pedidos
        </ThemedText>

        {cargando && pedidos.length === 0 ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <FlatList
            data={pedidos}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshing={cargando}
            onRefresh={cargar}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Todavía no tomaste ningún pedido.
              </ThemedText>
            }
            renderItem={({ item }: { item: Pedido }) => (
              <Link href={`/pedidos/${item.id}`} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">{item.nombre}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {lugarDeDestino(item.destino)}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
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
  pressed: { opacity: 0.7 },
});
