import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compararMercados, melhorDivisao, menorPorItem, qtdItens, reais } from '../lib/logic';
import { useLoja } from '../store';
import { Aviso, Cartao, Secao, cores, s } from '../ui';

function dataCurta(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a.slice(2)}`;
}

export default function TelaComparar() {
  const { lista, notas, ofertas, clubes } = useLoja();
  const pendentes = lista.filter((i) => !i.comprado);
  const resultados = useMemo(() => compararMercados(lista, notas, ofertas, clubes), [lista, notas, ofertas, clubes]);
  const divisao = useMemo(() => melhorDivisao(resultados, lista), [resultados, lista]);
  const porItem = useMemo(() => menorPorItem(resultados, lista), [resultados, lista]);
  const melhor = resultados[0];
  const pior = resultados.filter((r) => r.encontrados === melhor?.encontrados).at(-1);

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Text style={s.titulo}>Onde comprar</Text>
        <Text style={s.subtitulo}>
          {pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'} · {resultados.length} {resultados.length === 1 ? 'mercado' : 'mercados'} com preço registrado
        </Text>

        {pendentes.length === 0 && <Aviso tipo="info">Adicione itens na lista para comparar.</Aviso>}
        {pendentes.length > 0 && resultados.length === 0 && (
          <Aviso>Ainda não há preços. Escaneie notas fiscais na aba Nota fiscal ou cadastre ofertas na aba Promoções.</Aviso>
        )}

        {melhor && pendentes.length > 0 && (
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

        {resultados.length > 0 && pendentes.length > 0 && (
          <Secao titulo="Menor preço por item">
            <Cartao>
              {porItem.map(({ item, ofertas }) => (
                <View key={item.id} style={[s.linha, { alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.textoItem, { fontWeight: '600' }]}>{item.nome}</Text>
                    {ofertas.length === 0 ? (
                      <Text style={[s.detalhe, { color: cores.alertaTexto }]}>Sem preço em nenhum mercado. Use o botão Preço na lista.</Text>
                    ) : (
                      <>
                        <Text style={[s.detalhe, { color: cores.verdeEscuro, fontWeight: '600' }]}>
                          Mais barato: {ofertas[0].mercado}
                          {ofertas[0].preco.origem === 'menorpreco' ? ' (Menor Preço)' : ofertas[0].preco.origem === 'oferta' ? ' (oferta)' : ''}
                        </Text>
                        {ofertas.slice(1).map((o) => (
                          <Text key={o.mercado} style={s.detalhe}>
                            {o.mercado}: {reais(o.preco.preco)} (+{reais(o.preco.preco - ofertas[0].preco.preco)})
                          </Text>
                        ))}
                      </>
                    )}
                  </View>
                  {ofertas.length > 0 && <Text style={{ fontWeight: '700', fontSize: 15, color: cores.verde }}>{reais(ofertas[0].preco.preco)}</Text>}
                </View>
              ))}
            </Cartao>
          </Secao>
        )}

        {resultados.length > 0 && pendentes.length > 0 && (
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
                        <Text key={i.id} style={s.detalhe}>
                          {i.nome}: {reais(r.precos[i.id].preco)}
                          {r.precos[i.id].origem === 'menorpreco' ? ' (anotado do Menor Preço)' : r.precos[i.id].origem === 'oferta' ? ' (oferta)' : ` (nota de ${dataCurta(r.precos[i.id].data)})`}
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
      </ScrollView>
    </SafeAreaView>
  );
}
