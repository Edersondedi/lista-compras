import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ouvirNavegacao, Rota } from './nav';
import { cores } from './ui';
import Lista from './screens/Lista';
import Comparar from './screens/Comparar';
import Promocoes from './screens/Promocoes';
import Nota from './screens/Nota';

const ABAS: { rota: Rota; titulo: string }[] = [
  { rota: '/', titulo: 'Lista' },
  { rota: '/comparar', titulo: 'Comparar' },
  { rota: '/promocoes', titulo: 'Promoções' },
  { rota: '/nota', titulo: 'Nota fiscal' },
];

export default function App() {
  const [rota, setRota] = useState<Rota>('/');
  useEffect(() => ouvirNavegacao(setRota), []);
  const Tela = { '/': Lista, '/comparar': Comparar, '/promocoes': Promocoes, '/nota': Nota }[rota];
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <View style={{ flex: 1 }}><Tela /></View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: cores.cartao, borderTopWidth: 1, borderTopColor: cores.borda }}>
          <View style={{ flexDirection: 'row' }}>
            {ABAS.map((a) => (
              <Pressable key={a.rota} accessibilityRole="tab" accessibilityState={{ selected: a.rota === rota }}
                onPress={() => setRota(a.rota)} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: a.rota === rota ? cores.verde : cores.secundario }}>{a.titulo}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
