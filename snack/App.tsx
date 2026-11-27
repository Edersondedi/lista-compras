import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ouvirNavegacao, Rota } from './nav';
import { cores } from './ui';
import Lista from './screens/Lista';
import Comparar from './screens/Comparar';
import Promocoes from './screens/Promocoes';
import Nota from './screens/Nota';
import Gastos from './screens/Gastos';
import Mercado from './screens/Mercado';
import Ajuda from './screens/Ajuda';
import Ionicons from '@expo/vector-icons/Ionicons';

const ABAS: { rota: Rota; titulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { rota: '/', titulo: 'Lista', icone: 'list' },
  { rota: '/mercado', titulo: 'Mercado', icone: 'cart' },
  { rota: '/comparar', titulo: 'Comparar', icone: 'swap-horizontal' },
  { rota: '/promocoes', titulo: 'Promoções', icone: 'pricetag' },
  { rota: '/gastos', titulo: 'Gastos', icone: 'bar-chart' },
  { rota: '/nota', titulo: 'Nota fiscal', icone: 'receipt' },
  { rota: '/ajuda', titulo: 'Ajuda', icone: 'help-circle' },
];

export default function App() {
  const [rota, setRota] = useState<Rota>('/');
  useEffect(() => ouvirNavegacao(setRota), []);
  const Tela = { '/': Lista, '/mercado': Mercado, '/comparar': Comparar, '/promocoes': Promocoes, '/gastos': Gastos, '/nota': Nota, '/ajuda': Ajuda }[rota];
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <View style={{ flex: 1 }}><Tela /></View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: cores.cartao, borderTopWidth: 1, borderTopColor: cores.borda }}>
          <View style={{ flexDirection: 'row' }}>
            {ABAS.map((a) => (
              <Pressable key={a.rota} accessibilityRole="tab" accessibilityState={{ selected: a.rota === rota }}
                onPress={() => setRota(a.rota)} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={a.icone} size={22} color={a.rota === rota ? cores.verde : cores.secundario} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: a.rota === rota ? cores.verde : cores.secundario }}>{a.titulo}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
