import { Tabs } from 'expo-router/tabs';
import { cores } from '../ui';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.verde,
        tabBarInactiveTintColor: cores.secundario,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Lista' }} />
      <Tabs.Screen name="comparar" options={{ title: 'Comparar' }} />
      <Tabs.Screen name="promocoes" options={{ title: 'Promoções' }} />
      <Tabs.Screen name="nota" options={{ title: 'Nota fiscal' }} />
    </Tabs>
  );
}
