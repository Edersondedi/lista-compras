import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fatia, chaveMes, nomeMes, resumoGastos, situacaoOrcamento, totaisPorMes, ultimosMeses } from '../lib/gastos';
import { numeroOuNulo, reais } from '../lib/logic';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Secao, cores, s } from '../ui';

function Barras({ fatias, total, cor = cores.verde }: { fatias: Fatia[]; total: number; cor?: string }) {
  const max = Math.max(...fatias.map((f) => f.valor), 1);
  return (
    <View style={{ gap: 10 }}>
      {fatias.map((f) => (
        <View key={f.nome} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 14, color: cores.texto }} numberOfLines={1}>
              {f.nome}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: cores.texto }}>
              {reais(f.valor)}
              <Text style={{ fontWeight: '400', color: cores.secundario }}> · {total > 0 ? Math.round((f.valor / total) * 100) : 0}%</Text>
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: cores.verdeClaro, borderRadius: 4 }}>
            <View style={{ width: `${(f.valor / max) * 100}%`, height: 8, backgroundColor: cor, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TelaGastos() {
  const { notas, lista, frequencia, orcamento, definirOrcamento } = useLoja();
  const hoje = new Date();
  const meses = ultimosMeses(hoje, 6);
  const [mes, setMes] = useState(chaveMes(`${meses[meses.length - 1]}-01`));
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [meta, setMeta] = useState(orcamento ? String(orcamento).replace('.', ',') : '');

  const r = useMemo(() => resumoGastos(notas, mes, lista, Object.values(frequencia)), [notas, mes, lista, frequencia]);
  const serie = useMemo(() => totaisPorMes(notas, meses), [notas, meses.join()]);
  const maxSerie = Math.max(...serie.map((x) => x.total), orcamento ?? 0, 1);
  const mesAtual = mes === meses[meses.length - 1];
  const sit = mesAtual ? situacaoOrcamento(r.total, orcamento, hoje) : null;

  function salvarMeta() {
    definirOrcamento(numeroOuNulo(meta));
    setEditandoMeta(false);
  }

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={s.titulo}>Gastos</Text>
        <Text style={s.subtitulo}>Somado a partir das notas fiscais lidas no app.</Text>

        {/* Gráfico dos últimos 6 meses (toque para escolher o mês) */}
        <Cartao style={{ padding: 14, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
            {serie.map((x) => {
              const ativo = x.mes === mes;
              return (
                <Pressable
                  key={x.mes}
                  onPress={() => setMes(x.mes)}
                  accessibilityRole="button"
                  accessibilityLabel={`${nomeMes(x.mes)}: ${reais(x.total)}`}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(3, (x.total / maxSerie) * 100),
                      backgroundColor: ativo ? cores.verde : '#B9D7C6',
                      borderRadius: 4,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {serie.map((x) => (
              <Text key={x.mes} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: x.mes === mes ? cores.verde : cores.secundario, fontWeight: x.mes === mes ? '700' : '400' }}>
                {nomeMes(x.mes)}
              </Text>
            ))}
          </View>
        </Cartao>

        <Cartao style={{ padding: 16, marginTop: 12, gap: 4 }}>
          <Text style={s.detalhe}>
            Total de {nomeMes(mes)} · {r.compras} compra{r.compras === 1 ? '' : 's'}
          </Text>
          <Text style={{ fontSize: 30, fontWeight: '700', color: cores.texto }}>{reais(r.total)}</Text>

          {mesAtual && orcamento && sit && (
            <View style={{ gap: 6, marginTop: 8 }}>
              <View style={{ height: 10, backgroundColor: cores.verdeClaro, borderRadius: 5 }}>
                <View
                  style={{
                    width: `${Math.min(100, sit.usado * 100)}%`,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: sit.nivel === 'ok' ? cores.verde : sit.nivel === 'atencao' ? '#C77700' : cores.perigo,
                  }}
                />
              </View>
              <Text style={s.detalhe}>
                {Math.round(sit.usado * 100)}% da meta de {reais(orcamento)} ·{' '}
                {sit.restante >= 0 ? `faltam ${reais(sit.restante)}` : `passou ${reais(-sit.restante)}`}
              </Text>
              {sit.nivel !== 'ok' && (
                <Aviso>{sit.nivel === 'estourou' ? 'A meta do mês foi ultrapassada.' : 'Atenção: mais de 80% da meta do mês já foi usada.'}</Aviso>
              )}
              {sit.nivel === 'ok' && r.total > 0 && sit.projecao > orcamento && (
                <Aviso tipo="info">
                  No ritmo atual, o mês fecharia perto de {reais(sit.projecao)} (conta simples pelos dias do mês, não é previsão).
                </Aviso>
              )}
            </View>
          )}

          {editandoMeta ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
              <Campo rotulo="Meta mensal (R$)" value={meta} onChangeText={setMeta} keyboardType="decimal-pad" placeholder="Ex.: 1500" />
              <View style={{ width: 100 }}>
                <Botao titulo="Salvar" onPress={salvarMeta} />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setEditandoMeta(true)} accessibilityRole="button" style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, color: cores.verde, fontWeight: '600' }}>
                {orcamento ? `Meta do mês: ${reais(orcamento)} · alterar` : 'Definir uma meta de gasto mensal'}
              </Text>
            </Pressable>
          )}
        </Cartao>

        {r.compras === 0 ? (
          <Aviso tipo="info">
            Nenhuma nota fiscal em {nomeMes(mes)}. Os gastos aparecem aqui quando vocês leem as notas na aba Nota fiscal, ou ao
            finalizar uma compra no modo "No mercado".
          </Aviso>
        ) : (
          <>
            <Secao titulo="Por mercado">
              <Cartao style={{ padding: 14 }}>
                <Barras fatias={r.porMercado} total={r.total} />
              </Cartao>
            </Secao>
            <Secao titulo="Por categoria">
              <Cartao style={{ padding: 14, gap: 10 }}>
                <Barras fatias={r.porCategoria} total={r.total} cor={cores.azulTexto} />
                <Text style={{ fontSize: 11, color: cores.secundario }}>
                  Categoria estimada pelo nome do produto na nota. Itens não reconhecidos ficam em "Outros".
                </Text>
              </Cartao>
            </Secao>
            <Secao titulo="Onde foi mais dinheiro">
              <Cartao style={{ padding: 14, gap: 8 }}>
                {r.maioresItens.map((i) => (
                  <View key={i.nome} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 14, color: cores.texto }} numberOfLines={1}>
                      {i.nome}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: cores.texto }}>{reais(i.valor)}</Text>
                  </View>
                ))}
              </Cartao>
            </Secao>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
