import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { confirmar } from './confirmar';
import { compararCompra, notaProvavel } from './lib/conferencia';
import { dataBr, qtdItens, reais } from './lib/logic';
import { NotaFiscal, RegistroMercado } from './lib/types';
import { useLoja } from './store';
import { Botao, Cartao, Chip, Secao, cores, s } from './ui';

const VERMELHO = cores.perigo;
const LARANJA = '#B26A00';

function Detalhe({ registro, nota }: { registro: RegistroMercado; nota: NotaFiscal }) {
  const c = useMemo(() => compararCompra(registro, nota), [registro, nota]);
  const difCor = c.diferencaTotal > 0.009 ? VERMELHO : c.diferencaTotal < -0.009 ? cores.verde : cores.texto;
  const naoAchados = c.linhas.filter((l) => l.cobrado === null);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          ['Anotado no mercado', reais(c.totalAnotado), cores.texto],
          ['Total da nota', reais(c.totalNota), cores.texto],
          ['Diferença', `${c.diferencaTotal > 0 ? '+' : ''}${reais(c.diferencaTotal)}`, difCor],
        ].map(([rot, val, cor]) => (
          <View key={rot} style={{ flex: 1, backgroundColor: cores.cartao, borderRadius: 8, borderWidth: 1, borderColor: cores.borda, padding: 8 }}>
            <Text style={{ fontSize: 11, color: cores.secundario }}>{rot}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: cor }}>{val}</Text>
          </View>
        ))}
      </View>

      {c.cobradoAMais > 0 && (
        <View style={{ backgroundColor: '#FDECEA', borderRadius: 8, padding: 10 }}>
          <Text style={{ color: VERMELHO, fontWeight: '700' }}>
            Cobrado {reais(c.cobradoAMais)} a mais do que você anotou em {c.linhas.filter((l) => (l.diferenca ?? 0) > 0).length} item(ns).
          </Text>
          <Text style={{ fontSize: 12, color: VERMELHO }}>Confira se o preço da gôndola estava diferente do caixa.</Text>
        </View>
      )}
      {c.cobradoAMais === 0 && naoAchados.length === 0 && c.naoAnotados.length === 0 && (
        <View style={{ backgroundColor: cores.verdeClaro, borderRadius: 8, padding: 10 }}>
          <Text style={{ color: cores.verdeEscuro, fontWeight: '700' }}>Tudo bateu com o que você anotou.</Text>
        </View>
      )}

      <Text style={{ fontSize: 14, fontWeight: '700', color: cores.texto, marginTop: 4 }}>Item por item</Text>
      <View style={{ backgroundColor: cores.cartao, borderRadius: 10 }}>
        {c.linhas.map((l, k) => {
          const d = l.diferenca;
          const status =
            l.cobrado === null
              ? { txt: 'não achei na nota', cor: LARANJA }
              : Math.abs(d!) < 0.01
                ? { txt: 'bateu', cor: cores.verde }
                : d! > 0
                  ? { txt: `+${reais(d!)} a mais`, cor: VERMELHO }
                  : { txt: `${reais(-d!)} a menos`, cor: cores.verde };
          return (
            <View
              key={k}
              style={{ paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: k === c.linhas.length - 1 ? 0 : 1, borderBottomColor: '#EEF1EF', gap: 2 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 14, color: cores.texto, fontWeight: '600' }}>{l.nome}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: status.cor }}>{status.txt}</Text>
              </View>
              <Text style={s.detalhe}>
                Anotado {reais(l.anotado)}
                {l.cobrado !== null ? ` · na nota ${reais(l.cobrado)}` : ''}
              </Text>
              {l.descricoes.length > 0 && (
                <Text style={{ fontSize: 11, color: cores.secundario }} numberOfLines={1}>
                  {l.descricoes.length > 1 ? `${l.descricoes.length}× ` : ''}
                  {l.descricoes[0]}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {c.naoAnotados.length > 0 && (
        <>
          <Text style={{ fontSize: 14, fontWeight: '700', color: cores.texto, marginTop: 4 }}>Na nota, mas você não anotou preço</Text>
          <View style={{ backgroundColor: cores.cartao, borderRadius: 10 }}>
            {c.naoAnotados.map((i, k) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 13, color: cores.texto }}>{i.descricao}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: cores.texto }}>{reais(i.valorTotal)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {registro.semPreco.length > 0 && (
        <Text style={s.detalhe}>Pegos no mercado sem preço digitado: {registro.semPreco.join(', ')}.</Text>
      )}
      <Text style={{ fontSize: 11, color: cores.secundario, lineHeight: 15 }}>
        Os itens são ligados pelo nome ("Café" encontra "CAFE PILAO 500G"). "Não achei na nota" pode ser item não cobrado, nome muito diferente no cupom ou
        produto que a leitura por foto não pegou.
      </Text>
    </View>
  );
}

/** Na aba Nota fiscal: compara o que foi anotado na aba Mercado com a nota da mesma compra. */
export function ConferirCompras() {
  const { registros, notas, removerRegistro } = useLoja();
  const [aberto, setAberto] = useState<string | null>(null);
  const [escolhida, setEscolhida] = useState<Record<string, string>>({});

  if (!registros.length) return null;

  return (
    <Secao titulo="Conferir com o que você anotou no mercado">
      <Cartao>
        {registros.map((r, k) => {
          const nota = notas.find((n) => n.id === escolhida[r.id]) ?? notaProvavel(r, notas);
          const dif = nota ? Math.round((nota.total - r.total) * 100) / 100 : null;
          const ativo = aberto === r.id;
          const recentes = [...notas].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 8);
          return (
            <View key={r.id} style={{ borderBottomWidth: k === registros.length - 1 ? 0 : 1, borderBottomColor: '#EEF1EF' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: ativo }}
                onPress={() => setAberto(ativo ? null : r.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.textoItem}>
                    {r.mercado} · {dataBr(r.data)}
                  </Text>
                  <Text style={s.detalhe}>
                    Anotado {reais(r.total)} em {qtdItens(r.itens.length)}
                    {nota ? ` · nota ${reais(nota.total)}` : ' · ainda sem nota'}
                  </Text>
                </View>
                {dif !== null && (
                  <Text style={{ fontWeight: '700', color: dif > 0.009 ? VERMELHO : dif < -0.009 ? cores.verde : cores.texto }}>
                    {dif > 0 ? '+' : ''}
                    {reais(dif)}
                  </Text>
                )}
                <Ionicons name={ativo ? 'chevron-up' : 'chevron-down'} size={18} color={cores.secundario} />
              </Pressable>
              {ativo && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, backgroundColor: cores.verdeClaro, paddingTop: 10 }}>
                  {nota ? (
                    <Detalhe registro={r} nota={nota} />
                  ) : (
                    <Text style={s.detalhe}>
                      Ainda não achei a nota desta compra (mesmo mercado, até 2 dias). Leia o cupom aqui embaixo ou escolha a nota:
                    </Text>
                  )}
                  {recentes.length > 0 && (
                    <>
                      <Text style={s.detalhe}>{nota ? 'Não é esta nota? Escolha outra:' : 'Notas recentes:'}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {recentes.map((n) => (
                          <Chip
                            key={n.id}
                            texto={`${n.mercado} ${dataBr(n.data).slice(0, 5)} · ${reais(n.total)}`}
                            ativo={nota?.id === n.id}
                            onPress={() => setEscolhida({ ...escolhida, [r.id]: n.id })}
                          />
                        ))}
                      </View>
                    </>
                  )}
                  <Botao
                    tipo="secundario"
                    titulo="Apagar este registro"
                    onPress={() => confirmar('Apagar registro', `Apagar o que foi anotado no ${r.mercado} em ${dataBr(r.data)}? A nota fiscal não é apagada.`, 'Apagar', () => removerRegistro(r.id))}
                  />
                </View>
              )}
            </View>
          );
        })}
      </Cartao>
    </Secao>
  );
}
