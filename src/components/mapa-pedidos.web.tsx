import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Pedido } from '@/services/pedidos/pedidos-client';

/**
 * MapLibre es 100% nativo (turbo modules) — no tiene build para
 * react-native-web. En web mostramos este placeholder en vez de crashear
 * el bundle; el mapa real solo corre en development build Android/iOS.
 */
export function MapaPedidos(_props: { pedidos: Pedido[] }) {
  const theme = useTheme();

  return (
    <View style={[styles.contenedor, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
        El mapa solo está disponible en la app nativa (Android/iOS), no en la versión web.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 260,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  texto: { textAlign: 'center' },
});
