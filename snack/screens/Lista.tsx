import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from '../nav';
import { Compartilhar } from '../Compartilhar';
import { ListaDaCasa } from '../ListaDaCasa';
import { itensFrequentes } from '../lib/gastos';
import { PrecoRapido } from '../PrecoRapido';
import { sugerirAcabando } from '../lib/logic';
import { CATEGORIAS, Categoria, ItemLista } from '../lib/types';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Chip, Secao, cores, s } from '../ui';

export default function TelaLista() {
  const { lista, notas, frequencia, adicionarItem, alternarComprado, removerItem, editarItem, restaurarItem, limparComprados } = useLoja();
  const [nome, setNome] = useState('');
  const [qtd, setQtd] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Mercearia');
  const [precoAberto, setPrecoAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; nome: string; quantidade: string; categoria: Categoria } | null>(null);
  const [removido, setRemovido] = useState<ItemLista | null>(null);

  // o aviso "Desfazer" some sozinho depois de alguns segundos
  useEffect(() => {
    if (!removido) return;
    const t = setTimeout(() => setRemovido(null), 6000);
    return () => clearTimeout(t);
  }, [removido]);

  const frequentes = useMemo(() => itensFrequentes(frequencia, lista), [frequencia, lista]);
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

  function remover(item: ItemLista) {
    removerItem(item.id);
    setRemovido(item);
    if (editando?.id === item.id) setEditando(null);
    if (precoAberto === item.id) setPrecoAberto(null);
  }

  function salvarEdicao() {
    if (!editando || !editando.nome.trim()) return;
    editarItem(editando.id, editando);
    setEditando(null);
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
          {frequentes.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={s.detalhe}>Vocês sempre compram:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {frequentes.map((f) => (
                  <Chip key={f.nome} texto={`+ ${f.nome}`} onPress={() => adicionarItem(f.nome, '', f.categoria)} />
                ))}
              </View>
            </View>
          )}
        </Cartao>


        <ListaDaCasa />
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
                      onLongPress={() => remover(i)}
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
                        onPress={() => {
                          setEditando(null);
                          setPrecoAberto(precoAberto === i.id ? null : i.id);
                        }}
                        style={{ minHeight: 44, minWidth: 52, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: cores.verde, fontWeight: '600', fontSize: 13 }}>{precoAberto === i.id ? 'Fechar' : 'Preço'}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${i.nome}`}
                      onPress={() => {
                        setPrecoAberto(null);
                        setEditando(editando?.id === i.id ? null : { id: i.id, nome: i.nome, quantidade: i.quantidade, categoria: i.categoria });
                      }}
                      style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="create-outline" size={21} color={cores.secundario} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${i.nome}`}
                      onPress={() => remover(i)}
                      style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="trash-outline" size={20} color={cores.perigo} />
                    </Pressable>
                  </View>
                  {editando?.id === i.id && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, backgroundColor: cores.verdeClaro }}>
                      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10 }}>
                        <Campo
                          rotulo="Nome"
                          value={editando.nome}
                          onChangeText={(v) => setEditando({ ...editando, nome: v })}
                          onSubmitEditing={salvarEdicao}
                          returnKeyType="done"
                          autoFocus
                        />
                        <View style={{ width: 100 }}>
                          <Campo rotulo="Quantidade" value={editando.quantidade} onChangeText={(v) => setEditando({ ...editando, quantidade: v })} placeholder="2 un" />
                        </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {CATEGORIAS.map((c) => (
                          <Chip key={c} texto={c} ativo={c === editando.categoria} onPress={() => setEditando({ ...editando, categoria: c })} />
                        ))}
                      </ScrollView>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Botao tipo="secundario" titulo="Cancelar" onPress={() => setEditando(null)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Botao titulo="Salvar" onPress={salvarEdicao} desabilitado={!editando.nome.trim()} />
                        </View>
                      </View>
                    </View>
                  )}
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
            <Text style={[s.detalhe, { textAlign: 'center' }]}>Toque no item para marcar · lápis para editar · lixeira para remover</Text>
          </View>
        )}
      </ScrollView>
      {removido && (
        <View
          style={{
            position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#1D2A23', borderRadius: 10,
            flexDirection: 'row', alignItems: 'center', paddingLeft: 14, minHeight: 48,
          }}
        >
          <Text style={{ flex: 1, color: '#fff', fontSize: 14 }} numberOfLines={1}>
            "{removido.nome}" removido
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              restaurarItem(removido);
              setRemovido(null);
            }}
            style={{ paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: '#7FD3A3', fontWeight: '700', fontSize: 14 }}>DESFAZER</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
