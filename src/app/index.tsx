import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { confirmar } from '../confirmar';
import { Compartilhar } from '../Compartilhar';
import { PrecoRapido } from '../PrecoRapido';
import { sugerirAcabando } from '../lib/logic';
import { CATEGORIAS, Categoria } from '../lib/types';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Chip, Secao, cores, s } from '../ui';

export default function TelaLista() {
  const { lista, notas, adicionarItem, alternarComprado, removerItem, limparComprados } = useLoja();
  const [nome, setNome] = useState('');
  const [qtd, setQtd] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Mercearia');
  const [precoAberto, setPrecoAberto] = useState<string | null>(null);

  const sugestoes = useMemo(() => sugerirAcabando(notas, lista).slice(0, 4), [notas, lista]);
  const pendentes = lista.filter((i) => !i.comprado).length;
  const comprados = lista.length - pendentes;

  const grupos = CATEGORIAS.map((c) => ({ categoria: c, itens: lista.filter((i) => i.categoria === c) })).filter(
    (g) => g.itens.length > 0,
  );

  function adicionar() {
    adicionarItem(nome, qtd, categoria);
    setNome('');
    setQtd('');
  }

  function confirmarRemocao(id: string, item: string) {
    confirmar('Remover item', `Tirar "${item}" da lista?`, 'Remover', () => removerItem(id));
  }

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={{ color: cores.verde, fontWeight: '700', fontSize: 13 }}>COMPRA CERTA</Text>
        <Text style={s.titulo}>Compras da semana</Text>
        <Text style={s.subtitulo}>
          {pendentes} a comprar{comprados > 0 ? ` · ${comprados} no carrinho` : ''}
        </Text>

        <Cartao style={{ padding: 14, gap: 10, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Campo rotulo="Item" value={nome} onChangeText={setNome} placeholder="Ex.: café" onSubmitEditing={adicionar} returnKeyType="done" />
            <View style={{ width: 100 }}>
              <Campo rotulo="Quantidade" value={qtd} onChangeText={setQtd} placeholder="2 un" />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {CATEGORIAS.map((c) => (
              <Chip key={c} texto={c} ativo={c === categoria} onPress={() => setCategoria(c)} />
            ))}
          </ScrollView>
          <Botao titulo="Adicionar à lista" onPress={adicionar} desabilitado={!nome.trim()} />
        </Cartao>

        <Compartilhar />

        {sugestoes.length > 0 && (
          <Secao titulo="Provavelmente acabando">
            <Cartao>
              {sugestoes.map((sg) => (
                <View key={sg.nome} style={s.linha}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.textoItem}>{sg.nome}</Text>
                    <Text style={s.detalhe}>
                      Compra a cada ~{sg.intervaloMedioDias} dias · última há {sg.diasDesdeUltima}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar ${sg.nome}`}
                    onPress={() => adicionarItem(sg.nome, '', 'Outros')}
                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
                  >
                    <Text style={{ color: cores.verde, fontWeight: '600' }}>Adicionar</Text>
                  </Pressable>
                </View>
              ))}
            </Cartao>
          </Secao>
        )}

        {lista.length === 0 && (
          <Aviso tipo="info">Lista vazia. Adicione itens acima ou escaneie uma nota fiscal para o app aprender o que a casa costuma comprar.</Aviso>
        )}

        {grupos.map((g) => (
          <Secao key={g.categoria} titulo={g.categoria}>
            <Cartao>
              {g.itens.map((i) => (
                <View key={i.id}>
                  <View style={[s.linha, { paddingVertical: 0, paddingRight: 4 }]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: i.comprado }}
                      onPress={() => alternarComprado(i.id)}
                      onLongPress={() => confirmarRemocao(i.id, i.nome)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: cores.verde,
                          backgroundColor: i.comprado ? cores.verde : 'transparent',
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.textoItem, i.comprado && { textDecorationLine: 'line-through', color: cores.secundario }]}>
                          {i.nome}
                        </Text>
                        {!!i.quantidade && <Text style={s.detalhe}>{i.quantidade}</Text>}
                      </View>
                    </Pressable>
                    {!i.comprado && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Preço de ${i.nome}`}
                        onPress={() => setPrecoAberto(precoAberto === i.id ? null : i.id)}
                        style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: cores.verde, fontWeight: '600', fontSize: 13 }}>{precoAberto === i.id ? 'Fechar' : 'Preço'}</Text>
                      </Pressable>
                    )}
                  </View>
                  {precoAberto === i.id && <PrecoRapido item={i.nome} aoFechar={() => setPrecoAberto(null)} />}
                </View>
              ))}
            </Cartao>
          </Secao>
        ))}

        {lista.length > 0 && (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Botao titulo={`Comparar preços (${pendentes} ${pendentes === 1 ? "item" : "itens"})`} onPress={() => router.navigate('/comparar')} desabilitado={pendentes === 0} />
            {comprados > 0 && <Botao tipo="secundario" titulo="Limpar itens já comprados" onPress={limparComprados} />}
            <Text style={[s.detalhe, { textAlign: 'center' }]}>Toque para marcar · segure para remover</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
