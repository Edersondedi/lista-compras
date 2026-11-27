import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { numeroOuNulo, reais } from './lib/logic';
import { linkBusca, MERCADOS } from './lib/mercados';
import { ItemLista } from './lib/types';
import { useLoja } from './store';
import { Botao, Cartao, cores, s } from './ui';

const COM_BUSCA = MERCADOS.filter((m) => m.busca);

/** Passa item por item da lista: abre a busca de cada mercado e anota o preço visto. */
export function PesquisaGuiada({ itens, aoFechar }: { itens: ItemLista[]; aoFechar: () => void }) {
  const { salvarOferta } = useLoja();
  const [idx, setIdx] = useState(0);
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [salvos, setSalvos] = useState(0);
  const item = itens[idx];

  function avancar(salvar: boolean) {
    if (salvar && item) {
      const validade = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
      let n = 0;
      for (const m of COM_BUSCA) {
        const v = numeroOuNulo(precos[m.nome] ?? '');
        if (v === null) continue;
        salvarOferta({ item: item.nome, mercado: m.nome, precoOferta: v, tipo: 'todos', validade, fonte: 'site' });
        n++;
      }
      setSalvos((x) => x + n);
    }
    setPrecos({});
    if (idx + 1 >= itens.length) setIdx(itens.length);
    else setIdx(idx + 1);
  }

  if (!item) {
    return (
      <Cartao style={{ padding: 16, gap: 10, marginTop: 16 }}>
        <Text style={[s.textoItem, { fontWeight: '700' }]}>Pesquisa concluída</Text>
        <Text style={s.detalhe}>{salvos === 0 ? 'Nenhum preço anotado.' : `${salvos} preço(s) anotado(s). A comparação abaixo já usa esses preços.`}</Text>
        <Botao titulo="Ver comparação" onPress={aoFechar} />
      </Cartao>
    );
  }

  const menor = COM_BUSCA.map((m) => ({ m: m.nome, v: numeroOuNulo(precos[m.nome] ?? '') }))
    .filter((x) => x.v !== null)
    .sort((a, b) => (a.v as number) - (b.v as number))[0];

  return (
    <Cartao style={{ padding: 14, gap: 10, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.detalhe}>
          Item {idx + 1} de {itens.length}
        </Text>
        <Pressable accessibilityRole="button" onPress={aoFechar} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text style={{ color: cores.secundario, fontWeight: '600' }}>Sair</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: cores.texto }}>{item.nome}</Text>
      <Text style={[s.detalhe, { lineHeight: 17 }]}>
        Toque em Abrir, veja o preço no site e digite ao lado. Deixe em branco onde não achar. Preço de site pode diferir da loja.
      </Text>
      {COM_BUSCA.map((m) => (
        <View key={m.nome} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.textoItem, { flex: 1 }]}>{m.nome}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Abrir ${item.nome} no site do ${m.nome}`}
            onPress={() => Linking.openURL(linkBusca(m, item.nome)).catch(() => {})}
            style={{ minHeight: 44, minWidth: 64, borderRadius: 10, borderWidth: 1, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao }}
          >
            <Text style={{ color: cores.verde, fontWeight: '600' }}>Abrir</Text>
          </Pressable>
          <TextInput
            accessibilityLabel={`Preço no ${m.nome}`}
            value={precos[m.nome] ?? ''}
            onChangeText={(t) => setPrecos((p) => ({ ...p, [m.nome]: t }))}
            placeholder="R$"
            placeholderTextColor="#8A968F"
            keyboardType="decimal-pad"
            style={[s.campo, { width: 92 }, menor?.m === m.nome && { borderColor: cores.verde, borderWidth: 2 }]}
          />
        </View>
      ))}
      {menor && (
        <Text style={{ color: cores.verdeEscuro, fontWeight: '600' }}>
          Mais barato até agora: {menor.m} ({reais(menor.v as number)})
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Botao tipo="secundario" titulo="Pular" onPress={() => avancar(false)} />
        </View>
        <View style={{ flex: 2 }}>
          <Botao titulo={idx + 1 >= itens.length ? 'Salvar e concluir' : 'Salvar e próximo'} onPress={() => avancar(true)} />
        </View>
      </View>
    </Cartao>
  );
}
