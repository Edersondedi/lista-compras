import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { linkEncarte, MERCADOS } from '../lib/mercados';
import { Cartao, cores, s } from '../ui';

/** Encartes da semana: atalhos para os folhetos de cada mercado. */
export default function TelaPromocoes() {
  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Text style={s.titulo}>Encartes da semana</Text>
        <Text style={s.subtitulo}>Toque num mercado para abrir os folhetos de ofertas de Blumenau</Text>

        <Cartao style={{ marginTop: 16 }}>
          {MERCADOS.map((m, i) => (
            <Pressable
              key={m.nome}
              accessibilityRole="link"
              accessibilityLabel={`Abrir encarte do ${m.nome}`}
              onPress={() => Linking.openURL(linkEncarte(m)).catch(() => {})}
              style={[
                s.linha,
                { minHeight: 56 },
                i === MERCADOS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.textoItem}>{m.nome}</Text>
                <Text style={s.detalhe}>{m.tiendeo ? 'Folhetos no Tiendeo' : 'Busca no Google'}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={cores.verde} />
            </Pressable>
          ))}
        </Cartao>

        <Text style={[s.detalhe, { marginTop: 12, lineHeight: 17 }]}>
          Os encartes abrem no site do Tiendeo, que reúne os folhetos publicados pelos mercados. Viu um preço bom? Na aba Lista, toque em
          "Preço" no item e anote: ele entra na comparação.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
