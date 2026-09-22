import { useEffect, useState } from 'react';
import { Image, type ImageErrorEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/services/auth/session-context';
import { getAccessTokenTtlMs, getRefreshTokenTtlMs } from '@/services/auth/auth-client';

/** Debug/perfil: foto, nombre, email y countdown de tokens — equivalente al
 * header de client/src/app/app.html, para inspeccionar la sesión a mano. */
export function UserBadge() {
  const { user, signOut } = useSession();
  const [accessCountdown, setAccessCountdown] = useState('–');
  const [refreshCountdown, setRefreshCountdown] = useState('–');
  const [fotoFallo, setFotoFallo] = useState(false);

  useEffect(() => {
    setFotoFallo(false);
  }, [user?.foto]);

  useEffect(() => {
    if (!user) {
      setAccessCountdown('–');
      setRefreshCountdown('–');
      return;
    }

    let cancelado = false;

    async function tick() {
      const [accessTtl, refreshTtl] = await Promise.all([
        getAccessTokenTtlMs(),
        getRefreshTokenTtlMs(),
      ]);
      if (cancelado) {
        return;
      }
      setAccessCountdown(formatCountdown(accessTtl));
      setRefreshCountdown(formatCountdown(refreshTtl));
    }

    void tick();
    const timer = setInterval(tick, 1000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <ThemedView type="backgroundElement">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.row}>
          {user.foto && !fotoFallo ? (
            // Image de 'react-native', no de expo-image: en web expo-image pone
            // crossOrigin="anonymous" en el <img> que genera, y
            // lh3.googleusercontent.com no manda Access-Control-Allow-Origin
            // para ese modo — el navegador bloquea la carga. El Image de RN no
            // setea crossOrigin y sí la muestra.
            <Image
              source={{ uri: user.foto }}
              style={styles.avatar}
              resizeMode="cover"
              accessibilityLabel={`Foto de ${user.nombre}`}
              onError={(event: ImageErrorEvent) => {
                console.warn(
                  'UserBadge: no se pudo cargar la foto de perfil',
                  user.foto,
                  event.nativeEvent.error,
                );
                setFotoFallo(true);
              }}
            />
          ) : (
            <ThemedView type="backgroundSelected" style={styles.avatarFallback}>
              <ThemedText type="smallBold">{user.nombre.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
          )}

          <View style={styles.identity}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {user.nombre}
            </ThemedText>
            {user.email ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {user.email}
              </ThemedText>
            ) : null}
          </View>

          <Pressable onPress={() => void signOut()} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="linkPrimary">Salir</ThemedText>
          </Pressable>
        </View>

        <View style={styles.chips}>
          <Chip label="Access" value={accessCountdown} />
          <Chip label="Refresh" value={refreshCountdown} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.chip}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}: <ThemedText type="smallBold">{value}</ThemedText>
      </ThemedText>
    </ThemedView>
  );
}

/** Igual que client/src/app/app.ts: Xd HH:MM:SS, o "expirado". */
function formatCountdown(ms: number | null): string {
  if (ms === null) {
    return '–';
  }
  if (ms <= 0) {
    return 'expirado';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return days > 0 ? `${days}d ${hms}` : hms;
}

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
