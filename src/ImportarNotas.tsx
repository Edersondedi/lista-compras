import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { separarNovos } from './lib/compartilhar';
import { categoriaDoProduto } from './lib/gastos';
import { ItemImportado, itensDoPrint, itensDoTexto } from './lib/importarNotas';
import { qtdItens } from './lib/logic';
import { escolherFoto, lerPrintNotas, ocrDisponivel } from './ocr';
import { useLoja } from './store';
import { Aviso, Botao, Cartao, cores, s } from './ui';

type Linha = ItemImportado & { escolhido: boolean };

/** Importa itens de uma lista do app Notas: pelo print (só os marcados) ou colando o texto. */
export function ImportarNotas({ aoFechar }: { aoFechar: () => void }) {
  const { lista, frequencia, receberItens } = useLoja();
  const [lendo, setLendo] = useState<number | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [origem, setOrigem] = useState<'print' | 'texto'>('print');
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState('');
  const [verNaoMarcados, setVerNaoMarcados] = useState(false);

  async function lerPrint() {
    setMsg('');
    const foto = await escolherFoto(false);
    if (!foto) return;
    setLendo(0);
    try {
      const itens = itensDoPrint(await lerPrintNotas(foto, setLendo));
      setOrigem('print');
      setLinhas(itens.map((i) => ({ ...i, escolhido: i.marcado })));
      if (!itens.length) setMsg('Não achei itens nesse print. Confira se é um print da lista no app Notas.');
    } catch (e) {
      setMsg((e as Error).message || 'Não consegui ler o print.');
    } finally {
      setLendo(null);
    }
  }

  function lerTexto(t: string) {
    const itens = itensDoTexto(t);
    const algumMarcado = itens.some((i) => i.marcado);
    setOrigem('texto');
    setLinhas(itens.map((i) => ({ ...i, escolhido: algumMarcado ? i.marcado : true })));
    setMsg(
      itens.length
        ? algumMarcado
          ? ''
          : 'O texto copiado do Notas não diz quais itens estavam marcados. Desmarque aqui o que não quer importar, ou use o print.'
        : 'Não encontrei itens nesse texto.',
    );
  }

  function adicionar() {
    if (!linhas) return;
    const escolhidos = linhas
      .filter((l) => l.escolhido && l.nome.trim())
      .map((l) => ({ nome: l.nome.trim(), quantidade: l.quantidade, categoria: categoriaDoProduto(l.nome, lista, Object.values(frequencia)) }));
    const { novos, repetidos } = separarNovos(escolhidos, lista);
    receberItens(novos);
    setLinhas(null);
    setMsg(
      `${qtdItens(novos.length)} adicionado${novos.length === 1 ? '' : 's'} à lista.` +
        (repetidos.length ? ` ${repetidos.length} já estava${repetidos.length === 1 ? '' : 'm'} na lista.` : ''),
    );
  }

  const marcados = linhas?.filter((l) => l.marcado) ?? [];
  const naoMarcados = linhas?.filter((l) => !l.marcado) ?? [];
  const mostrar = origem === 'print' ? [...marcados, ...(verNaoMarcados ? naoMarcados : [])] : (linhas ?? []);
  const nEscolhidos = linhas?.filter((l) => l.escolhido).length ?? 0;

  const alternar = (l: Linha) => setLinhas((linhas ?? []).map((x) => (x === l ? { ...x, escolhido: !x.escolhido } : x)));
  const renomear = (l: Linha, nome: string) => setLinhas((linhas ?? []).map((x) => (x === l ? { ...x, nome } : x)));

  return (
    <Cartao style={{ padding: 14, gap: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: cores.texto }}>Importar do app Notas</Text>

      {lendo !== null ? (
        <View style={{ alignItems: 'center', gap: 8, padding: 16 }}>
          <ActivityIndicator color={cores.verde} />
          <Text style={s.detalhe}>{lendo > 0 ? `Lendo o print… ${Math.round(lendo * 100)}%` : 'Preparando o leitor (na primeira vez demora um pouco)…'}</Text>
        </View>
      ) : linhas && linhas.length > 0 ? (
        <>
          <Text style={s.detalhe}>
            {origem === 'print'
              ? `${qtdItens(marcados.length)} marcado${marcados.length === 1 ? '' : 's'} no Notas. Confira os nomes antes de adicionar.`
              : 'Escolha os itens e confira os nomes.'}
          </Text>
          {mostrar.map((l, k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: l.escolhido }}
                accessibilityLabel={l.nome}
                onPress={() => alternar(l)}
                style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: cores.verde,
                    backgroundColor: l.escolhido ? cores.verde : 'transparent',
                  }}
                />
              </Pressable>
              <TextInput value={l.nome} onChangeText={(v) => renomear(l, v)} style={[s.campo, { flex: 1, fontSize: 14 }]} accessibilityLabel={`Nome do item ${k + 1}`} />
              {!!l.quantidade && <Text style={[s.detalhe, { width: 48, textAlign: 'right' }]}>{l.quantidade}</Text>}
            </View>
          ))}
          {origem === 'print' && naoMarcados.length > 0 && (
            <Pressable onPress={() => setVerNaoMarcados(!verNaoMarcados)} accessibilityRole="button" style={{ minHeight: 36, justifyContent: 'center' }}>
              <Text style={{ color: cores.verde, fontWeight: '600', fontSize: 13 }}>
                {verNaoMarcados ? 'Esconder os não marcados' : `Ver também os ${naoMarcados.length} não marcados`}
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Botao tipo="secundario" titulo="Cancelar" onPress={() => setLinhas(null)} />
            </View>
            <View style={{ flex: 1.4 }}>
              <Botao titulo={`Adicionar ${qtdItens(nEscolhidos)}`} onPress={adicionar} desabilitado={nEscolhidos === 0} />
            </View>
          </View>
        </>
      ) : (
        <>
          {ocrDisponivel && (
            <>
              <Text style={[s.detalhe, { lineHeight: 17 }]}>
                Tire um print da lista no Notas e escolha o print aqui. Só os itens com o círculo marcado entram. Lista comprida: tire mais de um print e importe um
                de cada vez.
              </Text>
              <Botao titulo="Escolher print do Notas" onPress={lerPrint} />
            </>
          )}
          <Text style={[s.detalhe, { marginTop: 4 }]}>Ou copie o texto da nota e cole aqui:</Text>
          <Botao
            tipo="secundario"
            titulo="Colar texto copiado"
            onPress={async () => {
              const t = await Clipboard.getStringAsync();
              setTexto(t);
              lerTexto(t);
            }}
          />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            multiline
            placeholder="Ou cole aqui"
            accessibilityLabel="Texto da nota"
            style={[s.campo, { minHeight: 60 }]}
          />
          {!!texto.trim() && <Botao tipo="secundario" titulo="Ler texto" onPress={() => lerTexto(texto)} />}
          <Botao tipo="secundario" titulo="Fechar" onPress={aoFechar} />
        </>
      )}
      {!!msg && <Aviso tipo="info">{msg}</Aviso>}
    </Cartao>
  );
}
