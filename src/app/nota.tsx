import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { confirmar } from '../confirmar';
import { casa, dataBr, lerDataBr, mercadosConhecidos, numeroOuNulo, qtdItens, reais } from '../lib/logic';
import { CupomLido, lerCupom } from '../lib/cupom';
import { ordenarNotas } from '../lib/codigoLista';
import { RevisarCupom } from '../RevisarCupom';
import { ConferirCompras } from '../ConferirCompras';
import { escolherFoto, lerFoto, ocrDisponivel } from '../ocr';
import { buscarNfce, lerTextoNfce, NotaLida, pareceQrNfce, SEM_NOME } from '../lib/nfce';
import { ItemNota } from '../lib/types';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Chip, Secao, cores, s } from '../ui';

type Modo = 'inicio' | 'camera' | 'lendo' | 'manual' | 'foto' | 'revisar';

export default function TelaNota() {
  const { notas, lista, ofertas, clubes, salvarNota, removerNota, editarNota, alternarComprado, salvarRegistro } = useLoja();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [modo, setModo] = useState<Modo>('inicio');
  const [msg, setMsg] = useState<string | null>(null);
  const travado = useRef(false);
  const [link, setLink] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [dataEdit, setDataEdit] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [cupom, setCupom] = useState<CupomLido | null>(null);
  const [dataManual, setDataManual] = useState(dataBr(new Date().toISOString()));
  const sugestoesMercado = [...new Set([...mercadosConhecidos(notas, ofertas), ...clubes, 'Cooper', 'Koch', 'Unidos', 'Fort'])].filter(
    (m) => m !== SEM_NOME,
  );

  function abrirEdicao(id: string, atual: string) {
    setEditando(id);
    setNomeEdit(atual === SEM_NOME ? '' : atual);
    const n = notas.find((x) => x.id === id);
    setDataEdit(n ? dataBr(n.data) : '');
  }

  async function lerPorFoto() {
    setMsg(null);
    const foto = await escolherFoto();
    if (!foto) return;
    setModo('foto');
    setProgresso(0);
    try {
      const r = await lerFoto(foto, setProgresso);
      setCupom(lerCupom(r.texto));
      setModo('revisar');
    } catch (e) {
      setModo('inicio');
      setMsg((e as Error).message || 'Não consegui ler a foto. Tente de novo.');
    }
  }

  function salvarRevisado(n: { mercado: string; data: string; itens: ItemNota[]; total: number }) {
    salvarNota({ ...n, origem: 'foto' });
    const marcados = marcarItensDaLista(n.itens);
    setCupom(null);
    setModo('inicio');
    const temRegistro = useLoja.getState().registros.length > 0;
    setMsg(
      `Compra de ${n.mercado} (${dataBr(n.data)}) salva: ${qtdItens(n.itens.length)}, ${reais(n.total)}. ${marcados ? `${qtdItens(marcados)} da lista marcado(s) como comprado.` : ''}` +
        (temRegistro ? ' Veja abaixo a conferência com o que você anotou no mercado.' : ''),
    );
  }

  // entrada manual
  const [mercado, setMercado] = useState('');
  const [itens, setItens] = useState<ItemNota[]>([]);
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');

  async function abrirCamera() {
    setMsg(null);
    if (!permissao?.granted) {
      const r = await pedirPermissao();
      if (!r.granted) {
        setMsg('Sem permissão de câmera. Libere nas configurações do celular ou use a digitação manual.');
        return;
      }
    }
    travado.current = false;
    setModo('camera');
  }

  function marcarItensDaLista(itensNota: ItemNota[]) {
    let marcados = 0;
    for (const i of lista) {
      if (!i.comprado && itensNota.some((n) => casa(i.nome, n.descricao))) {
        alternarComprado(i.id);
        marcados++;
      }
    }
    return marcados;
  }

  function salvarLida(lida: NotaLida, origem: 'qrcode' | 'manual', url?: string) {
    const nova = salvarNota({ mercado: lida.mercado, data: lida.data ?? new Date().toISOString(), itens: lida.itens, total: lida.total, origem, ...(url ? { url } : {}) });
    const marcados = marcarItensDaLista(lida.itens);
    setModo('inicio');
    if (lida.mercado === SEM_NOME) {
      abrirEdicao(nova.id, lida.mercado);
      setMsg(`Nota salva: ${qtdItens(lida.itens.length)}, ${reais(lida.total)}. Não consegui ler o nome do mercado: escolha ou digite abaixo, no histórico.`);
    } else {
      setMsg(`Nota de ${lida.mercado} salva: ${qtdItens(lida.itens.length)}, ${reais(lida.total)}. ${marcados === 0 ? 'Nenhum item da lista foi marcado como comprado' : `${qtdItens(marcados)} da lista ${marcados === 1 ? 'marcado' : 'marcados'} como comprado${marcados === 1 ? '' : 's'}`}.`);
    }
  }

  async function colarNota() {
    let texto = '';
    try {
      texto = await Clipboard.getStringAsync();
    } catch {
      setMsg('Não consegui ler a área de transferência. Toque e segure no campo abaixo e escolha Colar.');
      return;
    }
    if (!texto.trim()) {
      setMsg('A área de transferência está vazia. No Safari, abra a nota, toque e segure no texto > Selecionar Tudo > Copiar, e volte aqui.');
      return;
    }
    lerColado(texto);
  }

  function lerColado(conteudo?: string) {
    const texto = (conteudo ?? link).trim();
    if (!texto) return;
    if (pareceQrNfce(texto) && !texto.includes('\n')) {
      travado.current = false;
      aoLer(texto);
    } else {
      const lida = lerTextoNfce(texto);
      if (lida) salvarLida(lida, 'qrcode');
      else setMsg('Não encontrei itens nesse texto. Copie a página inteira da nota (Selecionar tudo > Copiar) e cole de novo.');
    }
    setLink('');
  }

  async function aoLer(conteudo: string) {
    if (travado.current) return;
    travado.current = true;
    conteudo = conteudo.trim();
    if (!pareceQrNfce(conteudo)) {
      setModo('inicio');
      setMsg(`O código lido não parece o QR Code de uma NFC-e. Conteúdo lido: "${conteudo.slice(0, 120)}"`);
      return;
    }
    setModo('lendo');
    try {
      const lida = await buscarNfce(conteudo);
      if (!lida) {
        setModo('manual');
        setMsg(`QR Code lido, mas não consegui extrair os itens da página da Sefaz (layout diferente do esperado). Me mande este link para eu ajustar: ${conteudo}`);
        return;
      }
      salvarLida(lida, 'qrcode', conteudo);
    } catch (e) {
      setModo('manual');
      if (Platform.OS === 'web') {
        setModo('inicio');
        setMsg(`O navegador não deixa o app abrir a página da Sefaz. Faça assim: abra o link abaixo no Safari, toque e segure no texto > Selecionar tudo > Copiar, e cole no campo "Cole o link ou o texto da nota". Link: ${conteudo}`);
      } else {
        setModo('manual');
        setMsg(`QR Code lido, mas não consegui abrir a página da nota (${(e as Error).message}). Cole o texto da página ou digite os itens. Link: ${conteudo}`);
      }
    }
  }

  function adicionarItemManual() {
    const v = numeroOuNulo(valor);
    if (!desc.trim() || v === null) return;
    setItens((xs) => [...xs, { descricao: desc.trim(), quantidade: 1, unidade: 'UN', valorUnitario: v, valorTotal: v }]);
    setDesc('');
    setValor('');
  }

  function salvarManual() {
    if (!mercado.trim() || itens.length === 0) return;
    const total = Math.round(itens.reduce((a, i) => a + i.valorTotal, 0) * 100) / 100;
    salvarNota({ mercado: mercado.trim(), data: lerDataBr(dataManual) ?? new Date().toISOString(), itens, total, origem: 'manual' });
    const marcados = marcarItensDaLista(itens);
    setMsg(`Compra em ${mercado.trim()} salva: ${qtdItens(itens.length)}, ${reais(total)}. ${qtdItens(marcados)} da lista marcado(s).`);
    setItens([]);
    setMercado('');
    setModo('inicio');
  }

  if (modo === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => aoLer(data)}
        />
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 10 }}>
          <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 15 }}>Aponte para o QR Code do cupom</Text>
          <Botao tipo="secundario" titulo="Cancelar" onPress={() => setModo('inicio')} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={s.titulo}>Nota fiscal</Text>
        <Text style={s.subtitulo}>Os preços pagos alimentam a comparação e as sugestões</Text>

        {modo === 'revisar' && cupom ? (
          <RevisarCupom cupom={cupom} aoSalvar={salvarRevisado} aoCancelar={() => { setCupom(null); setModo('inicio'); }} />
        ) : modo === 'foto' ? (
          <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={cores.verde} />
            <Text style={s.detalhe}>
              {progresso > 0 ? `Lendo o cupom… ${Math.round(progresso * 100)}%` : 'Preparando o leitor de fotos (na primeira vez demora um pouco)…'}
            </Text>
          </View>
        ) : modo === 'lendo' ? (
          <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={cores.verde} />
            <Text style={s.detalhe}>Lendo a nota no portal da Sefaz…</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 16 }}>
            {ocrDisponivel && (
              <>
                <Botao titulo="Ler cupom pela foto" onPress={lerPorFoto} />
                <Text style={[s.detalhe, { lineHeight: 17 }]}>
                  Tire a foto com o cupom esticado, bem iluminado e enchendo a tela. Cupom comprido: fotografe em partes e salve cada uma. Você confere tudo antes de salvar.
                </Text>
              </>
            )}
            <Botao tipo={ocrDisponivel ? 'secundario' : 'primario'} titulo="Colar nota copiada do Safari" onPress={colarNota} />
            <Text style={[s.detalhe, { lineHeight: 17 }]}>
              Como copiar: aponte a câmera do iPhone para o QR Code do cupom e abra o link. Na página da nota, toque e segure no texto, escolha Selecionar Tudo e depois Copiar.
            </Text>
            <Botao tipo="secundario" titulo="Escanear QR Code da nota" onPress={abrirCamera} />
            {modo !== 'manual' && <Botao tipo="secundario" titulo="Digitar compra manualmente" onPress={() => setModo('manual')} />}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <Campo rotulo="Cole o link ou o texto da nota" value={link} onChangeText={setLink} placeholder="Link do QR Code ou texto copiado da página da nota" autoCapitalize="none" autoCorrect={false} multiline style={{ maxHeight: 120, paddingTop: 10 }} />
              <View style={{ width: 90 }}>
                <Botao
                  tipo="secundario"
                  titulo="Ler"
                  desabilitado={!link.trim()}
                  onPress={() => lerColado()}
                />
              </View>
            </View>
          </View>
        )}

        {msg && <Aviso>{msg}</Aviso>}

        {modo === 'manual' && (
          <Secao titulo="Compra digitada">
            <Cartao style={{ padding: 14, gap: 10 }}>
              <Campo rotulo="Mercado" value={mercado} onChangeText={setMercado} placeholder="Nome do mercado" />
              <Campo rotulo="Data da compra (dd/mm/aaaa)" value={dataManual} onChangeText={setDataManual} placeholder="27/11/2026" keyboardType="numbers-and-punctuation" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Campo rotulo="Produto" value={desc} onChangeText={setDesc} placeholder="Arroz tipo 1 5 kg" />
                <View style={{ width: 100 }}>
                  <Campo rotulo="Preço (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="26,90" onSubmitEditing={adicionarItemManual} />
                </View>
              </View>
              <Botao tipo="secundario" titulo="Adicionar produto" onPress={adicionarItemManual} desabilitado={!desc.trim() || numeroOuNulo(valor) === null} />
              {itens.map((i, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.textoItem}>{i.descricao}</Text>
                  <Text style={{ fontWeight: '600' }}>{reais(i.valorTotal)}</Text>
                </View>
              ))}
              <Botao titulo="Salvar compra" onPress={salvarManual} desabilitado={!mercado.trim() || itens.length === 0 || !lerDataBr(dataManual)} />
            </Cartao>
          </Secao>
        )}

        {modo !== 'revisar' && <ConferirCompras />}

        {notas.length > 0 && (
          <Secao titulo={`Histórico (${notas.length} ${notas.length === 1 ? "compra" : "compras"})`}>
            <Cartao>
              {ordenarNotas(notas).map((n) => editando === n.id ? (
                <View key={n.id} style={[s.linha, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                  <Campo rotulo={`Mercado desta compra (${qtdItens(n.itens.length)}, ${reais(n.total)})`} value={nomeEdit} onChangeText={setNomeEdit} placeholder="Ex.: Koch" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {sugestoesMercado.map((m) => (
                      <Chip key={m} texto={m} ativo={m === nomeEdit} onPress={() => setNomeEdit(m)} />
                    ))}
                  </View>
                  <Campo rotulo="Data da compra (dd/mm/aaaa)" value={dataEdit} onChangeText={setDataEdit} placeholder="27/11/2026" keyboardType="numbers-and-punctuation" />
                  {!lerDataBr(dataEdit) && <Text style={{ fontSize: 12, color: cores.perigo }}>Data inválida. Use o formato 27/11/2026.</Text>}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><Botao tipo="secundario" titulo="Cancelar" onPress={() => setEditando(null)} /></View>
                    <View style={{ flex: 1 }}>
                      <Botao titulo="Salvar" desabilitado={!nomeEdit.trim() || !lerDataBr(dataEdit)} onPress={() => { editarNota(n.id, { mercado: nomeEdit, data: lerDataBr(dataEdit) ?? undefined }); setEditando(null); setMsg(null); }} />
                    </View>
                  </View>
                </View>
              ) : (
                <View key={n.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: aberta === n.id }}
                    accessibilityHint="Toque para ver os produtos; segure para excluir"
                    onPress={() => setAberta(aberta === n.id ? null : n.id)}
                    onLongPress={() =>
                      confirmar('Excluir compra', `Apagar a compra de ${n.mercado}? Os preços dela saem da comparação.`, 'Excluir', () => removerNota(n.id))
                    }
                    style={[s.linha, aberta === n.id && { backgroundColor: cores.verdeClaro, borderBottomWidth: 0 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.textoItem, n.mercado === SEM_NOME && { color: cores.alertaTexto }]}>{n.mercado}</Text>
                      <Text style={s.detalhe}>
                        {dataBr(n.data)} · {qtdItens(n.itens.length)} · {n.origem === 'qrcode' ? 'QR Code' : n.origem === 'foto' ? 'foto' : 'digitada'}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700' }}>{reais(n.total)}</Text>
                    <Ionicons name={aberta === n.id ? 'chevron-up' : 'chevron-down'} size={18} color={cores.secundario} />
                  </Pressable>
                  {aberta === n.id && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8, backgroundColor: cores.verdeClaro, borderBottomWidth: 1, borderBottomColor: '#EEF1EF' }}>
                      <Text style={s.detalhe}>
                        Compra de {new Date(n.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={{ backgroundColor: cores.cartao, borderRadius: 10, paddingVertical: 4 }}>
                        {n.itens.map((it, k) => (
                          <View
                            key={k}
                            style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: k === n.itens.length - 1 ? 0 : 1, borderBottomColor: '#EEF1EF' }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, color: cores.texto }}>{it.descricao}</Text>
                              <Text style={s.detalhe}>
                                {String(it.quantidade).replace('.', ',')} {it.unidade.toLowerCase()} × {reais(it.valorUnitario)}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: cores.texto }}>{reais(it.valorTotal)}</Text>
                          </View>
                        ))}
                        {n.itens.length === 0 && <Text style={[s.detalhe, { padding: 12 }]}>Esta compra não tem produtos registrados.</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, color: cores.texto }}>Total</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: cores.texto }}>{reais(n.total)}</Text>
                      </View>
                      {Math.abs(n.itens.reduce((a, i) => a + i.valorTotal, 0) - n.total) > 0.05 && (
                        <Text style={s.detalhe}>
                          Soma dos produtos: {reais(Math.round(n.itens.reduce((a, i) => a + i.valorTotal, 0) * 100) / 100)} (a diferença costuma ser desconto ou
                          acréscimo do cupom)
                        </Text>
                      )}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Botao tipo="secundario" titulo="Corrigir mercado e data" onPress={() => abrirEdicao(n.id, n.mercado)} />
                        </View>
                        <View style={{ width: 110 }}>
                          <Botao
                            tipo="secundario"
                            titulo="Excluir"
                            onPress={() =>
                              confirmar('Excluir compra', `Apagar a compra de ${n.mercado}? Os preços dela saem da comparação.`, 'Excluir', () => removerNota(n.id))
                            }
                          />
                        </View>
                      </View>
                      {n.origem === 'manual' && (
                        <View style={{ gap: 6 }}>
                          <Botao
                            titulo="Usar como preços anotados e conferir com a nota fiscal"
                            onPress={() =>
                              confirmar(
                                'Conferir com a nota fiscal',
                                `Os preços desta compra digitada (${reais(n.total)}) passam para "Conferir com o que você anotou no mercado" e ela sai do histórico e de Gastos, para a compra não contar duas vezes quando a nota fiscal for lida.`,
                                'Conferir',
                                () => {
                                  salvarRegistro({
                                    mercado: n.mercado,
                                    data: n.data,
                                    itens: n.itens.map((i) => ({ nome: i.descricao, quantidade: String(i.quantidade), preco: i.valorTotal })),
                                    total: n.total,
                                    semPreco: [],
                                  });
                                  removerNota(n.id);
                                  setAberta(null);
                                  setMsg('Pronto: a conferência aparece logo abaixo. Se a nota fiscal ainda não foi lida, leia o cupom agora.');
                                },
                              )
                            }
                          />
                          <Text style={[s.detalhe, { textAlign: 'center' }]}>Esta compra foi digitada (ou finalizada na aba Mercado).</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </Cartao>
            <Text style={[s.detalhe, { textAlign: 'center' }]}>Toque numa compra para ver tudo o que foi comprado</Text>
          </Secao>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
