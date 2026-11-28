import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useCodigoNoEndereco } from '../ListaDaCasa';
import { recarregarNaVersaoNova, useVersaoNova } from '../atualizacao';
import { Pressable, Text, View } from 'react-native';
import { cores } from '../ui';

type NomeIcone = keyof typeof Ionicons.glyphMap;
const icone = (nome: NomeIcone) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={nome} color={color as string} size={size} />;

export default function Layout() {
  useCodigoNoEndereco(usePathname());
  const versaoNova = useVersaoNova();
  return (
    <View style={{ flex: 1 }}>
    {versaoNova && (
      <Pressable
        accessibilityRole="button"
        onPress={recarregarNaVersaoNova}
        style={{ backgroundColor: cores.verde, paddingVertical: 10, paddingHorizontal: 14, paddingTop: 44 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Nova versão do app disponível · toque para atualizar</Text>
      </Pressable>
    )}
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.verde,
        tabBarInactiveTintColor: cores.secundario,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Lista', tabBarIcon: icone('list') }} />
      <Tabs.Screen name="mercado" options={{ title: 'Mercado', tabBarIcon: icone('cart') }} />
      <Tabs.Screen name="comparar" options={{ title: 'Comparar', tabBarIcon: icone('swap-horizontal') }} />
      <Tabs.Screen name="promocoes" options={{ title: 'Promoções', tabBarIcon: icone('pricetag') }} />
      <Tabs.Screen name="gastos" options={{ title: 'Gastos', tabBarIcon: icone('bar-chart') }} />
      <Tabs.Screen name="nota" options={{ title: 'Nota fiscal', tabBarIcon: icone('receipt') }} />
      <Tabs.Screen name="ajuda" options={{ title: 'Ajuda', tabBarIcon: icone('help-circle') }} />
    </Tabs>
    </View>
  );
}
