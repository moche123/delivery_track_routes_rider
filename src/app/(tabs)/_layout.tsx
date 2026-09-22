import * as ExpoRouter from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { UserBadge } from '@/components/user-badge';
import { Colors } from '@/constants/theme';

const Tabs: any = (ExpoRouter as any).Tabs;

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ flex: 1 }}>
      <UserBadge />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { backgroundColor: colors.background },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Disponibles' }} />
        <Tabs.Screen name="mios" options={{ title: 'Mis pedidos' }} />
      </Tabs>
    </View>
  );
}
