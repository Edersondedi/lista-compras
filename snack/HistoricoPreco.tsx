import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { historicoPrecos, resumoHistorico } from './lib/gastos';
import { reais, textoIdade, idadeDias } from './lib/logic';
import { useLoja } from './store';
import { cores, s } from './ui';

/** Quanto o item custou nas compras e preços anotados anteriores. */
export function HistoricoPreco({ item }: { item: string }) {
  const { notas, ofertas } = useLoja();
  const [tudo, setTudo] = useState(false);
  const h = useMemo(() => historicoPrecos(item, notas, ofertas), [item, notas, ofertas]);
  const r = resumoHistorico(h);

  if (!r) {
    return (
      <Text style={[s.detalhe, { lineHeight: 17 }]}>
        Ainda não há preço registrado para "{item}". Ele aparece aqui quando vocês lerem uma nota com esse produto ou anotarem um preço.
      </Text>
    );
  }

  const visiveis = tudo ? h : h.slice(0, 5);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: cores.texto }}>Histórico de preço</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          ['Menor', reais(r.minimo), r.ondeMinimo],
          ['Média', reais(r.medio), `${r.quantidade} registro${r.quantidade === 1 ? '' : 's'}`],
          ['Maior', reais(r.maximo), ''],
        ].map(([rot, val, sub]) => (
          <View key={rot} style={{ flex: 1, backgroundColor: cores.cartao, borderRadius: 8, borderWidth: 1, borderColor: cores.borda, padding: 8 }}>
            <Text style={{ fontSize: 11, color: cores.secundario }}>{rot}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: rot === 'Menor' ? cores.verde : cores.texto }}>{val}</Text>
            {!!sub && (
              <Text style={{ fontSize: 11, color: cores.secundario }} numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>
        ))}
      </View>
      {visiveis.map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[s.detalhe, { flex: 1 }]} numberOfLines={1}>
            {x.mercado} · {textoIdade(idadeDias(x.data))} · {x.origem === 'nota' ? 'nota fiscal' : 'anotado'}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: x.preco === r.minimo ? cores.verde : cores.texto }}>{reais(x.preco)}</Text>
        </View>
      ))}
      {h.length > 5 && (
        <Pressable onPress={() => setTudo(!tudo)} accessibilityRole="button">
          <Text style={{ fontSize: 13, color: cores.verde, fontWeight: '600' }}>{tudo ? 'Mostrar menos' : `Ver todos (${h.length})`}</Text>
        </Pressable>
      )}
      <Text style={{ fontSize: 11, color: cores.secundario }}>Preço por unidade/kg como aparece na nota. Produtos parecidos (marcas, tamanhos) entram juntos.</Text>
    </View>
  );
}
