import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmar } from '../confirmar';
import { precosDaEtiqueta } from '../lib/cupom';
import { historicoPrecos, porCorredor, variacaoSobreMedia } from '../lib/gastos';
import { escolherFoto, lerFoto, ocrDisponivel } from '../ocr';
import { arred, mercadosConhecidos, numeroOuNulo, precoNoMercado, reais } from '../lib/logic';
import { NOMES_MERCADOS } from '../lib/mercados';
import { useLoja } from '../store';
import { Aviso, Botao, Cartao, Chip, Secao, cores, s } from '../ui';

/** Tela de compra: lista na ordem dos corredores, preço pago de cada item e total do carrinho. */
export default function TelaMercado() {
  const { lista, notas, ofertas, clubes, carrinho, definirCarrinho, alternarComprado, salvarNota, limparComprados } = useLoja();
  const mercado = carrinho?.mercado ?? '';
  const precos = carrinho?.precos ?? {};
  const mercados = [...new Set([...NOMES_MERCADOS, ...mercadosConhecidos(notas, ofertas)])].filter((m) => !m.startsWith('Mercado ('));
  const grupos = porCorredor(lista);
  const [foto, setFoto] = useState<{ id: string; lendo: boolean; precos: number[]; erro?: string } | null>(null);

  async function precoPorFoto(id: string) {
    const arquivo = await escolherFoto();
    if (!arquivo) return;
    setFoto({ id, lendo: true, precos: [] });
    try {
      const r = await lerFoto(arquivo, undefined, [1000, 600, 380], 'etiqueta');
      const precos = precosDaEtiqueta(r.palavras);
      if (precos.length === 1) {
        setPreco(id, precos[0].toFixed(2).replace('.', ','));
        setFoto(null);
      } else {
        setFoto({ id, lendo: false, precos, erro: precos.length ? undefined : 'Não achei preço na foto. Chegue mais perto da etiqueta e tente de novo, ou digite.' });
      }
    } catch (e) {
      setFoto({ id, lendo: false, precos: [], erro: (e as Error).message });
    }
  }

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

  function setPreco(id: string, v: string) {
    const atual = useLoja.getState().carrinho;
    definirCarrinho({ mercado: atual?.mercado ?? '', precos: { ...(atual?.precos ?? {}), [id]: v }, aberto: true });
    // digitou o preço = pegou o item
    const item = useLoja.getState().lista.find((x) => x.id === id);
    if (item && !item.comprado && v.trim()) alternarComprado(id);
  }

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
        <Text style={s.titulo}>No mercado</Text>
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
                  <View key={i.id}>
                  <View style={[s.linha, { paddingVertical: 4, gap: 10 }]}>
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
                    {ocrDisponivel && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ler preço de ${i.nome} pela foto da etiqueta`}
                        onPress={() => precoPorFoto(i.id)}
                        style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {foto?.id === i.id && foto.lendo ? <ActivityIndicator color={cores.verde} /> : <Ionicons name="camera-outline" size={22} color={cores.verde} />}
                      </Pressable>
                    )}
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
                  {foto?.id === i.id && !foto.lendo && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 10, gap: 6 }}>
                      {foto.erro ? (
                        <Text style={{ fontSize: 13, color: cores.alertaTexto }}>{foto.erro}</Text>
                      ) : (
                        <>
                          <Text style={s.detalhe}>Achei mais de um preço na etiqueta. Qual é o de {i.nome}?</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {foto.precos.map((p) => (
                              <Chip
                                key={p}
                                texto={reais(p)}
                                onPress={() => {
                                  setPreco(i.id, p.toFixed(2).replace('.', ','));
                                  setFoto(null);
                                }}
                              />
                            ))}
                          </View>
                        </>
                      )}
                      <Pressable onPress={() => setFoto(null)} accessibilityRole="button">
                        <Text style={{ fontSize: 13, color: cores.verde, fontWeight: '600' }}>Fechar</Text>
                      </Pressable>
                    </View>
                  )}
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
