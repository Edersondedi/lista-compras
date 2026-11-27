import { useMemo } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmar } from './confirmar';
import { historicoPrecos, porCorredor, variacaoSobreMedia } from './lib/gastos';
import { arred, mercadosConhecidos, numeroOuNulo, precoNoMercado, reais } from './lib/logic';
import { NOMES_MERCADOS } from './lib/mercados';
import { useLoja } from './store';
import { Aviso, Botao, Cartao, Chip, Secao, cores, s } from './ui';

/** Tela de compra: lista na ordem dos corredores, preço pago de cada item e total do carrinho. */
export function NoMercado() {
  const { lista, notas, ofertas, clubes, carrinho, definirCarrinho, alternarComprado, salvarNota, limparComprados } = useLoja();
  const mercado = carrinho?.mercado ?? '';
  const precos = carrinho?.precos ?? {};
  const mercados = [...new Set([...NOMES_MERCADOS, ...mercadosConhecidos(notas, ofertas)])].filter((m) => !m.startsWith('Mercado ('));
  const grupos = porCorredor(lista);

  const estimativas = useMemo(() => {
    const e: Record<string, number> = {};
    if (!mercado) return e;
    for (const i of lista) {
      const p = precoNoMercado(i.nome, mercado, notas, ofertas, clubes);
      if (p) e[i.id] = p.preco;
    }
    return e;
  }, [lista, mercado, notas, ofertas, clubes]);

  const noCarrinho = lista.filter((i) => i.comprado);
  const comPreco = noCarrinho.filter((i) => numeroOuNulo(precos[i.id] ?? '') !== null);
  const total = arred(comPreco.reduce((t, i) => t + (numeroOuNulo(precos[i.id]) ?? 0), 0));
  const semPreco = noCarrinho.length - comPreco.length;
  const faltam = lista.filter((i) => !i.comprado);
  const estimadoFalta = arred(faltam.reduce((t, i) => t + (estimativas[i.id] ?? 0), 0));
  const faltamSemEstimativa = faltam.filter((i) => estimativas[i.id] === undefined).length;

  const setPreco = (id: string, v: string) => definirCarrinho({ mercado, precos: { ...precos, [id]: v }, aberto: true });

  function finalizar(salvar: boolean) {
    if (salvar) {
      const itens = comPreco.map((i) => {
        const v = numeroOuNulo(precos[i.id])!;
        return { descricao: i.nome, quantidade: 1, unidade: 'UN', valorUnitario: v, valorTotal: v };
      });
      salvarNota({ mercado: mercado || 'Mercado', data: new Date().toISOString(), itens, total, origem: 'manual' });
    }
    limparComprados();
    definirCarrinho(null);
  }

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={[s.conteudo, { paddingBottom: 200 }]} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.titulo}>No mercado</Text>
          <Pressable accessibilityRole="button" onPress={() => definirCarrinho({ mercado, precos, aberto: false })} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}>
            <Text style={{ color: cores.verde, fontWeight: '600' }}>Voltar à lista</Text>
          </Pressable>
        </View>
        <Text style={s.subtitulo}>Em qual mercado você está?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          {mercados.map((m) => (
            <Chip key={m} texto={m} ativo={m === mercado} onPress={() => definirCarrinho({ mercado: m, precos, aberto: true })} />
          ))}
        </ScrollView>

        {lista.length === 0 && <Aviso tipo="info">A lista está vazia.</Aviso>}

        {grupos.map((g) => (
          <Secao key={g.categoria} titulo={g.categoria}>
            <Cartao>
              {g.itens.map((i) => {
                const est = estimativas[i.id];
                const pago = numeroOuNulo(precos[i.id] ?? '');
                const varia = pago !== null ? variacaoSobreMedia(pago, historicoPrecos(i.nome, notas, ofertas)) : null;
                return (
                  <View key={i.id} style={[s.linha, { paddingVertical: 4, gap: 10 }]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: i.comprado }}
                      onPress={() => alternarComprado(i.id)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          borderWidth: 2,
                          borderColor: cores.verde,
                          backgroundColor: i.comprado ? cores.verde : 'transparent',
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.textoItem, { fontSize: 17 }, i.comprado && { textDecorationLine: 'line-through', color: cores.secundario }]}>
                          {i.nome}
                        </Text>
                        <Text style={s.detalhe}>
                          {[i.quantidade, est !== undefined ? `aqui ~${reais(est)}` : ''].filter(Boolean).join(' · ')}
                          {varia !== null && Math.abs(varia) >= 5 ? (
                            <Text style={{ color: varia > 0 ? cores.perigo : cores.verde, fontWeight: '600' }}>
                              {'  '}
                              {varia > 0 ? `${varia}% acima da média` : `${-varia}% abaixo da média`}
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                    </Pressable>
                    <TextInput
                      accessibilityLabel={`Preço pago em ${i.nome}`}
                      value={precos[i.id] ?? ''}
                      onChangeText={(v) => setPreco(i.id, v)}
                      placeholder={est !== undefined ? est.toFixed(2).replace('.', ',') : 'R$'}
                      placeholderTextColor="#A3ADA7"
                      keyboardType="decimal-pad"
                      style={[s.campo, { width: 88, textAlign: 'right' }]}
                    />
                  </View>
                );
              })}
            </Cartao>
          </Secao>
        ))}

        {noCarrinho.length > 0 && (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Botao titulo="Finalizar e salvar compra" onPress={() => confirmar(
              'Finalizar compra',
              `Salvar ${reais(total)} no ${mercado || 'mercado'} em Gastos e tirar os itens marcados da lista?` +
                (semPreco > 0 ? ` ${semPreco} item(ns) sem preço não entram no valor.` : ''),
              'Salvar',
              () => finalizar(true),
            )} desabilitado={!mercado} />
            <Botao tipo="secundario" titulo="Finalizar sem salvar (vou ler a nota fiscal)" onPress={() => finalizar(false)} />
            {!mercado && <Text style={[s.detalhe, { textAlign: 'center' }]}>Escolha o mercado lá em cima para salvar a compra.</Text>}
            <Text style={[s.detalhe, { textAlign: 'center' }]}>
              Se for ler a nota fiscal depois, finalize sem salvar para a compra não contar duas vezes.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Rodapé fixo com o total */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: cores.cartao, borderTopWidth: 1, borderTopColor: cores.borda, padding: 14, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 14, color: cores.secundario }}>
            No carrinho ({noCarrinho.length} {noCarrinho.length === 1 ? 'item' : 'itens'})
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: cores.texto }}>{reais(total)}</Text>
        </View>
        {semPreco > 0 && <Text style={s.detalhe}>{semPreco} no carrinho ainda sem preço digitado</Text>}
        {faltam.length > 0 && (
          <Text style={s.detalhe}>
            Faltam {faltam.length}
            {estimadoFalta > 0 ? ` · ~${reais(estimadoFalta)} pelos preços conhecidos${faltamSemEstimativa ? ` (${faltamSemEstimativa} sem preço)` : ''}` : ''}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
