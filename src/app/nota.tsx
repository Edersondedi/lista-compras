import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { confirmar } from '../confirmar';
import { casa, numeroOuNulo, reais } from '../lib/logic';
import { buscarNfce, lerTextoNfce, NotaLida, pareceQrNfce } from '../lib/nfce';
import { ItemNota } from '../lib/types';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Secao, cores, s } from '../ui';

type Modo = 'inicio' | 'camera' | 'lendo' | 'manual';

export default function TelaNota() {
  const { notas, lista, salvarNota, removerNota, alternarComprado } = useLoja();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [modo, setModo] = useState<Modo>('inicio');
  const [msg, setMsg] = useState<string | null>(null);
  const travado = useRef(false);
  const [link, setLink] = useState('');

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
    salvarNota({ mercado: lida.mercado, data: lida.data ?? new Date().toISOString(), itens: lida.itens, total: lida.total, origem, ...(url ? { url } : {}) });
    const marcados = marcarItensDaLista(lida.itens);
    setModo('inicio');
    setMsg(`Nota de ${lida.mercado} salva: ${lida.itens.length} itens, ${reais(lida.total)}. ${marcados} itens da lista marcados como comprados.`);
  }

  function lerColado() {
    const texto = link.trim();
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
    salvarNota({ mercado: mercado.trim(), data: new Date().toISOString(), itens, total, origem: 'manual' });
    const marcados = marcarItensDaLista(itens);
    setMsg(`Compra em ${mercado.trim()} salva: ${itens.length} itens, ${reais(total)}. ${marcados} itens da lista marcados.`);
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

        {modo === 'lendo' ? (
          <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={cores.verde} />
            <Text style={s.detalhe}>Lendo a nota no portal da Sefaz…</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 16 }}>
            <Botao titulo="Escanear QR Code da nota" onPress={abrirCamera} />
            {modo !== 'manual' && <Botao tipo="secundario" titulo="Digitar compra manualmente" onPress={() => setModo('manual')} />}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <Campo rotulo="Cole o link ou o texto da nota" value={link} onChangeText={setLink} placeholder="Link do QR Code ou texto copiado da página da nota" autoCapitalize="none" autoCorrect={false} multiline style={{ maxHeight: 120, paddingTop: 10 }} />
              <View style={{ width: 90 }}>
                <Botao
                  tipo="secundario"
                  titulo="Ler"
                  desabilitado={!link.trim()}
                  onPress={lerColado}
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
              <Botao titulo="Salvar compra" onPress={salvarManual} desabilitado={!mercado.trim() || itens.length === 0} />
            </Cartao>
          </Secao>
        )}

        {notas.length > 0 && (
          <Secao titulo={`Histórico (${notas.length} ${notas.length === 1 ? "compra" : "compras"})`}>
            <Cartao>
              {notas.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onLongPress={() =>
                    confirmar('Excluir compra', `Apagar a compra de ${n.mercado}? Os preços dela saem da comparação.`, 'Excluir', () => removerNota(n.id))
                  }
                  style={s.linha}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.textoItem}>{n.mercado}</Text>
                    <Text style={s.detalhe}>
                      {n.data.slice(8, 10)}/{n.data.slice(5, 7)} · {n.itens.length} itens · {n.origem === 'qrcode' ? 'QR Code' : 'digitada'}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: '700' }}>{reais(n.total)}</Text>
                </Pressable>
              ))}
            </Cartao>
            <Text style={[s.detalhe, { textAlign: 'center' }]}>Segure uma compra para excluir</Text>
          </Secao>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
