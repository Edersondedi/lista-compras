import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compararMercados, idadeDias, melhorDivisao, menorPorItem, PrecoEncontrado, qtdItens, reais, textoIdade } from '../lib/logic';
import { NOMES_MERCADOS } from '../lib/mercados';
import { useLoja } from '../store';
import { PesquisaGuiada } from '../PesquisaGuiada';
import { HistoricoPreco } from '../HistoricoPreco';
import { Pressable } from 'react-native';
import { Aviso, Botao, Cartao, Chip, Secao, cores, s } from '../ui';

const LIMITE_DIAS = 15;

function fonte(p: PrecoEncontrado) {
  const origem = p.origem === 'menorpreco' ? 'Menor Preço' : p.origem === 'site' ? 'site do mercado' : p.origem === 'oferta' ? 'oferta' : 'nota';
  return `${origem}, ${textoIdade(idadeDias(p.data))}`;
}

function velho(p: PrecoEncontrado) {
  return idadeDias(p.data) > 7;
}

export default function TelaComparar() {
  const { lista, notas, ofertas, clubes, alternarClube } = useLoja();
  const pendentes = lista.filter((i) => !i.comprado);
  const [soRecentes, setSoRecentes] = useState(true);
  const [pesquisando, setPesquisando] = useState(false);
  const [corrigindo, setCorrigindo] = useState<string | null>(null);
  const resultados = useMemo(
    () => compararMercados(lista, notas, ofertas, clubes, new Date(), soRecentes ? LIMITE_DIAS : undefined),
    [lista, notas, ofertas, clubes, soRecentes],
  );
  const divisao = useMemo(() => melhorDivisao(resultados, lista), [resultados, lista]);
  const porItem = useMemo(() => menorPorItem(resultados, lista), [resultados, lista]);
  const melhor = resultados[0];
  const chaves = (r: { precos: Record<string, unknown> }) => Object.keys(r.precos).sort().join('|');
  // só compara com mercados que têm preço exatamente dos mesmos itens
  const pior = melhor ? resultados.filter((r) => chaves(r) === chaves(melhor)).at(-1) : undefined;
  const completo = !!melhor && melhor.encontrados === pendentes.length;

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Text style={s.titulo}>Onde comprar</Text>
        <Text style={s.subtitulo}>
          {pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'} · {resultados.length} {resultados.length === 1 ? 'mercado' : 'mercados'} com preço registrado
        </Text>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Chip texto={`Só preços dos últimos ${LIMITE_DIAS} dias`} ativo={soRecentes} onPress={() => setSoRecentes(true)} />
          <Chip texto="Todos os preços" ativo={!soRecentes} onPress={() => setSoRecentes(false)} />
        </View>
        <Text style={[s.detalhe, { marginTop: 6, lineHeight: 17 }]}>
          Os preços vêm só do que entra no app: suas notas fiscais, preços anotados (Menor Preço ou sites) e ofertas cadastradas. O app não busca preços sozinho.
        </Text>

        {pendentes.length > 0 && !pesquisando && (
          <View style={{ marginTop: 12 }}>
            <Botao titulo={`Pesquisar preços da lista (${qtdItens(pendentes.length)})`} onPress={() => setPesquisando(true)} />
          </View>
        )}
        {pesquisando && <PesquisaGuiada itens={pendentes} aoFechar={() => setPesquisando(false)} />}

        {pendentes.length === 0 && <Aviso tipo="info">Adicione itens na lista para comparar.</Aviso>}
        {pendentes.length > 0 && resultados.length === 0 && (
          <Aviso>Ainda não há preços. Registre cupons na aba Nota fiscal ou anote preços pelo botão "Preço" dos itens da lista.</Aviso>
        )}

        {!pesquisando && melhor && pendentes.length > 0 && !completo && (
          <Aviso tipo="info">
            Nenhum mercado tem preço de todos os itens ainda. Veja abaixo o mais barato de cada item, ou use Pesquisar preços da lista.
          </Aviso>
        )}

        {!pesquisando && melhor && completo && (
          <View style={{ marginTop: 16, padding: 18, borderRadius: 16, backgroundColor: cores.verde, gap: 4 }}>
            <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12, fontWeight: '600', letterSpacing: 0.7 }}>
              MELHOR MERCADO ÚNICO
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', flexShrink: 1 }}>{melhor.mercado}</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700' }}>{reais(melhor.total)}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
              {melhor.encontrados} de {qtdItens(pendentes.length)} com preço
              {pior && pior !== melhor ? ` · ${reais(pior.total - melhor.total)} a menos que ${pior.mercado}` : ''}
            </Text>
          </View>
        )}

        {!pesquisando && resultados.length > 0 && pendentes.length > 0 && (
          <Secao titulo="Menor preço por item">
            <Cartao>
              {porItem.map(({ item, ofertas }) => (
                <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: '#EEF1EF' }}>
                <View style={[s.linha, { alignItems: 'flex-start', borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.textoItem, { fontWeight: '600' }]}>{item.nome}</Text>
                    {ofertas.length === 0 ? (
                      <Text style={[s.detalhe, { color: cores.alertaTexto }]}>
                        Sem preço{soRecentes ? ` dos últimos ${LIMITE_DIAS} dias` : ''}. Use o botão Preço na lista para buscar e anotar.
                      </Text>
                    ) : (
                      <>
                        <Text style={[s.detalhe, { color: cores.verdeEscuro, fontWeight: '600' }]}>
                          Mais barato: {ofertas[0].mercado} ({fonte(ofertas[0].preco)})
                        </Text>
                        {velho(ofertas[0].preco) && (
                          <Text style={[s.detalhe, { color: cores.alertaTexto }]}>Preço com mais de 7 dias: confira antes de ir.</Text>
                        )}
                        {ofertas.slice(1).map((o) => (
                          <Text key={o.mercado} style={[s.detalhe, velho(o.preco) && { color: cores.alertaTexto }]}>
                            {o.mercado}: {reais(o.preco.preco)} (+{reais(o.preco.preco - ofertas[0].preco.preco)}) · {fonte(o.preco)}
                          </Text>
                        ))}
                      </>
                    )}
                  </View>
                  {ofertas.length > 0 && <Text style={{ fontWeight: '700', fontSize: 15, color: cores.verde }}>{reais(ofertas[0].preco.preco)}</Text>}
                </View>
                {ofertas.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCorrigindo(corrigindo === item.id ? null : item.id)}
                    style={{ paddingHorizontal: 14, paddingBottom: 8, marginTop: -6 }}
                  >
                    <Text style={{ fontSize: 13, color: cores.verde, fontWeight: '600' }}>
                      {corrigindo === item.id ? 'Fechar' : 'Errou algum preço? Corrigir'}
                    </Text>
                  </Pressable>
                )}
                {corrigindo === item.id && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                    <HistoricoPreco item={item.nome} />
                  </View>
                )}
                </View>
              ))}
            </Cartao>
          </Secao>
        )}

        {!pesquisando && resultados.length > 0 && pendentes.length > 0 && (
          <Secao titulo="Ranking">
            <Cartao>
              {resultados.map((r, idx) => (
                <View key={r.mercado} style={[s.linha, { alignItems: 'flex-start' }]}>
                  <Text style={{ width: 22, fontWeight: '700', color: cores.verde }}>{idx + 1}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.textoItem, { fontWeight: '600' }]}>
                      {r.mercado}
                      {clubes.includes(r.mercado) ? ' · clube' : ''}
                    </Text>
                    {pendentes.map((i) =>
                      r.precos[i.id] ? (
                        <Text key={i.id} style={[s.detalhe, velho(r.precos[i.id]) && { color: cores.alertaTexto }]}>
                          {i.nome}: {reais(r.precos[i.id].preco)} ({fonte(r.precos[i.id])})
                        </Text>
                      ) : null,
                    )}
                    {r.faltando.length > 0 && (
                      <Text style={[s.detalhe, { color: cores.alertaTexto }]}>Sem preço: {r.faltando.join(', ')}</Text>
                    )}
                  </View>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>{reais(r.total)}</Text>
                </View>
              ))}
            </Cartao>
          </Secao>
        )}

        {divisao && melhor && divisao.total < melhor.total && (
          <Secao titulo="Ou divida em 2 mercados">
            <Cartao style={{ padding: 14, gap: 8 }}>
              {divisao.mercados.map((m) => (
                <View key={m} style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.textoItem}>{m}</Text>
                    <Text style={{ fontWeight: '700' }}>{reais(divisao.porMercado[m].total)}</Text>
                  </View>
                  <Text style={s.detalhe}>{divisao.porMercado[m].itens.join(', ')}</Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: cores.borda }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.detalhe}>Economiza mais {reais(melhor.total - divisao.total)}</Text>
                <Text style={{ fontWeight: '700', color: cores.verde }}>{reais(divisao.total)}</Text>
              </View>
            </Cartao>
          </Secao>
        )}

        {resultados.length > 0 && pendentes.length > 0 && (
          <Text style={[s.detalhe, { marginTop: 16, lineHeight: 17 }]}>
            Total estimado com 1 unidade de cada item, pelo último preço registrado. Preços de clube só entram nos mercados marcados como cadastrados.
          </Text>
        )}

        {!pesquisando && (
          <Secao titulo="Onde vocês são cadastrados (clube ou cooperado)">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...new Set([...NOMES_MERCADOS, ...clubes])].map((m) => (
                <Chip key={m} texto={clubes.includes(m) ? `${m} · cadastrado` : `+ ${m}`} ativo={clubes.includes(m)} onPress={() => alternarClube(m)} />
              ))}
            </View>
            <Text style={s.detalhe}>Preços "só para clube" anotados contam apenas nos mercados marcados aqui.</Text>
          </Secao>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
