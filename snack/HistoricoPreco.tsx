import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { RegistroPreco, historicoPrecos, resumoHistorico } from './lib/gastos';
import { idadeDias, numeroOuNulo, reais, textoIdade } from './lib/logic';
import { useLoja } from './store';
import { Botao, cores, s } from './ui';

/** Quanto o item custou nas compras e preços anotados anteriores. */
export function HistoricoPreco({ item }: { item: string }) {
  const { notas, ofertas, editarOferta, removerOferta, corrigirPrecoNota } = useLoja();
  const [tudo, setTudo] = useState(false);
  const [editando, setEditando] = useState<{ r: RegistroPreco; valor: string } | null>(null);
  const chave = (x: RegistroPreco) => (x.ref.tipo === 'oferta' ? x.ref.id : `${x.ref.notaId}:${x.ref.indice}`);

  function salvar() {
    if (!editando) return;
    const v = numeroOuNulo(editando.valor);
    if (v === null || v <= 0) return;
    const ref = editando.r.ref;
    if (ref.tipo === 'oferta') editarOferta(ref.id, v);
    else corrigirPrecoNota(ref.notaId, ref.indice, v);
    setEditando(null);
  }
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
      {visiveis.map((x) =>
        editando && chave(editando.r) === chave(x) ? (
          <View key={chave(x)} style={{ gap: 8, padding: 10, borderRadius: 8, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.verde }}>
            <Text style={s.detalhe}>
              {x.mercado} · {textoIdade(idadeDias(x.data))} · {x.origem === 'nota' ? `nota fiscal ("${x.descricao}")` : 'anotado'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: cores.texto }}>Preço certo R$</Text>
              <TextInput
                accessibilityLabel="Preço correto"
                value={editando.valor}
                onChangeText={(valor) => setEditando({ ...editando, valor })}
                keyboardType="decimal-pad"
                autoFocus
                onSubmitEditing={salvar}
                style={[s.campo, { flex: 1, textAlign: 'right' }]}
              />
            </View>
            {x.origem === 'nota' && <Text style={{ fontSize: 11, color: cores.secundario }}>Corrige o preço deste produto na nota e o total da compra.</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Botao tipo="secundario" titulo="Cancelar" onPress={() => setEditando(null)} />
              </View>
              {x.ref.tipo === 'oferta' && (
                <View style={{ flex: 1 }}>
                  <Botao
                    tipo="secundario"
                    titulo="Apagar"
                    onPress={() => {
                      if (x.ref.tipo === 'oferta') removerOferta(x.ref.id);
                      setEditando(null);
                    }}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Botao titulo="Salvar" onPress={salvar} desabilitado={!(numeroOuNulo(editando.valor) ?? 0)} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            key={chave(x)}
            accessibilityRole="button"
            accessibilityLabel={`Corrigir preço de ${x.mercado}: ${reais(x.preco)}`}
            onPress={() => setEditando({ r: x, valor: x.preco.toFixed(2).replace('.', ',') })}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 36 }}
          >
            <Text style={[s.detalhe, { flex: 1 }]} numberOfLines={1}>
              {x.mercado} · {textoIdade(idadeDias(x.data))} · {x.origem === 'nota' ? 'nota fiscal' : 'anotado'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: x.preco === r.minimo ? cores.verde : cores.texto }}>{reais(x.preco)}</Text>
            <Text style={{ fontSize: 12, color: cores.verde }}>corrigir</Text>
          </Pressable>
        ),
      )}
      {h.length > 5 && (
        <Pressable onPress={() => setTudo(!tudo)} accessibilityRole="button">
          <Text style={{ fontSize: 13, color: cores.verde, fontWeight: '600' }}>{tudo ? 'Mostrar menos' : `Ver todos (${h.length})`}</Text>
        </Pressable>
      )}
      <Text style={{ fontSize: 11, color: cores.secundario }}>Preço por unidade/kg como aparece na nota. Produtos parecidos (marcas, tamanhos) entram juntos.</Text>
    </View>
  );
}
